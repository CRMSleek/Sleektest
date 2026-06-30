import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createTagForRelationship } from "@/lib/crm-platform"
import { z } from "zod"

const createRelationshipTagSchema = z.object({
  recordId: z.string().uuid(),
  name: z.string().min(1).max(80),
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const body = createRelationshipTagSchema.parse(await request.json())
    return NextResponse.json({ tag: await createTagForRelationship(user, body.recordId, body.name, request) })
  } catch (error: any) {
    console.error("Create relationship tag error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create tag" }, { status: 400 })
  }
}
