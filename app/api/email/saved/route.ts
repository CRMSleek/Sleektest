import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"
import { nanoid } from "nanoid"

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
      const emailsToInsert = emailsToSave.map((email: any) => ({
        user_id: user.id,
        gmail_message_id: email.id,
        thread_id: email.threadId || null,
        sender_name: email.fromName || null,
        sender_email: email.fromEmail || email.from || '',
        recipient_to: email.to || null,
        recipient_cc: email.cc || null,
        recipient_bcc: email.bcc || null,
        subject: email.subject || null,
        date: email.dateFull ? new Date(email.dateFull).toISOString() : new Date().toISOString(),
        content_text: email.contentText || null,
        content_html: email.html || email.content || null,
      }))

      // Check for existing emails to avoid duplicates
      const existingIds = emailsToInsert.map(e => e.gmail_message_id)
      const { data: existing } = await supabase
        .from('emails')
        .select('gmail_message_id')
        .eq('user_id', user.id)
        .in('gmail_message_id', existingIds)

      const existingIdsSet = new Set(existing?.map(e => e.gmail_message_id) || [])
      const newEmailsToInsert = emailsToInsert.filter(e => !existingIdsSet.has(e.gmail_message_id))
      if (newEmailsToInsert.length > 0) {
        const { data: inserted, error: insertError } = await supabase
          .from('emails')
          .insert(newEmailsToInsert)
          .select('gmail_message_id')

        if (insertError) {
          console.error("Error saving emails:", insertError)
          results.errors.push(`Failed to save some emails: ${insertError.message}`)
        } else {
          results.saved = inserted?.map(e => e.gmail_message_id) || []
          
          // Auto-assign emails based on rules
          if (inserted && inserted.length > 0) {
            const senderEmails = newEmailsToInsert.map(e => e.sender_email)
            
            // Get active auto-assignment rules
            const { data: rules } = await supabase
              .from('email_auto_assignment_rules')
              .select('sender_email, relationship_id')
              .eq('user_id', user.id)
              .eq('is_active', true)
              .in('sender_email', senderEmails)

            if (rules && rules.length > 0) {
              const mappingsToInsert: any[] = []
              
              inserted.forEach((savedEmail) => {
                const emailData = newEmailsToInsert.find(e => e.gmail_message_id === savedEmail.gmail_message_id)
                if (emailData) {
                  const rule = rules.find(r => r.sender_email.toLowerCase() === emailData.sender_email.toLowerCase())
                  if (rule) {
                    mappingsToInsert.push({
                      id: nanoid(),
                      user_id: user.id,
                      email_id: savedEmail.gmail_message_id,
                      relationship_id: rule.relationship_id,
                    })
                  }
                }
              })

              if (mappingsToInsert.length > 0) {
                // Check for existing mappings
                const emailIds = mappingsToInsert.map(m => m.email_id)
                const { data: existingMappings } = await supabase
                  .from('email_relationship_mappings')
                  .select('email_id')
                  .eq('user_id', user.id)
                  .in('email_id', emailIds)

                const existingEmailIds = new Set(existingMappings?.map(m => m.email_id) || [])
                const newMappings = mappingsToInsert.filter(m => !existingEmailIds.has(m.email_id))

                if (newMappings.length > 0) {
                  await supabase
                    .from('email_relationship_mappings')
                    .insert(newMappings)
                }
              }
            }
          }
        }
      }
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

