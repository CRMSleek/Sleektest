import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createEngagement, listEngagements } from "@/lib/crm-platform"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ engagements: await listEngagements(user, new URL(request.url).searchParams) })
  } catch (error) {
    console.error("List engagements error:", error)
    return NextResponse.json({ error: "Failed to load engagement events" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ engagement: await createEngagement(user, await request.json(), request) })
  } catch (error: any) {
    console.error("Create engagement error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create engagement event" }, { status: 400 })
  }
}
