import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"
import { nanoid } from "nanoid"

// GET: Fetch all relationships for the current user or get relationship for specific email
export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')

    // If emailId provided, fetch relationship for that email
    if (emailId) {
      const { data: mapping } = await supabase
        .from('email_relationship_mappings')
        .select('relationship_id, customers!inner(id, name, email, relationship_type)')
        .eq('user_id', user.id)
        .eq('email_id', emailId)
        .single()

      if (mapping) {
        return NextResponse.json({ relationship: mapping.customers }, { status: 200 })
      } else {
        return NextResponse.json({ relationship: null }, { status: 200 })
      }
    }

    // Otherwise, fetch all relationships
    const { data: relationships, error } = await supabase
      .from('customers')
      .select('id, name, email, relationship_type')
      .eq('business_id', user.business.id)
      .order('name', { ascending: true })

    if (error) {
      console.error("Error fetching relationships:", error)
      return NextResponse.json({ error: "Failed to fetch relationships" }, { status: 500 })
    }

    return NextResponse.json({ relationships: relationships || [] }, { status: 200 })
  } catch (err: any) {
    console.error("Error in GET /api/email/relationships:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// POST: Attach email to relationship
export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { emailId, relationshipId } = await request.json()

    if (!emailId || !relationshipId) {
      return NextResponse.json({ error: "Email ID and relationship ID are required" }, { status: 400 })
    }

    // Verify relationship belongs to user's business
    const { data: relationship } = await supabase
      .from('customers')
      .select('id, business_id')
      .eq('id', relationshipId)
      .single()

    if (!relationship || relationship.business_id !== user.business?.id) {
      return NextResponse.json({ error: "Relationship not found" }, { status: 404 })
    }

    // Check if mapping already exists
    const { data: existing } = await supabase
      .from('email_relationship_mappings')
      .select('id')
      .eq('user_id', user.id)
      .eq('email_id', emailId)
      .single()

    if (existing) {
      // Update existing mapping
      const { error: updateError } = await supabase
        .from('email_relationship_mappings')
        .update({ relationship_id: relationshipId })
        .eq('id', existing.id)

      if (updateError) {
        console.error("Error updating email-relationship mapping:", updateError)
        return NextResponse.json({ error: "Failed to update mapping" }, { status: 500 })
      }
    } else {
      // Create new mapping
      const { error: insertError } = await supabase
        .from('email_relationship_mappings')
        .insert({
          id: nanoid(),
          user_id: user.id,
          email_id: emailId,
          relationship_id: relationshipId,
        })

      if (insertError) {
        console.error("Error creating email-relationship mapping:", insertError)
        return NextResponse.json({ error: "Failed to create mapping" }, { status: 500 })
      }
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error("Error in POST /api/email/relationships:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

// DELETE: Remove email from relationship
export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const emailId = searchParams.get('emailId')

    if (!emailId) {
      return NextResponse.json({ error: "Email ID is required" }, { status: 400 })
    }

    const { error } = await supabase
      .from('email_relationship_mappings')
      .delete()
      .eq('user_id', user.id)
      .eq('email_id', emailId)

    if (error) {
      console.error("Error deleting email-relationship mapping:", error)
      return NextResponse.json({ error: "Failed to remove mapping" }, { status: 500 })
    }

    return NextResponse.json({ success: true }, { status: 200 })
  } catch (err: any) {
    console.error("Error in DELETE /api/email/relationships:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

