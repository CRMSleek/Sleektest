import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createFieldDefinition, createObjectType, listObjectTypes } from "@/lib/crm-platform"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ objectTypes: await listObjectTypes(user) })
  } catch (error) {
    console.error("List object types error:", error)
    return NextResponse.json({ error: "Failed to load object types" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const body = await request.json()
    const objectType = await createObjectType(user, body, request)
    if (Array.isArray(body.fields)) {
      for (const field of body.fields) {
        await createFieldDefinition(user, objectType.id, field, request)
      }
    }
    return NextResponse.json({ objectType })
  } catch (error: any) {
    console.error("Create object type error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create object type" }, { status: 400 })
  }
}
