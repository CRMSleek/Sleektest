import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { listActivities } from "@/lib/crm-platform"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json(await listActivities(user, new URL(request.url).searchParams))
  } catch (error: any) {
    console.error("List activities error:", error)
    return NextResponse.json({ error: error?.message || "Failed to load activities" }, { status: 500 })
  }
}
