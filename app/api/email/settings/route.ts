import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { supabaseAdmin as supabase } from "@/lib/supabase/server"
import { encryptSecret, hasComplianceEncryptionKey } from "@/lib/crypto"
import { isRegulatedMode } from "@/lib/compliance"
import { writeAuditLog } from "@/lib/audit-log"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data, error } = await supabase
      .from("email_settings")
      .select("id, user_id, email, smtp_host, smtp_port, smtp_secure, imap_host, imap_port, imap_secure, created_at, updated_at")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      console.error("Email settings fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch email settings" }, { status: 500 })
    }

    if (!data) {
      return NextResponse.json({
        configured: false,
        email: "",
        smtp_host: "",
        smtp_port: 587,
        smtp_secure: false,
        imap_host: "",
        imap_port: 993,
        imap_secure: true,
      })
    }

    return NextResponse.json({
      configured: true,
      email: data.email,
      smtp_host: data.smtp_host ?? "",
      smtp_port: data.smtp_port ?? 587,
      smtp_secure: data.smtp_secure ?? false,
      imap_host: data.imap_host ?? "",
      imap_port: data.imap_port ?? 993,
      imap_secure: data.imap_secure ?? true,
    })
  } catch (e) {
    console.error("Email settings GET error:", e)
    return NextResponse.json({ error: "Failed to fetch email settings" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const {
      email,
      app_password,
      smtp_host,
      smtp_port,
      smtp_secure,
      imap_host,
      imap_port,
      imap_secure,
    } = body

    if (!email) {
      return NextResponse.json(
        { error: "Email is required" },
        { status: 400 }
      )
    }

    const { data: existing } = await supabase
      .from("email_settings")
      .select("id, app_password")
      .eq("user_id", user.id)
      .maybeSingle()

    const incomingPassword = app_password != null && String(app_password).trim() !== ""
      ? String(app_password)
      : ""
    const regulatedMode = isRegulatedMode(user.business?.compliance_mode)

    if (regulatedMode && incomingPassword && !hasComplianceEncryptionKey()) {
      return NextResponse.json(
        { error: "COMPLIANCE_ENCRYPTION_KEY is required before saving email credentials in HIPAA/FERPA mode" },
        { status: 500 }
      )
    }

    const passwordToUse = incomingPassword
      ? encryptSecret(incomingPassword)
      : (existing?.app_password ?? "")

    if (!passwordToUse) {
      return NextResponse.json(
        { error: "App password is required (use an app-specific password from your email provider)" },
        { status: 400 }
      )
    }

    const payload = {
      user_id: user.id,
      email: String(email).trim().toLowerCase(),
      app_password: passwordToUse,
      smtp_host: smtp_host ? String(smtp_host).trim() || null : null,
      smtp_port: smtp_port != null && smtp_port !== "" ? Number(smtp_port) : null,
      smtp_secure: Boolean(smtp_secure),
      imap_host: imap_host ? String(imap_host).trim() || null : null,
      imap_port: imap_port != null && imap_port !== "" ? Number(imap_port) : null,
      imap_secure: Boolean(imap_secure),
      updated_at: new Date().toISOString(),
    }

    if (existing) {
      const { error: updateError } = await supabase
        .from("email_settings")
        .update(payload)
        .eq("user_id", user.id)

      if (updateError) {
        console.error("Email settings update error:", updateError)
        return NextResponse.json({ error: "Failed to save email settings" }, { status: 500 })
      }
    } else {
      const { error: insertError } = await supabase.from("email_settings").insert({
        ...payload,
        created_at: new Date().toISOString(),
      })

      if (insertError) {
        console.error("Email settings insert error:", insertError)
        return NextResponse.json({ error: "Failed to save email settings" }, { status: 500 })
      }
    }

    await writeAuditLog({
      actorUserId: user.id,
      businessId: user.business?.id ?? null,
      action: "email_settings.saved",
      tableName: "email_settings",
      rowId: existing?.id ?? null,
      metadata: {
        changedPassword: Boolean(incomingPassword),
        regulatedMode,
      },
      request,
    })

    return NextResponse.json({ success: true })
  } catch (e) {
    console.error("Email settings POST error:", e)
    return NextResponse.json({ error: "Failed to save email settings" }, { status: 500 })
  }
}
