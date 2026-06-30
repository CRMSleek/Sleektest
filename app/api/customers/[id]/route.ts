import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { customerSchema } from "@/lib/validations"
import { getCustomerCompatibleRelationship, updateCustomerCompatibleRelationship } from "@/lib/crm-platform"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    const customer = await getCustomerCompatibleRelationship(user, id)

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error("Get customer error", error)
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = customerSchema.partial().parse(body)
    const { id } = await context.params

    const customer = await updateCustomerCompatibleRelationship(user, id, validatedData, request)

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error("Update customer error:", error)
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const { id } = await context.params

    return NextResponse.json({ error: "Relationship deletion requires the canonical merge/delete workflow" }, { status: 409 })
  } catch (error) {
    console.error("Delete customer error:", error)
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 })
  }
}
