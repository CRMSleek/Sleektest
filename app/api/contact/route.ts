import { NextResponse } from "next/server"
import nodemailer from "nodemailer"

export const runtime = "nodejs"

type ContactPayload = {
  name?: string
  email?: string
  company?: string
  subject?: string
  message?: string
}

function escapeHtml(value: string) {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

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
  const emailAddress = process.env.EMAIL_ADDRESS?.trim() || ""
  const appPassword = process.env.APP_PASSWORD?.trim() || ""

  if (!emailAddress || !appPassword) {
    return NextResponse.json(
      {
        error: "Contact form email is not configured. Set EMAIL_ADDRESS and APP_PASSWORD in the environment.",
      },
      { status: 500 },
    )
  }

  const body = (await request.json().catch(() => null)) as ContactPayload | null
  const name = body?.name?.trim() || ""
  const email = body?.email?.trim() || ""
  const company = body?.company?.trim() || ""
  const subject = body?.subject?.trim() || ""
  const message = body?.message?.trim() || ""

  if (!name || !email || !subject || !message) {
    return NextResponse.json({ error: "Name, email, subject, and message are required." }, { status: 400 })
  }

  try {
    const transporter = nodemailer.createTransport(getSmtpConfigFromDomain(emailAddress, appPassword))

    const html = `
      <div style="font-family: Arial, sans-serif; line-height: 1.6; color: #0f172a;">
        <h2 style="margin: 0 0 12px;">New SleekCRM inquiry</h2>
        <p><strong>Name:</strong> ${escapeHtml(name)}</p>
        <p><strong>Email:</strong> ${escapeHtml(email)}</p>
        <p><strong>Company:</strong> ${escapeHtml(company || "N/A")}</p>
        <p><strong>Subject:</strong> ${escapeHtml(subject)}</p>
        <p style="margin-top: 18px;"><strong>Message:</strong></p>
        <div style="white-space: pre-wrap; padding: 12px; border: 1px solid #e2e8f0; border-radius: 12px;">
          ${escapeHtml(message)}
        </div>
      </div>
    `

    await transporter.sendMail({
      from: `SleekCRM Contact <${emailAddress}>`,
      to: emailAddress,
      replyTo: email,
      subject: `[SleekCRM Contact] ${subject}`,
      text: `Name: ${name}\nEmail: ${email}\nCompany: ${company || "N/A"}\nSubject: ${subject}\n\n${message}`,
      html,
    })

    return NextResponse.json({ message: "Thanks. Your message has been sent." })
  } catch (error) {
    console.error("Contact form send failed:", error)
    return NextResponse.json({ error: "Unable to send the inquiry right now." }, { status: 500 })
  }
}
