import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"
import { customerSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized 4" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""

    let query = supabase
      .from('customers')
      .select('id, name, email, location, age, relationship_type, created_at')
      .eq('business_id', user.business.id)
      .order('name', { ascending: true })

    if (search) {
      query = query.or(`name.ilike.%${search}%,email.ilike.%${search}%,location.ilike.%${search}%,phone.ilike.%${search}%`)
    }

    const { data: customers, error } = await query

    if (error) throw error

    const normalized = (customers || []).map((c: any) => ({
      id: c.id,
      name: c.name,
      email: c.email,
      location: c.location,
      age: c.age,
      relationship_type: c.relationship_type || 'customer',
      createdAt: c.created_at,
      responses: [],
    }))

    return NextResponse.json({ customers: normalized })
  } catch (error) {
    console.error("Get customers error:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business.id) {
      return NextResponse.json({ error: "Unauthorized 5" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = customerSchema.parse(body)

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        ...validatedData,
        business_id: user.business.id,
      })
      .select('id, name, email, location, age, relationship_type, created_at')
      .single()

    if (error) throw error

    const normalized = {
      id: customer.id,
      name: customer.name,
      email: customer.email,
      location: customer.location,
      age: customer.age,
      relationship_type: customer.relationship_type || 'customer',
      createdAt: customer.created_at,
      responses: [],
    }

    return NextResponse.json({ customer: normalized })
  } catch (error) {
    console.error("Create customer error:", error)
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}
