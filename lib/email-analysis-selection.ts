import { ImapFlow } from "imapflow"
import { simpleParser } from "mailparser"
import { nanoid } from "nanoid"
import { supabaseAdmin as supabase } from "@/lib/supabase/server"
import { createInboxClient } from "@/lib/server-email-provider"
import type { NextRequest } from "next/server"

type UserContext = {
  id: string
  business?: { id?: string | null } | null
}

export type InboxEmailForAnalysis = {
  id: string
  threadId?: string | null
  from?: string
  fromEmail?: string
  fromName?: string
  to?: string
  cc?: string
  bcc?: string
  subject?: string
  dateFull?: string
  contentText?: string
  html?: string
  content?: string
}

const CUSTOMER_INQUIRY_TERMS = [
  "question",
  "inquiry",
  "issue",
  "problem",
  "help",
  "support",
  "bug",
  "error",
  "broken",
  "pricing",
  "price",
  "cost",
  "billing",
  "invoice",
  "refund",
  "cancel",
  "cancellation",
  "renew",
  "upgrade",
  "downgrade",
  "demo",
  "trial",
  "feature",
  "request",
  "feedback",
  "complaint",
  "confused",
  "stuck",
  "slow",
  "does not work",
  "doesn't work",
  "cannot",
  "can't",
]

const NOISE_TERMS = [
  "unsubscribe",
  "newsletter",
  "no-reply",
  "noreply",
  "receipt",
  "security alert",
  "verification code",
  "password reset",
  "calendar",
  "invitation",
]

function safeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
}

export function classifyEmailForAnalysis(email: InboxEmailForAnalysis) {
  const from = `${safeText(email.fromEmail)} ${safeText(email.from)} ${safeText(email.fromName)}`.toLowerCase()
  const text = `${safeText(email.subject)} ${safeText(email.contentText)} ${safeText(email.content)}`.toLowerCase()
  const combined = `${from} ${text}`

  const noiseHits = NOISE_TERMS.filter((term) => combined.includes(term)).length
  const inquiryHits = CUSTOMER_INQUIRY_TERMS.filter((term) => combined.includes(term)).length
  const customerLikeSender = Boolean(email.fromEmail && !/(no-?reply|newsletter|notification|mailer|calendar)/i.test(email.fromEmail))
  const hasBody = safeText(email.contentText || email.content).length > 40
  const score = inquiryHits * 2 + (customerLikeSender ? 1 : 0) + (hasBody ? 1 : 0) - noiseHits * 3

  return {
    relevant: score >= 2,
    score,
    reason:
      inquiryHits > 0
        ? `Matched ${inquiryHits} customer inquiry signal(s)`
        : customerLikeSender && hasBody
          ? "Looks like customer-originated message with analyzable body"
          : "Not enough customer inquiry signal",
  }
}

export function normalizeEmailForSave(email: InboxEmailForAnalysis, userId: string) {
  const messageId = safeText(email.id) || `import-${nanoid()}`
  const date = email.dateFull ? new Date(email.dateFull) : new Date()
  return {
    user_id: userId,
    gmail_message_id: messageId,
    thread_id: email.threadId || null,
    sender_name: safeText(email.fromName) || null,
    sender_email: safeText(email.fromEmail || email.from),
    recipient_to: safeText(email.to) || null,
    recipient_cc: safeText(email.cc) || null,
    recipient_bcc: safeText(email.bcc) || null,
    subject: safeText(email.subject) || null,
    date: Number.isNaN(date.getTime()) ? new Date().toISOString() : date.toISOString(),
    content_text: safeText(email.contentText || email.content) || null,
    content_html: safeText(email.html) || safeText(email.content) || null,
  }
}

export async function saveEmailsForAnalysis(user: UserContext, emails: InboxEmailForAnalysis[]) {
  const normalized = emails
    .map((email) => normalizeEmailForSave(email, user.id))
    .filter((email) => email.sender_email || email.subject || email.content_text)

  if (normalized.length === 0) return { saved: [] as string[], skipped: 0, errors: [] as string[] }

  const messageIds = normalized.map((email) => email.gmail_message_id)
  const { data: existing } = await supabase
    .from("emails")
    .select("gmail_message_id")
    .eq("user_id", user.id)
    .in("gmail_message_id", messageIds)

  const existingIds = new Set((existing || []).map((email: any) => email.gmail_message_id))
  const toInsert = normalized.filter((email) => !existingIds.has(email.gmail_message_id))

  const result = { saved: [] as string[], skipped: normalized.length - toInsert.length, errors: [] as string[] }
  if (toInsert.length === 0) return result

  const { data: inserted, error } = await supabase
    .from("emails")
    .insert(toInsert)
    .select("gmail_message_id")

  if (error) {
    result.errors.push(error.message)
    return result
  }

  result.saved = (inserted || []).map((email: any) => email.gmail_message_id)
  await autoCreateCustomersFromEmails(user, toInsert)
  return result
}

async function autoCreateCustomersFromEmails(user: UserContext, emails: ReturnType<typeof normalizeEmailForSave>[]) {
  const businessId = user.business?.id
  if (!businessId || emails.length === 0) return

  for (const email of emails) {
    const senderEmail = safeText(email.sender_email).toLowerCase()
    if (!senderEmail || /(no-?reply|newsletter|notification|mailer|calendar)/i.test(senderEmail)) continue

    const senderName = safeText(email.sender_name) || senderEmail
    const { data: existing } = await supabase
      .from("customers")
      .select("id, name, data")
      .eq("business_id", businessId)
      .eq("email", senderEmail)
      .maybeSingle()

    let customerId = existing?.id as string | undefined
    if (customerId && existing) {
      const data = existing.data && typeof existing.data === "object" ? existing.data : {}
      await supabase
        .from("customers")
        .update({
          name: safeText(existing.name) || senderName,
          data: { ...data, last_saved_email_subject: email.subject, last_saved_email_at: email.date },
          updated_at: new Date().toISOString(),
        })
        .eq("business_id", businessId)
        .eq("id", customerId)
    } else {
      const { data: created } = await supabase
        .from("customers")
        .insert({
          business_id: businessId,
          name: senderName,
          email: senderEmail,
          relationship_type: "customer",
          data: {
            source: "saved_email",
            first_saved_email_subject: email.subject,
            first_saved_email_at: email.date,
          },
        })
        .select("id")
        .single()
      customerId = created?.id
    }

    if (!customerId) continue
    const { data: existingMapping } = await supabase
      .from("email_relationship_mappings")
      .select("id")
      .eq("user_id", user.id)
      .eq("email_id", email.gmail_message_id)
      .maybeSingle()

    if (!existingMapping) {
      await supabase.from("email_relationship_mappings").insert({
        id: nanoid(),
        user_id: user.id,
        email_id: email.gmail_message_id,
        relationship_id: customerId,
      })
    }
  }
}

export async function fetchRelevantInboxEmailsForAnalysis(request: NextRequest, maxResults = 50) {
  let client: ImapFlow | null = null
  let lock: Awaited<ReturnType<ImapFlow["getMailboxLock"]>> | null = null
  const { client: inboxClient, error } = await createInboxClient(request)
  if (!inboxClient) {
    return { emails: [] as InboxEmailForAnalysis[], classified: [] as Array<InboxEmailForAnalysis & { score: number; reason: string }>, error: "Email not configured" }
  }

  try {
    client = inboxClient
    await client.connect()
    lock = await client.getMailboxLock("INBOX")

    const total = client.mailbox ? client.mailbox.exists || 0 : 0
    if (!total) return { emails: [], classified: [] }

    const limit = Math.min(Math.max(maxResults, 1), 100)
    const startSeq = total > limit ? total - limit + 1 : 1
    const range = `${startSeq}:${total}`
    const metaMessages: any[] = []

    for await (const msg of client.fetch(range, { uid: true, envelope: true, internalDate: true, flags: true })) {
      metaMessages.push(msg)
    }

    const classified: Array<InboxEmailForAnalysis & { score: number; reason: string }> = []
    for (const msg of metaMessages.reverse()) {
      const { content } = await client.download(msg.seq)
      const parsed = await simpleParser(content)
      const fromAddress = parsed.from?.value?.[0]
      const dateObj = parsed.date || msg.internalDate || new Date()
      const email: InboxEmailForAnalysis = {
        id: String(msg.uid ?? msg.seq),
        threadId: null,
        from: fromAddress?.name || fromAddress?.address || "",
        fromEmail: fromAddress?.address || "",
        fromName: fromAddress?.name || "",
        to: parsed.to?.text || "",
        cc: parsed.cc?.text || "",
        bcc: parsed.bcc?.text || "",
        subject: parsed.subject || msg.envelope?.subject || "",
        dateFull: dateObj instanceof Date ? dateObj.toISOString() : new Date(dateObj as any).toISOString(),
        contentText: parsed.text || "",
        html: parsed.html || "",
        content: parsed.html || parsed.textAsHtml || parsed.text || "",
      }
      const classification = classifyEmailForAnalysis(email)
      if (classification.relevant) {
        classified.push({ ...email, score: classification.score, reason: classification.reason })
      }
    }

    return { emails: classified, classified }
  } catch (error: any) {
    console.error("Auto-select relevant emails failed:", error)
    return { emails: [] as InboxEmailForAnalysis[], classified: [] as Array<InboxEmailForAnalysis & { score: number; reason: string }>, error: error?.message || "Failed to fetch inbox" }
  } finally {
    try {
      if (lock) lock.release()
      if (client) await client.logout()
    } catch {
      // ignore cleanup errors
    }
  }
}
