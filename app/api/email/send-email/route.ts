import { NextResponse } from "next/server"
import { getEmailProviderReadiness, sendEmailWithProvider } from "@/lib/server-email-provider"

export async function POST(request: Request) {
  const readiness = await getEmailProviderReadiness(request)
  if (!readiness.ready) {
    return NextResponse.json(
      { error: "Email not configured. Please configure SMTP/IMAP in Settings with an app-specific password." },
      { status: 401 },
    )
  }

  const formData = await request.formData()
  const emailData = JSON.parse(formData.get("email") as string)
  const files = formData.getAll("files") as File[]

  const { to, subject, body, cc, bcc, mode, originalEmailId, threadId } = emailData

  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Missing email parameters" }, { status: 400 })
  }

  try {
    const attachments = await Promise.all(
      (files || []).map(async (f: any) => ({
        filename: f.name,
        content: Buffer.from(await f.arrayBuffer()),
      })),
    )

    const result = await sendEmailWithProvider(request, {
      to: to.split(",").map((email: string) => email.trim()),
      cc: cc ? cc.split(",").map((email: string) => email.trim()) : undefined,
      bcc: bcc ? bcc.split(",").map((email: string) => email.trim()) : undefined,
      subject: subject,
      html: body,
      text: body,
      attachments,
      replyToMessageId: mode === "reply" ? originalEmailId || threadId : null,
    })

    if (!result.ok) {
      return NextResponse.json({ error: result.error }, { status: result.needsCredentials ? 401 : 400 })
    }

    return NextResponse.json({ success: true })
  } catch (err: any) {
    console.error("SMTP send error:", err)
    return NextResponse.json(
      {
        error: `Error sending email: ${err.message || "Please configure SMTP credentials. For Gmail, you need to use an app password."}`,
      },
      { status: 500 },
    )
  }
}
