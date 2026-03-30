import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { getEffectiveEmailCredentials } from "@/lib/email-settings"
import { ImapFlow } from "imapflow"
import { simpleParser } from "mailparser"

function getImapConfigFromDomain(email: string, password: string) {
  const domain = email.split("@")[1]?.toLowerCase() || ""

  if (domain === "gmail.com") {
    return {
      host: "imap.gmail.com",
      port: 993,
      secure: true,
      auth: { user: email, pass: password },
    }
  }

  if (["outlook.com", "hotmail.com", "live.com"].includes(domain) || domain.endsWith("office365.com")) {
    return {
      host: "outlook.office365.com",
      port: 993,
      secure: true,
      auth: { user: email, pass: password },
    }
  }

  if (["yahoo.com", "ymail.com"].includes(domain)) {
    return {
      host: "imap.mail.yahoo.com",
      port: 993,
      secure: true,
      auth: { user: email, pass: password },
    }
  }

  return {
    host: process.env.DEFAULT_IMAP_HOST || `imap.${domain}`,
    port: Number(process.env.DEFAULT_IMAP_PORT || 993),
    secure: true,
    auth: { user: email, pass: password },
  }
}

export async function POST(request: NextRequest) {
  let client: ImapFlow | null = null
  let lock: Awaited<ReturnType<ImapFlow["getMailboxLock"]>> | null = null

  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const credentials = await getEffectiveEmailCredentials(request)
    if (!credentials) {
      return NextResponse.json(
        {
          error:
            "Email not configured. Please configure SMTP/IMAP in Settings (use an app-specific password for your email).",
        },
        { status: 400 },
      )
    }

    const { maxResults = 10 } = await request.json().catch(() => ({ maxResults: 10 }))
    const limit = Math.min(Math.max(Number(maxResults) || 10, 1), 50)

    const imapConfig =
      credentials.imap?.host && credentials.imap?.port
        ? {
            host: credentials.imap.host,
            port: credentials.imap.port,
            secure: credentials.imap.secure ?? true,
            auth: { user: credentials.email, pass: credentials.password },
          }
        : getImapConfigFromDomain(credentials.email, credentials.password)
    client = new ImapFlow(imapConfig)
    await client.connect()

    lock = await client.getMailboxLock("INBOX")

    const total = client.mailbox.exists || 0
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
    const credentials = await getEffectiveEmailCredentials(request)
    return NextResponse.json({ OAuth: !!credentials }, { status: 200 })
  } catch (e) {
    console.error("Failed to fetch email configuration status:", e)
    return NextResponse.json({ error: "Failed to fetch email configuration status" }, { status: 500 })
  }
}
