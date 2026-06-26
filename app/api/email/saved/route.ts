import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { saveEmailsForAnalysis } from "@/lib/email-analysis-selection"

// GET: Fetch saved email IDs for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: savedEmails, error } = await supabase
      .from('emails')
      .select('gmail_message_id')
      .eq('user_id', user.id)

    if (error) {
      console.error("Error fetching saved emails:", error)
      return NextResponse.json({ error: "Failed to fetch saved emails" }, { status: 500 })
    }

    const savedEmailIds = savedEmails?.map(email => email.gmail_message_id) || []
    return NextResponse.json({ savedEmailIds }, { status: 200 })
  } catch (err: any) {
    console.error("Error in GET /api/email/saved:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST: Save or delete emails
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailsToSave, emailIdsToDelete } = await request.json()

    const results = {
      saved: [] as string[],
      deleted: [] as string[],
      errors: [] as string[],
    }

    // Save new emails
    if (emailsToSave && Array.isArray(emailsToSave) && emailsToSave.length > 0) {
      const saveResult = await saveEmailsForAnalysis(user, emailsToSave)
      results.saved = saveResult.saved
      results.errors.push(...saveResult.errors)
    }

    // Delete emails
    if (emailIdsToDelete && Array.isArray(emailIdsToDelete) && emailIdsToDelete.length > 0) {
      const { error: deleteError } = await supabase
        .from('emails')
        .delete()
        .eq('user_id', user.id)
        .in('gmail_message_id', emailIdsToDelete)

      if (deleteError) {
        console.error("Error deleting emails:", deleteError)
        results.errors.push(`Failed to delete some emails: ${deleteError.message}`)
      } else {
        results.deleted = emailIdsToDelete
      }
    }

    return NextResponse.json(results, { status: 200 })
  } catch (err: any) {
    console.error("Error in POST /api/email/saved:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
