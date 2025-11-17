import { type NextRequest, NextResponse } from "next/server"
import { google } from "googleapis"
import { getToken } from "next-auth/jwt"
import { findUserByEmail, getCurrentUser } from "@/lib/supabase/auth"

function decodeBase64(data: string) {
  return Buffer.from(data.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8')
}

function getHTML(payload: any): string {
  if (!payload) return ''
  if (payload.mimeType === 'text/html' && payload.body?.data) {
    return decodeBase64(payload.body.data)
  } else if (payload.parts) {
    for (const part of payload.parts) {
      const html = getHTML(part)
      if (html) return html
    }
  }
  return ''
}

function getText(payload: any): string {
  if (!payload) return ''
  if (payload.mimeType === 'text/plain' && payload.body?.data) {
    return decodeBase64(payload.body.data)
  } else if (payload.parts) {
    for (const part of payload.parts) {
      const text = getText(part)
      if (text) return text
    }
  }
  return ''
}

export async function POST(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        if (!(user.password === null)) {
            return NextResponse.json({ message: "This account is not connected to gmail" }, { status: 404 })
        }

        const token: any = await getToken({ req: request, secret: process.env.NEXTAUTH_SECRET })

        if (!token || !token.refreshToken) {
            return NextResponse.json({ error: "No Google refresh token found. Please connect/reconnect your Google account." }, { status: 401 })
        }

        const oAuth2Client = new google.auth.OAuth2(
            process.env.GOOGLE_CLIENT_ID,
            process.env.GOOGLE_CLIENT_SECRET
        )

        oAuth2Client.setCredentials({ refresh_token: token.refreshToken })

        await oAuth2Client.getAccessToken()

        const gmail = google.gmail({ version: "v1", auth: oAuth2Client })

        const { pageToken, maxResults = 10 } = await request.json().catch(() => ({ pageToken: undefined, maxResults: 10 }))

        const response = await gmail.users.messages.list({
            userId: "me",
            q: "in:inbox category:primary",
            maxResults: maxResults,
            pageToken: pageToken || undefined,
        })

        const messages = response.data.messages || []
        const nextPageToken = response.data.nextPageToken || null

        const inbox = await Promise.all(
            messages.map(async (msg) => {
                const m = await gmail.users.messages.get({
                    userId: "me",
                    id: msg.id!,
                    format: "full",
                    metadataHeaders: ["From", "Subject", "Date"],
                })
                const htmlContent = getHTML(m.data.payload)
                const textContent = getText(m.data.payload)
                const headers = m.data.payload?.headers || []
                const getHeader = (name: string) =>
                headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || ""
                
                const fromHeader = getHeader("From")
                const fromEmailMatch = fromHeader.match(/<(.+)>/)
                const fromEmail = fromEmailMatch ? fromEmailMatch[1] : fromHeader
                const fromName = fromHeader.includes('<') ? fromHeader.substring(0, fromHeader.indexOf('<')).trim() : ''
                
                const dateHeader = getHeader("Date")
                const dateFormatted = dateHeader ? (dateHeader.includes("202") ? dateHeader.substring(0, dateHeader.indexOf("202") + 4) : dateHeader) : ""
                
                return {
                    id: msg.id,
                    threadId: m.data.threadId,
                    from: fromName || fromEmail,
                    fromEmail: fromEmail,
                    fromName: fromName,
                    subject: getHeader("Subject"),
                    date: dateFormatted,
                    dateFull: dateHeader,
                    to: getHeader("To"),
                    cc: getHeader("Cc"),
                    bcc: getHeader("Bcc"),
                    content: htmlContent || textContent,
                    contentText: textContent,
                    html: htmlContent,
                }
            })
        )

        return NextResponse.json({ 
            emails: inbox, 
            nextPageToken: nextPageToken,
            hasMore: !!nextPageToken
        }, { status: 200 })
    } catch (err: any) {
        console.error("Gmail fetch error:", err?.response?.data || err?.message || err)

        const message = (err?.message || "").toString()
        if (message.includes("insufficient" ) || (err?.response?.data && JSON.stringify(err.response.data).includes("insufficient"))) {
            return NextResponse.json({ error: "Request had insufficient authentication scopes. Please reconnect your Google account and grant Gmail read permissions (gmail.readonly)." }, { status: 403 })
        }

        return NextResponse.json({ error: "Failed to fetch emails" }, { status: 500 })
    }
}


export async function GET(request: NextRequest) {
    try {
        const user = await getCurrentUser(request)
        return NextResponse.json({ OAuth: (user?.password === null) }, { status: 200 })
    } catch (e) {
        return NextResponse.json({ error: "Failed to fetch OAuth status" }, { status: 500 })
    }
}
