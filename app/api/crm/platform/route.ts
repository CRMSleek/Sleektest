import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { buildPlatformSummary } from "@/lib/crm-platform"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json(await buildPlatformSummary(user))
  } catch (error) {
    console.error("Get CRM platform summary error:", error)
    return NextResponse.json({ error: "Failed to load CRM platform summary" }, { status: 500 })
  }
}
