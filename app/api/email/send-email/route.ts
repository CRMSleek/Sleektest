import { NextResponse } from "next/server";
import { auth } from "@/auth";
import { google } from "googleapis";
import MailComposer from "nodemailer/lib/mail-composer"; 
import { getCurrentUser } from "@/lib/supabase/auth"
import nodemailer from "nodemailer"
import { requestToBodyStream } from "next/dist/server/body-streams";


export async function POST(request: Request) {
  const session = await auth();
  
  const currentUser = await getCurrentUser(request as any)
  
  const hasOAuth = !currentUser.password
  if (!hasOAuth && (!currentUser || !currentUser.password)) {
    return NextResponse.json({ error: "Unauthorized - Please configure email or use OAuth" }, { status: 401 });
  }

  const formData = await request.formData();
  const emailData = JSON.parse(formData.get("email") as string);
  const files = formData.getAll("files") as File[];

  const {
    to,
    subject,
    body,
    cc,
    bcc,
    mode,
    originalEmailId,
    threadId,
  } = emailData;

  if (!to || !subject || !body) {
    return NextResponse.json({ error: "Missing email parameters" }, { status: 400 });
  }


  if (currentUser && currentUser.password && !hasOAuth) {
    try {
      console.log("NODEMAILER")
      const emailDomain = currentUser.email?.split('@')[1]?.toLowerCase()
      
      let smtpConfig: any = {
        host: 'smtp.gmail.com',
        port: 587,
        secure: false,
        auth: {
          user: currentUser.email,
          pass: currentUser.password, 
        },
      }

      if (emailDomain === 'gmail.com') {
        smtpConfig = {
          host: 'smtp.gmail.com',
          port: 587,
          secure: false,
          auth: {
            user: currentUser.email,
            pass: currentUser.password,
          },
        }
      } else if (emailDomain === 'outlook.com' || emailDomain === 'hotmail.com') {
        smtpConfig = {
          host: 'smtp-mail.outlook.com',
          port: 587,
          secure: false,
          auth: {
            user: currentUser.email,
            pass: currentUser.password,
          },
        }
      } else if (emailDomain === 'yahoo.com') {
        smtpConfig = {
          host: 'smtp.mail.yahoo.com',
          port: 587,
          secure: false,
          auth: {
            user: currentUser.email,
            pass: currentUser.password,
          },
        }
      }

      const transporter = nodemailer.createTransport(smtpConfig)

      const attachments = await Promise.all(
        (files || []).map(async (f: any) => ({
          filename: f.name,
          content: Buffer.from(await f.arrayBuffer()),
        }))
      );

      await transporter.sendMail({
        from: currentUser.email,
        to: to.split(',').map((email: string) => email.trim()),
        cc: cc ? cc.split(',').map((email: string) => email.trim()) : undefined,
        bcc: bcc ? bcc.split(',').map((email: string) => email.trim()) : undefined,
        subject: subject,
        html: body,
        attachments: attachments.length > 0 ? attachments : undefined,
      })

      return NextResponse.json({ success: true })
    } catch (err: any) {
      console.error("Nodemailer error:", err)
      return NextResponse.json({ 
        error: `Error sending email: ${err.message || 'Please configure SMTP credentials. For Gmail, you need to use an app password.'}` 
      }, { status: 500 })
    }
  }

  if (!hasOAuth) {
    return NextResponse.json({ error: "OAuth session required for Gmail API" }, { status: 401 })
  }

  try {
    console.log("OAUTH")
    const oAuth2Client = new google.auth.OAuth2(
      process.env.GOOGLE_CLIENT_ID,
      process.env.GOOGLE_CLIENT_SECRET
    );

    oAuth2Client.setCredentials({
      access_token: (session as any).accessToken,
      refresh_token: (session as any).refreshToken,
    });

    const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

    const attachments = await Promise.all(
      (files || []).map(async (f: any) => ({
        filename: f.name,
        content: Buffer.from(await f.arrayBuffer()),
      }))
    );

    let mailOptions: any = {
      to,
      cc,
      bcc,
      subject,
      html: body,
      attachments,
    };

    if (mode === 'reply' && originalEmailId) {
      try {
        const originalMessage = await gmail.users.messages.get({
          userId: "me",
          id: originalEmailId,
          format: "metadata",
          metadataHeaders: ["Message-ID", "References"],
        });

        const headers = originalMessage.data.payload?.headers || [];
        const getHeader = (name: string) =>
          headers.find((h: any) => h.name?.toLowerCase() === name.toLowerCase())?.value || "";

        const messageId = getHeader("Message-ID");
        const references = getHeader("References");

        if (messageId) {
          mailOptions.inReplyTo = messageId;
          mailOptions.references = references ? `${references} ${messageId}` : messageId;
        }
      } catch (err) {
        console.error("Failed fetching original for reply headers", err);
      }
    }

    const mail = new MailComposer(mailOptions);

    const raw = await new Promise<string>((resolve, reject) => {
      mail.compile().build((err: any, message: Buffer) => {
        if (err) reject(err);
        else resolve(message.toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, ""));
      });
    });

    const requestBody: any = { raw };
    if (mode === 'reply' && threadId) requestBody.threadId = threadId;

    await gmail.users.messages.send({ userId: "me", requestBody });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Failed to send email with attachments:", err);
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 });
  }
}