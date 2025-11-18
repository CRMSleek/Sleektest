import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"
import { emailAutoAssignmentRuleSchema } from "@/lib/validations"
import { nanoid } from "nanoid"

// GET: Fetch all auto-assignment rules for the current user
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { data: rules, error } = await supabase
      .from('email_auto_assignment_rules')
      .select(`
        id,
        sender_email,
        relationship_id,
        is_active,
        created_at,
        customers!inner(id, name, email, relationship_type)
      `)
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) {
      console.error("Error fetching auto-assignment rules:", error)
      return NextResponse.json({ error: "Failed to fetch rules" }, { status: 500 })
    }

    const normalized = (rules || []).map((r: any) => ({
      id: r.id,
      sender_email: r.sender_email,
      relationship_id: r.relationship_id,
      relationship: r.customers,
      is_active: r.is_active,
      created_at: r.created_at,
    }))

    return NextResponse.json({ rules: normalized }, { status: 200 })
  } catch (err: any) {
    console.error("Error in GET /api/email/auto-assignment:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST: Create or update auto-assignment rule
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = emailAutoAssignmentRuleSchema.parse(body)

    // Verify relationship belongs to user's business
    const { data: relationship } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('id', validatedData.relationship_id)
      .single()

    if (!relationship || relationship.business_id !== user.business.id) {
      return NextResponse.json({ error: "Relationship not found" }, { status: 404 })
    }

    // Check if rule already exists for this sender email
    const { data: existing } = await supabase
      .from('email_auto_assignment_rules')
      .select('id')
      .eq('user_id', user.id)
      .eq('sender_email', validatedData.sender_email)
      .single()

    if (existing) {
      // Update existing rule
      const { error: updateError } = await supabase
        .from('email_auto_assignment_rules')
        .update({
          relationship_id: validatedData.relationship_id,
          is_active: validatedData.is_active,
        })
        .eq('id', existing.id)

      if (updateError) {
        console.error("Error updating auto-assignment rule:", updateError)
        return NextResponse.json({ error: "Failed to update rule" }, { status: 500 })
      }
    } else {
      // Create new rule
      const { error: insertError } = await supabase
        .from('email_auto_assignment_rules')
        .insert({
          id: nanoid(),
          user_id: user.id,
          sender_email: validatedData.sender_email,
          relationship_id: validatedData.relationship_id,
          is_active: validatedData.is_active ?? true,
        })

      if (insertError) {
        console.error("Error creating auto-assignment rule:", insertError)
        return NextResponse.json({ error: "Failed to create rule" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error("Error in POST /api/email/auto-assignment:", err)
    if (err.errors) {
      return NextResponse.json({ error: "Validation error", details: err.errors }, { status: 400 })
    }
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE: Delete auto-assignment rule
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const ruleId = searchParams.get('ruleId')

    if (!ruleId) {
      return NextResponse.json({ error: "Rule ID is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from('email_auto_assignment_rules')
      .delete()
      .eq('id', ruleId)
      .eq('user_id', user.id)

    if (error) {
      console.error("Error deleting auto-assignment rule:", error)
      return NextResponse.json({ error: "Failed to delete rule" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error("Error in DELETE /api/email/auto-assignment:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

