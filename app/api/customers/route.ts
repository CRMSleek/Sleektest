import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { customerSchema } from "@/lib/validations"
import { createCustomerCompatibleRelationship, listCustomerCompatibleRelationships } from "@/lib/crm-platform"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized 4" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""

    return NextResponse.json({ customers: await listCustomerCompatibleRelationships(user, search) })
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

    return NextResponse.json({ customer: await createCustomerCompatibleRelationship(user, validatedData, request) })
  } catch (error) {
    console.error("Create customer error:", error)
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}
