import { NextResponse } from "next/server"
import { getEffectiveEmailCredentials } from "@/lib/email-settings"
import nodemailer from "nodemailer"

function getSmtpConfigFromDomain(email: string, password: string) {
  const emailDomain = email.split("@")[1]?.toLowerCase() || ""
  const base = { auth: { user: email, pass: password } }
  if (emailDomain === "gmail.com") {
    return { host: "smtp.gmail.com", port: 587, secure: false, ...base }
  }
  if (["outlook.com", "hotmail.com", "live.com"].includes(emailDomain) || emailDomain.endsWith("office365.com")) {
    return { host: "smtp-mail.outlook.com", port: 587, secure: false, ...base }
  }
  if (["yahoo.com", "ymail.com"].includes(emailDomain)) {
    return { host: "smtp.mail.yahoo.com", port: 587, secure: false, ...base }
  }
  return { host: "smtp.gmail.com", port: 587, secure: false, ...base }
}

export async function POST(request: Request) {
  const credentials = await getEffectiveEmailCredentials(request as any)

  if (!credentials) {
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
    const smtpConfig =
      credentials.smtp?.host && credentials.smtp?.port != null
        ? {
            host: credentials.smtp.host,
            port: credentials.smtp.port,
            secure: credentials.smtp.secure ?? false,
            auth: { user: credentials.email, pass: credentials.password },
          }
        : getSmtpConfigFromDomain(credentials.email, credentials.password)

    const transporter = nodemailer.createTransport(smtpConfig)

    const attachments = await Promise.all(
      (files || []).map(async (f: any) => ({
        filename: f.name,
        content: Buffer.from(await f.arrayBuffer()),
      })),
    )

    const mailOptions: any = {
      from: credentials.email,
      to: to.split(",").map((email: string) => email.trim()),
      cc: cc ? cc.split(",").map((email: string) => email.trim()) : undefined,
      bcc: bcc ? bcc.split(",").map((email: string) => email.trim()) : undefined,
      subject: subject,
      html: body,
      attachments: attachments.length > 0 ? attachments : undefined,
    }

    // Add reply headers if replying
    if (mode === "reply" && originalEmailId) {
      // For SMTP, we can add In-Reply-To and References headers
      // Note: originalEmailId might be a UID from IMAP, so we'll use it as Message-ID if available
      mailOptions.inReplyTo = `<${originalEmailId}@sleekcrm>`
      mailOptions.references = `<${originalEmailId}@sleekcrm>`
    }

    await transporter.sendMail(mailOptions)

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