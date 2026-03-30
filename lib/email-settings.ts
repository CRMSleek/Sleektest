import { supabase } from "@/lib/supabase/client"
import type { NextRequest } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"

export type EmailSettingsRow = {
  id: string
  user_id: string
  email: string
  app_password: string
  smtp_host: string | null
  smtp_port: number | null
  smtp_secure: boolean
  imap_host: string | null
  imap_port: number | null
  imap_secure: boolean
  created_at: string
  updated_at: string
}

/** Get effective email credentials for the current user: from email_settings if set, else from user record (email + password). */
export async function getEffectiveEmailCredentials(request: NextRequest) {
  const user = await getCurrentUser(request)
  if (!user) return null

  const { data: settings } = await supabase
    .from("email_settings")
    .select("*")
    .eq("user_id", user.id)
    .maybeSingle()

  if (settings?.email && settings?.app_password) {
    return {
      email: settings.email,
      password: settings.app_password,
      smtp: {
        host: settings.smtp_host ?? undefined,
        port: settings.smtp_port ?? undefined,
        secure: settings.smtp_secure,
      },
      imap: {
        host: settings.imap_host ?? undefined,
        port: settings.imap_port ?? undefined,
        secure: settings.imap_secure,
      },
    }
  }

  if (user.email && user.password) {
    return {
      email: user.email,
      password: user.password,
      smtp: undefined,
      imap: undefined,
    }
  }

  return null
}
