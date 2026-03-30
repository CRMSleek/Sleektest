import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { supabase } from "@/lib/supabase/client"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const { data, error } = await supabase
      .from("user_preferences")
      .select("*")
      .eq("user_id", user.id)
      .maybeSingle()

    if (error) {
      console.error("Preferences fetch error:", error)
      return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 })
    }

    return NextResponse.json({
      theme: data?.theme ?? "dark",
      emailNotifications: data?.email_notifications ?? true,
      surveyResponses: data?.survey_responses ?? true,
      weeklyReports: data?.weekly_reports ?? false,
      marketingEmails: data?.marketing_emails ?? false,
    })
  } catch (error) {
    console.error("Preferences GET error:", error)
    return NextResponse.json({ error: "Failed to fetch preferences" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = await request.json()
    const payload = {
      user_id: user.id,
      theme: typeof body.theme === "string" ? body.theme : null,
      email_notifications: Boolean(body.emailNotifications),
      survey_responses: Boolean(body.surveyResponses),
      weekly_reports: Boolean(body.weeklyReports),
      marketing_emails: Boolean(body.marketingEmails),
      updated_at: new Date().toISOString(),
    }

    const { data: existing } = await supabase
      .from("user_preferences")
      .select("id")
      .eq("user_id", user.id)
      .maybeSingle()

    if (existing) {
      const { error } = await supabase.from("user_preferences").update(payload).eq("user_id", user.id)
      if (error) throw error
    } else {
      const { error } = await supabase
        .from("user_preferences")
        .insert({ ...payload, created_at: new Date().toISOString() })
      if (error) throw error
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Preferences POST error:", error)
    return NextResponse.json({ error: "Failed to save preferences" }, { status: 500 })
  }
}
