import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { getIntegrationSummary, upsertIntegrationConfig } from "@/lib/crm-platform"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ integrations: await getIntegrationSummary(user) })
  } catch (error) {
    console.error("List integrations error:", error)
    return NextResponse.json({ error: "Failed to load integrations" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ integration: await upsertIntegrationConfig(user, await request.json(), request) })
  } catch (error: any) {
    console.error("Save integration error:", error)
    return NextResponse.json({ error: error?.message || "Failed to save integration" }, { status: 400 })
  }
}
