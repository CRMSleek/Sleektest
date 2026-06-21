import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { getRecord, updateRecord } from "@/lib/crm-platform"

type RouteContext = { params: Promise<{ id: string }> }

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await context.params
    return NextResponse.json(await getRecord(user, id))
  } catch (error) {
    console.error("Get record error:", error)
    return NextResponse.json({ error: "Record not found" }, { status: 404 })
  }
}

export async function PUT(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { id } = await context.params
    return NextResponse.json({ record: await updateRecord(user, id, await request.json(), request) })
  } catch (error: any) {
    console.error("Update record error:", error)
    return NextResponse.json({ error: error?.message || "Failed to update record" }, { status: 400 })
  }
}
