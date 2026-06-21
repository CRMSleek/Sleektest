import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { findDuplicates } from "@/lib/crm-platform"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ duplicateGroups: await findDuplicates(user) })
  } catch (error) {
    console.error("Find duplicates error:", error)
    return NextResponse.json({ error: "Failed to find duplicates" }, { status: 500 })
  }
}
