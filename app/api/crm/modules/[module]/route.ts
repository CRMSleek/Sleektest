import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import {
  automationRuleSchema,
  createModuleRow,
  listModuleRows,
  reportSchema,
} from "@/lib/crm-platform"

type RouteContext = { params: Promise<{ module: string }> }

const MODULE_TABLES: Record<string, { table: string; schema?: any; select?: string }> = {
  automations: { table: "crm_automation_rules", schema: automationRuleSchema },
  automationRuns: { table: "crm_automation_runs" },
  reports: { table: "crm_reports", schema: reportSchema },
  dashboards: { table: "crm_dashboards" },
  donations: { table: "crm_donations" },
  campaigns: { table: "crm_campaigns" },
  funds: { table: "crm_funds" },
  pledges: { table: "crm_pledges" },
  events: { table: "crm_events" },
  eventRegistrations: { table: "crm_event_registrations" },
  templates: { table: "crm_communication_templates" },
  forms: { table: "crm_public_forms" },
  approvals: { table: "crm_ai_action_approvals" },
  suppressions: { table: "crm_suppression_list" },
  usage: { table: "crm_usage_events" },
}

function getModuleConfig(module: string) {
  const config = MODULE_TABLES[module]
  if (!config) throw new Error("Unsupported CRM module")
  return config
}

export async function GET(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { module } = await context.params
    const config = getModuleConfig(module)
    return NextResponse.json({ rows: await listModuleRows(user, config.table, config.select || "*") })
  } catch (error: any) {
    console.error("List CRM module error:", error)
    return NextResponse.json({ error: error?.message || "Failed to load module" }, { status: 400 })
  }
}

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const user = await getCurrentUser(request)
    if (!user?.business?.id) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    const { module } = await context.params
    const config = getModuleConfig(module)
    const body = await request.json()
    const parsed = config.schema ? config.schema.parse(body) : body
    return NextResponse.json({ row: await createModuleRow(user, config.table, parsed, request) })
  } catch (error: any) {
    console.error("Create CRM module row error:", error)
    return NextResponse.json({ error: error?.message || "Failed to create module row" }, { status: 400 })
  }
}
