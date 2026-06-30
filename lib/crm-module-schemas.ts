import { z } from "zod"

const uuid = z.string().uuid()
const optionalUuid = uuid.optional().nullable()

export const relationshipTagSchema = z.object({
  recordId: uuid,
  tagId: uuid,
})

export const tagSchema = z.object({
  name: z.string().min(1).max(80),
  color: z.string().max(40).optional().default("slate"),
})

export const taskSchema = z.object({
  recordId: optionalUuid,
  title: z.string().min(1).max(180),
  description: z.string().max(4000).optional().default(""),
  status: z.enum(["open", "in_progress", "done", "blocked"]).optional().default("open"),
  priority: z.enum(["low", "medium", "high", "urgent"]).optional().default("medium"),
  dueAt: z.string().datetime().optional().nullable(),
})

export const activitySchema = z.object({
  recordId: optionalUuid,
  activityType: z.string().min(1).max(80),
  subject: z.string().max(240).optional().default(""),
  body: z.string().max(4000).optional().default(""),
  occurredAt: z.string().datetime().optional(),
  sourceType: z.string().max(80).optional().nullable(),
  sourceId: z.string().max(160).optional().nullable(),
  metadata: z.record(z.any()).optional().default({}),
})

export const externalAccountSchema = z.object({
  providerKey: z.string().min(2).max(80),
  providerType: z.string().min(2).max(80),
  displayName: z.string().min(1).max(120),
  status: z.enum(["not_configured", "configured", "enabled", "disabled", "error"]).optional().default("not_configured"),
  externalAccountId: z.string().max(180).optional().nullable(),
  metadata: z.record(z.any()).optional().default({}),
})

export const externalLinkSchema = z.object({
  recordId: uuid,
  externalAccountId: optionalUuid,
  providerKey: z.string().min(2).max(80),
  externalObjectType: z.string().min(1).max(80),
  externalObjectId: z.string().min(1).max(180),
  externalUrl: z.string().url().optional().nullable(),
  metadata: z.record(z.any()).optional().default({}),
})

export const invoiceSchema = z.object({
  recordId: optionalUuid,
  invoiceNumber: z.string().min(1).max(80),
  amount: z.number().nonnegative(),
  currency: z.string().length(3).optional().default("USD"),
  status: z.enum(["draft", "sent", "paid", "void", "overdue"]).optional().default("draft"),
  dueDate: z.string().date().optional().nullable(),
  metadata: z.record(z.any()).optional().default({}),
})

export const writableModuleSchemas = {
  activities: activitySchema,
  tasks: taskSchema,
  tags: tagSchema,
  relationship_tags: relationshipTagSchema,
  external_accounts: externalAccountSchema,
  external_links: externalLinkSchema,
  invoices: invoiceSchema,
}

export type WritableModuleName = keyof typeof writableModuleSchemas

export function validateWritableModulePayload(module: WritableModuleName, payload: unknown) {
  return writableModuleSchemas[module].parse(payload)
}
