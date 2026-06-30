import { normalizeDuplicateKey, normalizeEmail, normalizePhone } from "@/lib/crm-normalization"

export type RelationshipLinkInput = {
  businessId: string
  userId?: string | null
  explicitRecordId?: string | null
  providerKey?: string | null
  externalObjectType?: string | null
  externalObjectId?: string | null
  email?: string | null
  phone?: string | null
  name?: string | null
  relationshipType?: string | null
  sourceType: string
  sourceId: string
  subject?: string | null
  body?: string | null
  metadata?: Record<string, any>
}

export type RelationshipLinkResult = {
  status: "linked" | "suggested"
  recordId: string | null
  suggestionId?: string
  reason: string
  activityId?: string
  externalLinkId?: string
}

export type RelationshipLinkerStore = {
  getRecordById(input: { businessId: string; id: string }): Promise<any | null>
  getRecordByExternalLink(input: {
    businessId: string
    providerKey: string
    externalObjectType: string
    externalObjectId: string
  }): Promise<any | null>
  findRecordsByDuplicateKey(input: { businessId: string; duplicateKey: string }): Promise<any[]>
  createRelationship(input: RelationshipLinkInput & { duplicateKey: string | null; values: Record<string, any> }): Promise<any>
  createDuplicateSuggestion(input: RelationshipLinkInput & { duplicateKey: string | null; candidateIds: string[] }): Promise<any>
  upsertExternalLink(input: {
    businessId: string
    recordId: string
    providerKey: string
    externalObjectType: string
    externalObjectId: string
    metadata?: Record<string, any>
  }): Promise<any>
  createActivity(input: RelationshipLinkInput & { recordId: string | null; status: string }): Promise<any>
  writeAudit(input: {
    businessId: string
    userId?: string | null
    action: string
    tableName?: string
    rowId?: string | null
    metadata?: Record<string, any>
  }): Promise<void>
}

function valuesFromInput(input: RelationshipLinkInput) {
  return {
    name: input.name || input.email || input.phone || "Pending relationship",
    email: normalizeEmail(input.email),
    phone: normalizePhone(input.phone),
    relationship_type: input.relationshipType || "other",
  }
}

export async function linkRelationship(store: RelationshipLinkerStore, input: RelationshipLinkInput): Promise<RelationshipLinkResult> {
  const providerKey = input.providerKey || null
  const externalObjectType = input.externalObjectType || input.sourceType
  const externalObjectId = input.externalObjectId || input.sourceId

  let record: any | null = null
  let reason = ""

  if (input.explicitRecordId) {
    record = await store.getRecordById({ businessId: input.businessId, id: input.explicitRecordId })
    if (!record) throw new Error("Explicit relationship id was not found")
    reason = "explicit_relationship_id"
  }

  if (!record && providerKey && externalObjectType && externalObjectId) {
    record = await store.getRecordByExternalLink({
      businessId: input.businessId,
      providerKey,
      externalObjectType,
      externalObjectId,
    })
    if (record) reason = "external_link"
  }

  const values = valuesFromInput(input)
  const duplicateKey = normalizeDuplicateKey(values)

  if (!record && duplicateKey) {
    const candidates = await store.findRecordsByDuplicateKey({ businessId: input.businessId, duplicateKey })
    if (candidates.length === 1) {
      record = candidates[0]
      reason = "duplicate_key"
    } else if (candidates.length > 1) {
      const suggestion = await store.createDuplicateSuggestion({
        ...input,
        duplicateKey,
        candidateIds: candidates.map((candidate) => candidate.id),
      })
      const activity = await store.createActivity({ ...input, recordId: null, status: "needs_review" })
      await store.writeAudit({
        businessId: input.businessId,
        userId: input.userId,
        action: "relationship_link.suggested",
        tableName: "crm_duplicate_sets",
        rowId: suggestion.id,
        metadata: { duplicateKey, candidateIds: candidates.map((candidate) => candidate.id) },
      })
      return {
        status: "suggested",
        recordId: null,
        suggestionId: suggestion.id,
        reason: "ambiguous_duplicate_key",
        activityId: activity?.id,
      }
    }
  }

  if (!record) {
    record = await store.createRelationship({ ...input, duplicateKey, values })
    reason = "created_relationship"
  }

  let externalLink: any | null = null
  if (providerKey && externalObjectType && externalObjectId) {
    externalLink = await store.upsertExternalLink({
      businessId: input.businessId,
      recordId: record.id,
      providerKey,
      externalObjectType,
      externalObjectId,
      metadata: input.metadata,
    })
  }

  const activity = await store.createActivity({ ...input, recordId: record.id, status: "linked" })
  await store.writeAudit({
    businessId: input.businessId,
    userId: input.userId,
    action: "relationship_link.linked",
    tableName: "crm_records",
    rowId: record.id,
    metadata: { reason, sourceType: input.sourceType, sourceId: input.sourceId },
  })

  return {
    status: "linked",
    recordId: record.id,
    reason,
    activityId: activity?.id,
    externalLinkId: externalLink?.id,
  }
}
