import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createInboxClient, getEmailProviderReadiness } from "@/lib/server-email-provider"
import { simpleParser } from "mailparser"
import type { ImapFlow } from "imapflow"

export async function POST(request: NextRequest) {
  let client: ImapFlow | null = null
  let lock: Awaited<ReturnType<ImapFlow["getMailboxLock"]>> | null = null

  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { client: inboxClient, error: inboxError } = await createInboxClient(request)
    if (!inboxClient) {
      return NextResponse.json(
        {
          error: inboxError || "Email not configured. Please configure SMTP/IMAP in Settings (use an app-specific password for your email).",
        },
        { status: 400 },
      )
    }

    const { maxResults = 10 } = await request.json().catch(() => ({ maxResults: 10 }))
    const limit = Math.min(Math.max(Number(maxResults) || 10, 1), 50)

    client = inboxClient
    await client.connect()

    lock = await client.getMailboxLock("INBOX")

    const total = client.mailbox ? client.mailbox.exists || 0 : 0
    if (!total) {
      return NextResponse.json(
        {
          emails: [],
          nextPageToken: null,
          hasMore: false,
        },
        { status: 200 },
      )
    }

    const startSeq = total > limit ? total - limit + 1 : 1
    const range = `${startSeq}:${total}`

    const metaMessages: any[] = []
    for await (const msg of client.fetch(range, {
      uid: true,
      envelope: true,
      internalDate: true,
      flags: true,
    })) {
      metaMessages.push(msg)
    }

    // Download and parse bodies separately to avoid deadlocks
    const inbox = []
    const reversed = metaMessages.reverse() // newest first

    for (const msg of reversed) {
      const { content } = await client.download(msg.seq)
      const parsed = await simpleParser(content)

      const fromAddress = parsed.from?.value?.[0]
      const fromEmail = fromAddress?.address || ""
      const fromName = fromAddress?.name || ""
      const subject = parsed.subject || msg.envelope?.subject || ""

      const dateObj = parsed.date || msg.internalDate || new Date()
      const dateFull = dateObj instanceof Date ? dateObj.toISOString() : new Date(dateObj as any).toISOString()
      const dateFormatted =
        dateObj instanceof Date ? dateObj.toDateString() : new Date(dateObj as any).toDateString()

      const id = String(msg.uid ?? msg.seq)

      inbox.push({
        id,
        threadId: null,
        from: fromName || fromEmail,
        fromEmail,
        fromName,
        subject,
        date: dateFormatted,
        dateFull,
        to: parsed.to?.text || "",
        cc: parsed.cc?.text || "",
        bcc: parsed.bcc?.text || "",
        content: parsed.html || parsed.textAsHtml || parsed.text || "",
        contentText: parsed.text || "",
        html: parsed.html || "",
      })
    }

    return NextResponse.json(
      {
        emails: inbox,
        nextPageToken: null,
        hasMore: false,
      },
      { status: 200 },
    )
  } catch (err: any) {
    console.error("IMAP fetch error:", err?.message || err)
    return NextResponse.json({ error: "Failed to fetch emails via IMAP" }, { status: 500 })
  } finally {
    try {
      if (lock) {
        lock.release()
      }
      if (client) {
        await client.logout()
      }
    } catch {
      // ignore cleanup errors
    }
  }
}

export async function GET(request: NextRequest) {
  try {
    const readiness = await getEmailProviderReadiness(request)
    return NextResponse.json({ OAuth: readiness.ready, readiness }, { status: 200 })
  } catch (e) {
    console.error("Failed to fetch email configuration status:", e)
    return NextResponse.json({ error: "Failed to fetch email configuration status" }, { status: 500 })
  }
}
