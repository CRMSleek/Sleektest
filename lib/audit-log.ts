import "server-only"

import type { NextRequest } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/supabase/server"

type AuditInput = {
  actorUserId: string
  businessId?: string | null
  action: string
  tableName?: string | null
  rowId?: string | null
  metadata?: Record<string, string | number | boolean | null>
  request?: NextRequest
}

export async function writeAuditLog(input: AuditInput) {
  try {
    await supabase.from("audit_logs").insert({
      actor_user_id: input.actorUserId,
      business_id: input.businessId ?? null,
      action: input.action,
      table_name: input.tableName ?? null,
      row_id: input.rowId ?? null,
      ip_address: input.request?.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ?? null,
      user_agent: input.request?.headers.get("user-agent") ?? null,
      metadata: input.metadata ?? {},
    })
  } catch (error) {
    console.error("Audit log write failed:", error)
  }
}
