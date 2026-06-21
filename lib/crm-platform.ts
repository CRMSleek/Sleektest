import "server-only"

import { z } from "zod"
import type { NextRequest } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/supabase/server"
import { writeAuditLog } from "@/lib/audit-log"

export const FIELD_TYPES = [
  "text",
  "number",
  "date",
  "boolean",
  "select",
  "multi_select",
  "email",
  "phone",
  "url",
  "currency",
  "long_text",
  "relationship",
] as const

export type CRMFieldType = (typeof FIELD_TYPES)[number]

export type CRMUserContext = {
  id: string
  email?: string | null
  name?: string | null
  business?: {
    id?: string | null
    name?: string | null
  } | null
}

export const objectTypeSchema = z.object({
  apiName: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers, and underscores"),
  label: z.string().min(1).max(80),
  pluralLabel: z.string().min(1).max(96),
  description: z.string().max(500).optional().default(""),
  module: z.string().min(1).max(40).optional().default("records"),
  icon: z.string().max(40).optional().nullable(),
  displayField: z.string().max(64).optional().default("name"),
})

export const fieldDefinitionSchema = z.object({
  apiName: z
    .string()
    .min(2)
    .max(48)
    .regex(/^[a-z][a-z0-9_]*$/, "Use lowercase letters, numbers, and underscores"),
  label: z.string().min(1).max(80),
  fieldType: z.enum(FIELD_TYPES),
  isRequired: z.boolean().optional().default(false),
  isUnique: z.boolean().optional().default(false),
  options: z.array(z.string().min(1).max(120)).optional().default([]),
  relationshipObjectTypeId: z.string().uuid().optional().nullable(),
  position: z.number().int().min(0).optional().default(0),
  helpText: z.string().max(280).optional().default(""),
})

export const recordSchema = z.object({
  objectTypeId: z.string().uuid(),
  displayName: z.string().max(240).optional(),
  values: z.record(z.any()).default({}),
  ownerUserId: z.string().uuid().optional().nullable(),
})

export const engagementSchema = z.object({
  recordId: z.string().uuid().optional().nullable(),
  customerId: z.string().uuid().optional().nullable(),
  eventType: z.string().min(1).max(80),
  subject: z.string().max(240).optional().default(""),
  body: z.string().max(4000).optional().default(""),
  occurredAt: z.string().datetime().optional(),
  sourceTable: z.string().max(80).optional().nullable(),
  sourceId: z.string().max(160).optional().nullable(),
  status: z.string().max(80).optional().nullable(),
  metadata: z.record(z.any()).optional().default({}),
})

export const automationRuleSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(800).optional().default(""),
  triggerType: z.enum([
    "record_created",
    "record_updated",
    "survey_submitted",
    "form_submitted",
    "email_received",
    "donation_created",
    "event_registration_created",
    "task_due",
    "manual",
  ]),
  triggerConfig: z.record(z.any()).optional().default({}),
  actions: z.array(z.record(z.any())).optional().default([]),
  requiresApproval: z.boolean().optional().default(true),
  isActive: z.boolean().optional().default(false),
})

export const reportSchema = z.object({
  name: z.string().min(1).max(160),
  description: z.string().max(800).optional().default(""),
  reportType: z.enum(["table", "chart", "kpi", "relational"]).optional().default("table"),
  definition: z.record(z.any()).optional().default({}),
  isShared: z.boolean().optional().default(false),
})

export const integrationConfigSchema = z.object({
  providerKey: z.string().min(2).max(80),
  providerType: z.string().min(2).max(80),
  displayName: z.string().min(1).max(120),
  status: z.enum(["not_configured", "configured", "enabled", "disabled", "error"]).optional().default("not_configured"),
  config: z.record(z.any()).optional().default({}),
})

export type IntegrationProvider = {
  key: string
  type: string
  name: string
  status: "available" | "scaffold"
  connectionMode: "internal" | "mcp" | "api" | "webhook"
  mcpPath?: string
  sourceUrl?: string
  serverSideSecrets: string[]
  capabilities: string[]
  agentActions: string[]
  notes: string
}

export const INTEGRATION_PROVIDER_REGISTRY: IntegrationProvider[] = [
  {
    key: "smtp_imap",
    type: "email_marketing",
    name: "Email Provider",
    status: "available",
    connectionMode: "internal",
    serverSideSecrets: ["SMTP credentials", "IMAP credentials", "OAuth refresh token"],
    capabilities: ["send_email", "receive_email", "track_sent", "track_replied"],
    agentActions: ["Draft replies", "Summarize threads", "Prepare follow-up emails"],
    notes: "Current email settings power basic SMTP/IMAP. Opens/clicks/bounces depend on future provider webhooks.",
  },
  {
    key: "mailchimp_transactional",
    type: "email_marketing",
    name: "Mailchimp Transactional",
    status: "scaffold",
    connectionMode: "mcp",
    mcpPath: "Mailchimp Transactional Messaging MCP",
    sourceUrl: "https://mailchimp.com/developer/transactional/guides/how-to-use-mailchimps-transactional-messaging-mcp/",
    serverSideSecrets: ["Mailchimp Transactional API key"],
    capabilities: ["send_email", "templates", "bounces", "opens", "clicks"],
    agentActions: ["Draft campaign follow-ups", "Prepare receipt emails", "Review delivery issues"],
    notes: "Prepared for tracked transactional email. Production messages require admin setup and approval.",
  },
  {
    key: "sms_provider",
    type: "sms",
    name: "SMS Provider",
    status: "scaffold",
    connectionMode: "api",
    serverSideSecrets: ["SMS API key", "SMS webhook signing secret"],
    capabilities: ["send_sms", "sms_templates", "consent", "suppression", "activity_log"],
    agentActions: ["Draft text follow-ups", "Check consent before sending", "Log message activity"],
    notes: "Provider abstraction only. No production SMS sent until a provider is configured server-side.",
  },
  {
    key: "donation_payment",
    type: "donation_payment",
    name: "Donation Payment Provider",
    status: "scaffold",
    connectionMode: "api",
    serverSideSecrets: ["Payment secret key", "Webhook signing secret"],
    capabilities: ["mock_donation", "payment_intent", "receipt_email", "recurring_gift_scaffold"],
    agentActions: ["Prepare receipt drafts", "Summarize giving history", "Create donor follow-up tasks"],
    notes: "Mock provider supports internal donation records. Production processing must be connected later.",
  },
  {
    key: "donorsearch",
    type: "wealth_research",
    name: "DonorSearch",
    status: "scaffold",
    connectionMode: "api",
    sourceUrl: "https://www.donorsearch.net/api-integrations/",
    serverSideSecrets: ["DonorSearch API key"],
    capabilities: ["donor_research", "wealth_screening", "prospect_notes", "review_queue"],
    agentActions: ["Prepare prospect research", "Flag follow-up opportunities", "Draft donor notes for review"],
    notes: "Prepared for donor research enrichment. Results must be reviewed before record updates.",
  },
  {
    key: "surveymonkey",
    type: "survey",
    name: "SurveyMonkey",
    status: "scaffold",
    connectionMode: "api",
    sourceUrl: "https://www.surveymonkey.com/apps/BKcduxPnkCN4NFCRokUYCw_3D_3D/details/",
    serverSideSecrets: ["Survey provider token"],
    capabilities: ["import_surveys", "sync_responses", "webhook_responses"],
    agentActions: ["Summarize survey responses", "Connect responses to relationships", "Suggest next actions"],
    notes: "Current native survey builder remains primary. External survey sync is provider-ready.",
  },
  {
    key: "google_calendar",
    type: "calendar",
    name: "Google Calendar",
    status: "scaffold",
    connectionMode: "mcp",
    mcpPath: "Google Workspace Calendar MCP",
    sourceUrl: "https://developers.google.com/workspace/calendar/api/guides/configure-mcp-server",
    serverSideSecrets: ["Calendar OAuth refresh token"],
    capabilities: ["event_sync", "meeting_activity", "attendee_sync"],
    agentActions: ["Prepare meeting follow-ups", "Draft event reminders", "Review upcoming meetings"],
    notes: "Internal events work without external sync. Calendar sync waits for provider credentials.",
  },
  {
    key: "quickbooks",
    type: "accounting",
    name: "QuickBooks Online",
    status: "scaffold",
    connectionMode: "mcp",
    mcpPath: "QuickBooks Online MCP",
    sourceUrl: "https://github.com/intuit/quickbooks-online-mcp-server",
    serverSideSecrets: ["Accounting OAuth refresh token"],
    capabilities: ["donation_export", "invoice_sync", "accounting_reconciliation"],
    agentActions: ["Prepare donation exports", "Compare gift and accounting records", "Draft reconciliation tasks"],
    notes: "No accounting data leaves SleekCRM until an admin configures a provider.",
  },
  {
    key: "zapier",
    type: "automation_connector",
    name: "Zapier",
    status: "scaffold",
    connectionMode: "mcp",
    mcpPath: "Zapier MCP",
    sourceUrl: "https://zapier.com/mcp",
    serverSideSecrets: ["Zapier connection token"],
    capabilities: ["app_actions", "workflow_handoff", "notifications", "task_creation"],
    agentActions: ["Prepare cross-app actions", "Draft workflow handoffs", "Route approved follow-ups"],
    notes: "Prepared for agent-approved actions across connected apps. Nothing runs until connected and approved.",
  },
  {
    key: "webhooks",
    type: "webhook",
    name: "Inbound Webhooks",
    status: "scaffold",
    connectionMode: "webhook",
    serverSideSecrets: ["Webhook signing secret"],
    capabilities: ["inbound_events", "automation_triggers", "integration_logs"],
    agentActions: ["Review incoming events", "Explain sync failures", "Suggest record updates"],
    notes: "Webhook event table exists. Provider-specific verification must be added per integration.",
  },
]

export function requireBusiness(user: CRMUserContext) {
  const businessId = user.business?.id
  if (!businessId) throw new Error("Business scope missing")
  return businessId
}

function toDbName(value: string) {
  return value.replace(/[A-Z]/g, (char) => `_${char.toLowerCase()}`)
}

function normalizeRecordValue(fieldType: CRMFieldType, value: unknown) {
  if (value == null || value === "") return null
  if (fieldType === "number" || fieldType === "currency") {
    const parsed = Number(value)
    if (!Number.isFinite(parsed)) throw new Error("Invalid number")
    return parsed
  }
  if (fieldType === "boolean") return Boolean(value)
  if (fieldType === "multi_select") return Array.isArray(value) ? value.map(String) : [String(value)]
  if (fieldType === "date") {
    const date = new Date(String(value))
    if (Number.isNaN(date.getTime())) throw new Error("Invalid date")
    return date.toISOString()
  }
  return String(value).trim()
}

function duplicateKeyFromValues(values: Record<string, any>) {
  const email = typeof values.email === "string" ? values.email.trim().toLowerCase() : ""
  const name = typeof values.name === "string" ? values.name.trim().toLowerCase().replace(/\s+/g, "") : ""
  const phone = typeof values.phone === "string" ? values.phone.replace(/[^\d+]/g, "") : ""
  return email || phone || name || null
}

export async function ensurePlatformDefaults(user: CRMUserContext) {
  const businessId = requireBusiness(user)
  const { error } = await supabase.rpc("ensure_default_crm_platform", {
    seed_business_id: businessId,
    seed_user_id: user.id,
  })
  if (error) throw error
}

export async function listObjectTypes(user: CRMUserContext) {
  await ensurePlatformDefaults(user)
  const businessId = requireBusiness(user)
  const { data, error } = await supabase
    .from("crm_object_types")
    .select("*, crm_field_definitions(*)")
    .eq("business_id", businessId)
    .eq("is_active", true)
    .order("module", { ascending: true })
    .order("label", { ascending: true })
  if (error) throw error
  return data || []
}

export async function createObjectType(user: CRMUserContext, input: unknown, request?: NextRequest) {
  const businessId = requireBusiness(user)
  const parsed = objectTypeSchema.parse(input)
  const { data, error } = await supabase
    .from("crm_object_types")
    .insert({
      business_id: businessId,
      api_name: parsed.apiName,
      label: parsed.label,
      plural_label: parsed.pluralLabel,
      description: parsed.description,
      module: parsed.module,
      icon: parsed.icon,
      display_field: parsed.displayField,
    })
    .select()
    .single()
  if (error) throw error

  await writeAuditLog({
    actorUserId: user.id,
    businessId,
    action: "crm_object_type.created",
    tableName: "crm_object_types",
    rowId: data.id,
    metadata: { apiName: parsed.apiName },
    request,
  })

  return data
}

export async function createFieldDefinition(user: CRMUserContext, objectTypeId: string, input: unknown, request?: NextRequest) {
  const businessId = requireBusiness(user)
  const parsed = fieldDefinitionSchema.parse(input)
  const { data, error } = await supabase
    .from("crm_field_definitions")
    .insert({
      business_id: businessId,
      object_type_id: objectTypeId,
      api_name: parsed.apiName,
      label: parsed.label,
      field_type: parsed.fieldType,
      is_required: parsed.isRequired,
      is_unique: parsed.isUnique,
      options: parsed.options,
      relationship_object_type_id: parsed.relationshipObjectTypeId,
      position: parsed.position,
      help_text: parsed.helpText,
    })
    .select()
    .single()
  if (error) throw error

  await writeAuditLog({
    actorUserId: user.id,
    businessId,
    action: "crm_field_definition.created",
    tableName: "crm_field_definitions",
    rowId: data.id,
    metadata: { objectTypeId, apiName: parsed.apiName },
    request,
  })

  return data
}

export async function getObjectTypeWithFields(user: CRMUserContext, objectTypeId: string) {
  const businessId = requireBusiness(user)
  const { data, error } = await supabase
    .from("crm_object_types")
    .select("*, crm_field_definitions(*)")
    .eq("business_id", businessId)
    .eq("id", objectTypeId)
    .single()
  if (error) throw error
  return data
}

async function validateRecordValues(user: CRMUserContext, objectTypeId: string, values: Record<string, any>) {
  const objectType = await getObjectTypeWithFields(user, objectTypeId)
  const fields = (objectType.crm_field_definitions || []) as Array<any>
  const normalized: Record<string, any> = {}

  for (const field of fields) {
    const apiName = field.api_name
    const raw = values[apiName]
    if (field.is_required && (raw == null || raw === "" || (Array.isArray(raw) && raw.length === 0))) {
      throw new Error(`${field.label} is required`)
    }
    if (raw != null && raw !== "") {
      normalized[apiName] = normalizeRecordValue(field.field_type, raw)
    }
  }

  for (const [key, value] of Object.entries(values)) {
    if (!(key in normalized) && !fields.some((field) => field.api_name === key)) {
      normalized[key] = value
    }
  }

  return { objectType, values: normalized }
}

export async function listRecords(user: CRMUserContext, params: URLSearchParams) {
  await ensurePlatformDefaults(user)
  const businessId = requireBusiness(user)
  const objectTypeId = params.get("objectTypeId")
  const search = params.get("search")?.trim()
  const page = Math.max(Number(params.get("page") || "1"), 1)
  const pageSize = Math.min(Math.max(Number(params.get("pageSize") || "25"), 1), 100)
  const from = (page - 1) * pageSize
  const to = from + pageSize - 1

  let query: any = supabase
    .from("crm_records")
    .select("*, crm_object_types(label, api_name, module)", { count: "exact" })
    .eq("business_id", businessId)
    .order("updated_at", { ascending: false })

  if (objectTypeId) query = query.eq("object_type_id", objectTypeId)
  if (search) query = query.ilike("display_name", `%${search.replace(/[%_]/g, "")}%`)

  const { data, error, count } = await query.range(from, to)
  if (error) throw error
  return { records: data || [], page, pageSize, count: count || 0 }
}

export async function createRecord(user: CRMUserContext, input: unknown, request?: NextRequest) {
  const businessId = requireBusiness(user)
  const parsed = recordSchema.parse(input)
  const { objectType, values } = await validateRecordValues(user, parsed.objectTypeId, parsed.values)
  const displayField = objectType.display_field || "name"
  const displayName = parsed.displayName || values[displayField] || values.name || values.title || "Untitled record"
  const duplicateKey = duplicateKeyFromValues(values)

  const { data, error } = await supabase
    .from("crm_records")
    .insert({
      business_id: businessId,
      object_type_id: parsed.objectTypeId,
      owner_user_id: parsed.ownerUserId || user.id,
      display_name: String(displayName),
      values,
      duplicate_key: duplicateKey,
      created_by: user.id,
      updated_by: user.id,
    })
    .select("*, crm_object_types(label, api_name, module)")
    .single()
  if (error) throw error

  await writeAuditLog({
    actorUserId: user.id,
    businessId,
    action: "crm_record.created",
    tableName: "crm_records",
    rowId: data.id,
    metadata: { objectType: objectType.api_name },
    request,
  })

  return data
}

export async function getRecord(user: CRMUserContext, id: string) {
  const businessId = requireBusiness(user)
  const [{ data: record, error }, { data: engagements }, { data: relationships }] = await Promise.all([
    supabase
      .from("crm_records")
      .select("*, crm_object_types(*, crm_field_definitions(*))")
      .eq("business_id", businessId)
      .eq("id", id)
      .single(),
    supabase
      .from("crm_engagement_events")
      .select("*")
      .eq("business_id", businessId)
      .eq("record_id", id)
      .order("occurred_at", { ascending: false })
      .limit(100),
    supabase
      .from("crm_record_relationships")
      .select("*, to_record:to_record_id(id, display_name), from_record:from_record_id(id, display_name)")
      .eq("business_id", businessId)
      .or(`from_record_id.eq.${id},to_record_id.eq.${id}`)
      .limit(100),
  ])
  if (error) throw error
  return { record, engagements: engagements || [], relationships: relationships || [] }
}

export async function updateRecord(user: CRMUserContext, id: string, input: unknown, request?: NextRequest) {
  const businessId = requireBusiness(user)
  const current = await getRecord(user, id)
  const objectTypeId = current.record.object_type_id
  const parsed = recordSchema.partial().parse(input)
  const rawValues = { ...(current.record.values || {}), ...(parsed.values || {}) }
  const { objectType, values } = await validateRecordValues(user, objectTypeId, rawValues)
  const displayField = objectType.display_field || "name"
  const displayName = parsed.displayName || values[displayField] || values.name || values.title || current.record.display_name

  const { data, error } = await supabase
    .from("crm_records")
    .update({
      display_name: String(displayName),
      values,
      duplicate_key: duplicateKeyFromValues(values),
      updated_by: user.id,
      updated_at: new Date().toISOString(),
    })
    .eq("business_id", businessId)
    .eq("id", id)
    .select("*, crm_object_types(label, api_name, module)")
    .single()
  if (error) throw error

  await writeAuditLog({
    actorUserId: user.id,
    businessId,
    action: "crm_record.updated",
    tableName: "crm_records",
    rowId: id,
    metadata: { objectType: objectType.api_name },
    request,
  })

  return data
}

export async function listEngagements(user: CRMUserContext, params: URLSearchParams) {
  const businessId = requireBusiness(user)
  const recordId = params.get("recordId")
  let query: any = supabase
    .from("crm_engagement_events")
    .select("*")
    .eq("business_id", businessId)
    .order("occurred_at", { ascending: false })
    .limit(200)
  if (recordId) query = query.eq("record_id", recordId)
  const { data, error } = await query
  if (error) throw error
  return data || []
}

export async function createEngagement(user: CRMUserContext, input: unknown, request?: NextRequest) {
  const businessId = requireBusiness(user)
  const parsed = engagementSchema.parse(input)
  const { data, error } = await supabase
    .from("crm_engagement_events")
    .insert({
      business_id: businessId,
      record_id: parsed.recordId,
      customer_id: parsed.customerId,
      actor_user_id: user.id,
      event_type: parsed.eventType,
      subject: parsed.subject,
      body: parsed.body,
      occurred_at: parsed.occurredAt || new Date().toISOString(),
      source_table: parsed.sourceTable,
      source_id: parsed.sourceId,
      status: parsed.status,
      metadata: parsed.metadata,
    })
    .select()
    .single()
  if (error) throw error

  await writeAuditLog({
    actorUserId: user.id,
    businessId,
    action: "crm_engagement.created",
    tableName: "crm_engagement_events",
    rowId: data.id,
    metadata: { eventType: parsed.eventType },
    request,
  })

  return data
}

export async function findDuplicates(user: CRMUserContext) {
  const businessId = requireBusiness(user)
  const { data, error } = await supabase
    .from("crm_records")
    .select("id, object_type_id, display_name, duplicate_key, values, updated_at")
    .eq("business_id", businessId)
    .not("duplicate_key", "is", null)
    .order("duplicate_key", { ascending: true })
  if (error) throw error

  const grouped = new Map<string, any[]>()
  for (const record of data || []) {
    const key = `${record.object_type_id}:${record.duplicate_key}`
    grouped.set(key, [...(grouped.get(key) || []), record])
  }

  return Array.from(grouped.entries())
    .map(([key, records]) => ({
      key,
      confidence: records.some((record) => record.values?.email) ? 0.96 : 0.72,
      records,
      status: "open",
    }))
    .filter((group) => group.records.length > 1)
}

export async function listModuleRows(user: CRMUserContext, table: string, select = "*") {
  const businessId = requireBusiness(user)
  const { data, error } = await supabase
    .from(table)
    .select(select)
    .eq("business_id", businessId)
    .order("created_at", { ascending: false })
    .limit(100)
  if (error) throw error
  return data || []
}

export async function createModuleRow(user: CRMUserContext, table: string, payload: Record<string, any>, request?: NextRequest) {
  const businessId = requireBusiness(user)
  const dbPayload = Object.fromEntries(Object.entries(payload).map(([key, value]) => [toDbName(key), value]))
  const { data, error } = await supabase
    .from(table)
    .insert({ ...dbPayload, business_id: businessId, user_id: table === "crm_reports" || table === "crm_dashboards" ? user.id : dbPayload.user_id })
    .select()
    .single()
  if (error) throw error
  await writeAuditLog({
    actorUserId: user.id,
    businessId,
    action: `${table}.created`,
    tableName: table,
    rowId: data.id,
    request,
  })
  return data
}

export async function getIntegrationSummary(user: CRMUserContext) {
  const businessId = requireBusiness(user)
  const { data, error } = await supabase
    .from("crm_integration_configs")
    .select("*")
    .eq("business_id", businessId)
    .order("provider_type", { ascending: true })
  if (error) throw error
  const configuredByKey = new Map((data || []).map((row: any) => [row.provider_key, row]))
  return INTEGRATION_PROVIDER_REGISTRY.map((provider) => ({
    ...provider,
    config: configuredByKey.get(provider.key) || null,
  }))
}

export async function upsertIntegrationConfig(user: CRMUserContext, input: unknown, request?: NextRequest) {
  const businessId = requireBusiness(user)
  const parsed = integrationConfigSchema.parse(input)
  const provider = INTEGRATION_PROVIDER_REGISTRY.find((item) => item.key === parsed.providerKey)
  const providerType = provider?.type || parsed.providerType
  const displayName = provider?.name || parsed.displayName
  const publicConfig = Object.fromEntries(
    Object.entries(parsed.config).filter(([key]) => !/secret|token|password|apiKey|key/i.test(key)),
  )

  const { data, error } = await supabase
    .from("crm_integration_configs")
    .upsert(
      {
        business_id: businessId,
        provider_key: parsed.providerKey,
        provider_type: providerType,
        display_name: displayName,
        status: parsed.status,
        config: publicConfig,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "business_id,provider_key" },
    )
    .select()
    .single()
  if (error) throw error

  await writeAuditLog({
    actorUserId: user.id,
    businessId,
    action: "crm_integration_config.upserted",
    tableName: "crm_integration_configs",
    rowId: data.id,
    metadata: { providerKey: parsed.providerKey },
    request,
  })

  return data
}

export async function buildPlatformSummary(user: CRMUserContext) {
  await ensurePlatformDefaults(user)
  const businessId = requireBusiness(user)
  const [
    objectTypes,
    recordCount,
    engagements,
    automations,
    reports,
    donations,
    events,
    integrations,
    duplicates,
    approvals,
  ] = await Promise.all([
    listObjectTypes(user),
    supabase.from("crm_records").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("crm_engagement_events").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("crm_automation_rules").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("crm_reports").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    supabase.from("crm_donations").select("amount").eq("business_id", businessId).limit(1000),
    supabase.from("crm_events").select("id", { count: "exact", head: true }).eq("business_id", businessId),
    getIntegrationSummary(user),
    findDuplicates(user),
    supabase.from("crm_ai_action_approvals").select("id", { count: "exact", head: true }).eq("business_id", businessId).eq("status", "pending"),
  ])

  return {
    objectTypes,
    metrics: {
      objectTypes: objectTypes.length,
      records: recordCount.count || 0,
      engagementEvents: engagements.count || 0,
      automations: automations.count || 0,
      reports: reports.count || 0,
      donationVolume: (donations.data || []).reduce((sum: number, row: any) => sum + Number(row.amount || 0), 0),
      events: events.count || 0,
      integrationsConfigured: integrations.filter((item: any) => item.config?.status === "enabled" || item.config?.status === "configured").length,
      duplicateGroups: duplicates.length,
      pendingAiApprovals: approvals.count || 0,
    },
    integrations,
    complianceReadiness: {
      label: "Compliance-readiness tools",
      note: "Administrative controls only. HIPAA/FERPA compliance also requires deployment, contracts, policies, and operations outside this codebase.",
    },
  }
}
