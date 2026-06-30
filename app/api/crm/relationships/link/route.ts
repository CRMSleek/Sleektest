import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { linkRelationshipForUser } from "@/lib/crm-platform"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const body = await request.json()
    return NextResponse.json({ result: await linkRelationshipForUser(user, body) })
  } catch (error: any) {
    console.error("Link relationship error:", error)
    return NextResponse.json({ error: error?.message || "Failed to link relationship" }, { status: 400 })
  }
}
