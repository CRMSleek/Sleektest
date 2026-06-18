import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { fetchRelevantInboxEmailsForAnalysis, saveEmailsForAnalysis } from "@/lib/email-analysis-selection"

export const runtime = "nodejs"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await request.json().catch(() => ({}))) as { maxResults?: number }
    const maxResults = Math.min(Math.max(Number(body.maxResults) || 50, 1), 100)
    const selected = await fetchRelevantInboxEmailsForAnalysis(request, maxResults)

    if (selected.error) {
      return NextResponse.json({ error: selected.error, selected: [], saved: [], skipped: 0 }, { status: selected.error === "Email not configured" ? 400 : 500 })
    }

    const saveResult = await saveEmailsForAnalysis(user, selected.emails)

    return NextResponse.json({
      selected: selected.classified.map((email) => ({
        id: email.id,
        subject: email.subject,
        from: email.from,
        fromEmail: email.fromEmail,
        score: email.score,
        reason: email.reason,
      })),
      saved: saveResult.saved,
      skipped: saveResult.skipped,
      errors: saveResult.errors,
    })
  } catch (error) {
    console.error("Auto-select emails error:", error)
    return NextResponse.json({ error: "Failed to auto-select relevant emails" }, { status: 500 })
  }
}
