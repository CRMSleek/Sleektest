import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"

export async function GET(request: NextRequest, context: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const { data: customer, error } = await supabase
      .from('customers')
      .select('id, name, email, phone, location, age, notes, created_at')
      .eq('id', id)
      .eq('business_id', user.business.id)
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Fetch responses for this customer (with survey title)
    const { data: responses } = await supabase
      .from('survey_responses')
      .select('id, submitted_at, answers, survey_id')
      .eq('customer_id', id)
      .order('submitted_at', { ascending: false })

    let responsesWithTitles: any[] = []
    if (responses && responses.length > 0) {
      const surveyIds = [...new Set(responses.map(r => r.survey_id))]
      const { data: surveysMapData } = await supabase
        .from('surveys')
        .select('id, title')
        .in('id', surveyIds)
      const titleById: Record<string, string> = {}
      surveysMapData?.forEach(s => { titleById[s.id] = s.title })
      responsesWithTitles = responses.map(r => ({
        id: r.id,
        submittedAt: r.submitted_at,
        answers: r.answers,
        survey: { title: titleById[r.survey_id] || 'Survey' },
      }))
    }

    const normalized = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      phone: customer.phone,
      location: customer.location,
      age: customer.age,
      notes: customer.notes,
      createdAt: customer.created_at,
      responses: responsesWithTitles,
    }

    return NextResponse.json({ customer: normalized })
  } catch (error) {
    console.error("Get customer error", error)
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const { id } = await context.params

    const { data: customer, error } = await supabase
      .from('customers')
      .update(body)
      .eq('id', id)
      .eq('business_id', user.business.id)
      .select('id, name, email, location, age, created_at')
      .single()

    if (error || !customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    const normalized = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      location: customer.location,
      age: customer.age,
      createdAt: customer.created_at,
      responses: [],
    }

    return NextResponse.json({ customer: normalized })
  } catch (error) {
    console.error("Update customer error:", error)
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const { error } = await supabase
      .from('customers')
      .delete()
      .eq('id', id)
      .eq('business_id', user.business.id)

    if (error) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete customer error:", error)
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 })
  }
}
