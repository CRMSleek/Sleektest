import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { supabaseAdmin as supabase } from "@/lib/supabase/server"
import { requireBusiness } from "@/lib/crm-platform"
import { writeAuditLog } from "@/lib/audit-log"

type RouteContext = { params: Promise<{ id: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const businessId = requireBusiness(user)
    const { id } = await context.params
    const { data, error } = await supabase
      .from("crm_integration_configs")
      .update({
        last_tested_at: new Date().toISOString(),
        last_test_status: "scaffolded",
        last_error: null,
        updated_at: new Date().toISOString(),
      })
      .eq("business_id", businessId)
      .eq("id", id)
      .select()
      .single()
    if (error) throw error
    await writeAuditLog({
      actorUserId: user.id,
      businessId,
      action: "crm_integration_config.tested",
      tableName: "crm_integration_configs",
      rowId: id,
      metadata: { status: "scaffolded" },
      request,
    })
    return NextResponse.json({
      integration: data,
      result: {
        ok: true,
        status: "scaffolded",
        message: "Provider abstraction is configured. Live credential test is pending provider credentials.",
      },
    })
  } catch (error: any) {
    console.error("Test integration error:", error)
    return NextResponse.json({ error: error?.message || "Failed to test integration" }, { status: 400 })
  }
}
