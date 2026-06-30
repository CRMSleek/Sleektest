import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { createTask } from "@/lib/crm-platform"
import { taskSchema } from "@/lib/crm-module-schemas"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    return NextResponse.json({ task: await createTask(user, taskSchema.parse(await request.json()), request) })
  } catch (error: any) {
    console.error("Create task error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create task" }, { status: 400 })
  }
}
