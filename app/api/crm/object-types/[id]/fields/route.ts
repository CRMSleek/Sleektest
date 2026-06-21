import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createFieldDefinition, getObjectTypeWithFields } from "@/lib/crm-platform"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await context.params
    const objectType = await getObjectTypeWithFields(user, id)
    return NextResponse.json({ fields: objectType.crm_field_definitions || [] })
  } catch (error) {
    console.error("List fields error:", error)
    return NextResponse.json({ error: "Failed to load fields" }, { status: 500 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await context.params
    const field = await createFieldDefinition(user, id, await request.json(), request)
    return NextResponse.json({ field })
  } catch (error: any) {
    console.error("Create field error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create field" }, { status: 400 })
  }
}
