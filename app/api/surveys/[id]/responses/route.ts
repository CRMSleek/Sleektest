import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    // Fetch responses for this survey (owner-facing; auth already enforced by middleware)

    const { id } = await params
    const { data: responses, error } = await supabase
      .from('survey_responses')
      .select('id, submitted_at, answers, customer_email, customer_name')
      .eq('survey_id', id)
      .order('submitted_at', { ascending: false })


    if (error) throw error
    const resp = { response: responses }
    return NextResponse.json(resp, { status: 200 })
  } catch (error) {
    console.error('List survey responses error:', error)
    return NextResponse.json({ error: 'Failed to load responses' }, { status: 500 })
  }
}

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { answers, customerInfo } = await request.json()

    if (!answers) {
      return NextResponse.json({ error: "Answers are required" }, { status: 400 })
    }

    const { id } = await params

    // Check if survey exists and is active
    const { data: survey, error: surveyError } = await supabase
      .from('surveys')
      .select('id, user_id, is_active')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (surveyError || !survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    // Find business for survey owner
    const { data: business, error: bizError } = await supabase
      .from('businesses')
      .select('id')
      .eq('user_id', survey.user_id)
      .single()

    if (bizError || !business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

    let customerId: string | null = null

    // Create or update customer if info provided
    if (customerInfo?.email) {
      // Try to find existing customer for this business by email
      const { data: existingCustomer } = await supabase
        .from('customers')
        .select('id')
        .eq('business_id', business.id)
        .eq('email', customerInfo.email)
        .single()

      if (existingCustomer?.id) {
        customerId = existingCustomer.id
        await supabase
          .from('customers')
          .update({
            name: customerInfo.name ?? undefined,
            phone: customerInfo.phone ?? undefined,
            location: customerInfo.location ?? undefined,
            age: customerInfo.age ?? undefined,
            notes: customerInfo.notes ?? undefined,
            email: customerInfo.email,
            data: customerInfo,
          })
          .eq('id', existingCustomer.id)
      } else {
        const { data: createdCustomer } = await supabase
          .from('customers')
          .insert({
            business_id: business.id,
            email: customerInfo.email,
            name: customerInfo.name ?? null,
            phone: customerInfo.phone ?? null,
            location: customerInfo.location ?? null,
            age: customerInfo.age ?? null,
            notes: customerInfo.notes ?? null,
            data: customerInfo,
          })
          .select('id')
          .single()
        customerId = createdCustomer?.id ?? null
      }
    }

    // Create survey response

    
    const { data: response, error: respError } = await supabase
      .from('survey_responses')
      .insert({
        answers,
        survey_id: id,
        business_id: business.id,
        customer_id: customerId,
        submitted_at: new Date().toISOString(),
        customer_email: customerInfo.email,
        customer_name: customerInfo.name
      })
      .select('id')
      .single()

    if (respError || !response) {
      throw respError
    }

    return NextResponse.json({ success: true, responseId: response.id })
  } catch (error) {
    console.error("Create survey response error:", error)
    return NextResponse.json({ error: "Failed to submit survey response" }, { status: 500 })
  }
}
