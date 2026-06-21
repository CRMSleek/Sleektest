import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createRecord, listRecords } from "@/lib/crm-platform"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json(await listRecords(user, new URL(request.url).searchParams))
  } catch (error) {
    console.error("List records error:", error)
    return NextResponse.json({ error: "Failed to load records" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ record: await createRecord(user, await request.json(), request) })
  } catch (error: any) {
    console.error("Create record error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create record" }, { status: 400 })
  }
}
