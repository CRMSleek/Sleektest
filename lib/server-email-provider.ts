import "server-only"

import { ImapFlow } from "imapflow"
import nodemailer from "nodemailer"
import { getEffectiveEmailCredentials } from "@/lib/email-settings"
import type { NextRequest } from "next/server"

export type EmailRecipient = string | { email?: string; name?: string }

export type SendEmailInput = {
  to: EmailRecipient[]
  cc?: EmailRecipient[]
  bcc?: EmailRecipient[]
  subject: string
  text?: string
  html?: string
  attachments?: Array<{ filename: string; content: Buffer }>
  replyToMessageId?: string | null
}

function safeText(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : ""
}

function domainOf(email: string) {
  return email.split("@")[1]?.toLowerCase() || ""
}

function normalizeRecipients(recipients?: EmailRecipient[]) {
  return Array.from(
    new Set(
      (recipients || [])
        .map((recipient) => (typeof recipient === "string" ? recipient : recipient.email || ""))
        .map((email) => safeText(email).toLowerCase())
        .filter(Boolean),
    ),
  )
}

export function smtpConfigFromCredentials(credentials: Awaited<ReturnType<typeof getEffectiveEmailCredentials>>) {
  if (!credentials) return null
  if (credentials.smtp?.host && credentials.smtp?.port != null) {
    return {
      host: credentials.smtp.host,
      port: credentials.smtp.port,
      secure: credentials.smtp.secure ?? false,
      auth: { user: credentials.email, pass: credentials.password },
    }
  }

  const domain = domainOf(credentials.email)
  if (domain === "gmail.com") return { host: "smtp.gmail.com", port: 587, secure: false, auth: { user: credentials.email, pass: credentials.password } }
  if (["outlook.com", "hotmail.com", "live.com"].includes(domain) || domain.endsWith("office365.com")) {
    return { host: "smtp-mail.outlook.com", port: 587, secure: false, auth: { user: credentials.email, pass: credentials.password } }
  }
  if (["yahoo.com", "ymail.com"].includes(domain)) return { host: "smtp.mail.yahoo.com", port: 587, secure: false, auth: { user: credentials.email, pass: credentials.password } }
  return { host: "smtp.gmail.com", port: 587, secure: false, auth: { user: credentials.email, pass: credentials.password } }
}

export function imapConfigFromCredentials(credentials: Awaited<ReturnType<typeof getEffectiveEmailCredentials>>) {
  if (!credentials) return null
  if (credentials.imap?.host && credentials.imap?.port) {
    return {
      host: credentials.imap.host,
      port: credentials.imap.port,
      secure: credentials.imap.secure ?? true,
      auth: { user: credentials.email, pass: credentials.password },
    }
  }

  const domain = domainOf(credentials.email)
  if (domain === "gmail.com") return { host: "imap.gmail.com", port: 993, secure: true, auth: { user: credentials.email, pass: credentials.password } }
  if (["outlook.com", "hotmail.com", "live.com"].includes(domain) || domain.endsWith("office365.com")) {
    return { host: "outlook.office365.com", port: 993, secure: true, auth: { user: credentials.email, pass: credentials.password } }
  }
  if (["yahoo.com", "ymail.com"].includes(domain)) return { host: "imap.mail.yahoo.com", port: 993, secure: true, auth: { user: credentials.email, pass: credentials.password } }
  return {
    host: process.env.DEFAULT_IMAP_HOST || `imap.${domain}`,
    port: Number(process.env.DEFAULT_IMAP_PORT || 993),
    secure: true,
    auth: { user: credentials.email, pass: credentials.password },
  }
}

export async function getEmailProviderReadiness(request: NextRequest | Request) {
  const credentials = await getEffectiveEmailCredentials(request as NextRequest)
  return {
    ready: Boolean(credentials),
    from: credentials?.email || null,
    smtpReady: Boolean(smtpConfigFromCredentials(credentials)),
    imapReady: Boolean(imapConfigFromCredentials(credentials)),
    message: credentials
      ? "Email provider is configured for server-side send/fetch."
      : "Email is not configured. Add SMTP/IMAP settings before sending or fetching mail.",
  }
}

export async function sendEmailWithProvider(request: NextRequest | Request, input: SendEmailInput) {
  const credentials = await getEffectiveEmailCredentials(request as NextRequest)
  if (!credentials) {
    return { ok: false as const, error: "Email not configured. Set SMTP credentials in Settings before sending.", needsCredentials: true }
  }

  const to = normalizeRecipients(input.to)
  const cc = normalizeRecipients(input.cc)
  const bcc = normalizeRecipients(input.bcc)
  const subject = safeText(input.subject)
  const text = safeText(input.text)
  const html = safeText(input.html) || text.replace(/\n/g, "<br />")

  if (to.length === 0) return { ok: false as const, error: "At least one recipient is required." }
  if (!subject) return { ok: false as const, error: "Subject is required." }
  if (!text && !html) return { ok: false as const, error: "Email body is required." }

  try {
    const transporter = nodemailer.createTransport(smtpConfigFromCredentials(credentials)!)
    const mailOptions: any = {
      from: credentials.email,
      to,
      cc: cc.length ? cc : undefined,
      bcc: bcc.length ? bcc : undefined,
      subject,
      text,
      html,
      attachments: input.attachments?.length ? input.attachments : undefined,
    }

    if (input.replyToMessageId) {
      mailOptions.inReplyTo = `<${input.replyToMessageId}@sleekcrm>`
      mailOptions.references = `<${input.replyToMessageId}@sleekcrm>`
    }

    await transporter.sendMail(mailOptions)
    return { ok: true as const, message: `Email sent to ${to.length} recipient(s)`, recipients: to, from: credentials.email }
  } catch (error: any) {
    return {
      ok: false as const,
      error: error?.message
        ? `Email send failed: ${error.message}`
        : "Email send failed. Check SMTP host, port, username, and app password.",
      provider: credentials.email,
    }
  }
}

export async function createInboxClient(request: NextRequest) {
  const credentials = await getEffectiveEmailCredentials(request)
  if (!credentials) return { client: null, error: "Email not configured" }
  return { client: new ImapFlow(imapConfigFromCredentials(credentials)!), error: null }
}
