import { describe, expect, it } from "vitest"
import { linkRelationship, type RelationshipLinkerStore } from "../lib/relationship-linker"

function store(seed: { records?: any[]; links?: any[] } = {}) {
  const records = [...(seed.records || [])]
  const links = [...(seed.links || [])]
  const activities: any[] = []
  const suggestions: any[] = []

  const api: RelationshipLinkerStore & { records: any[]; links: any[]; activities: any[]; suggestions: any[] } = {
    records,
    links,
    activities,
    suggestions,
    async getRecordById({ id }) {
      return records.find((record) => record.id === id) || null
    },
    async getRecordByExternalLink({ providerKey, externalObjectType, externalObjectId }) {
      const link = links.find(
        (item) =>
          item.providerKey === providerKey &&
          item.externalObjectType === externalObjectType &&
          item.externalObjectId === externalObjectId,
      )
      return link ? records.find((record) => record.id === link.recordId) || null : null
    },
    async findRecordsByDuplicateKey({ duplicateKey }) {
      return records.filter((record) => record.duplicateKey === duplicateKey)
    },
    async createRelationship(input) {
      const record = { id: `record-${records.length + 1}`, duplicateKey: input.duplicateKey, values: input.values }
      records.push(record)
      return record
    },
    async createDuplicateSuggestion(input) {
      const suggestion = { id: `suggestion-${suggestions.length + 1}`, candidateIds: input.candidateIds }
      suggestions.push(suggestion)
      return suggestion
    },
    async upsertExternalLink(input) {
      const existing = links.find(
        (item) =>
          item.providerKey === input.providerKey &&
          item.externalObjectType === input.externalObjectType &&
          item.externalObjectId === input.externalObjectId,
      )
      if (existing) return existing
      const link = { id: `link-${links.length + 1}`, ...input }
      links.push(link)
      return link
    },
    async createActivity(input) {
      const activity = { id: `activity-${activities.length + 1}`, recordId: input.recordId, status: input.status }
      activities.push(activity)
      return activity
    },
    async writeAudit() {},
  }

  return api
}

const base = {
  businessId: "business-1",
  userId: "user-1",
  sourceType: "email",
  sourceId: "message-1",
}

describe("RelationshipLinker", () => {
  it("matches one existing relationship by normalized email", async () => {
    const db = store({ records: [{ id: "person-1", duplicateKey: "ada@example.com" }] })
    const result = await linkRelationship(db, { ...base, email: " ADA@example.com " })

    expect(result).toMatchObject({ status: "linked", recordId: "person-1", reason: "duplicate_key" })
    expect(db.records).toHaveLength(1)
  })

  it("creates a pending relationship when no match exists", async () => {
    const db = store()
    const result = await linkRelationship(db, { ...base, email: "new@example.com", name: "New Person" })

    expect(result.status).toBe("linked")
    expect(result.reason).toBe("created_relationship")
    expect(db.records[0].values.relationship_type).toBe("other")
  })

  it("creates a suggestion instead of silently attaching ambiguous duplicates", async () => {
    const db = store({
      records: [
        { id: "person-1", duplicateKey: "same@example.com" },
        { id: "person-2", duplicateKey: "same@example.com" },
      ],
    })

    const result = await linkRelationship(db, { ...base, email: "same@example.com" })

    expect(result).toMatchObject({ status: "suggested", recordId: null, reason: "ambiguous_duplicate_key" })
    expect(db.suggestions[0].candidateIds).toEqual(["person-1", "person-2"])
  })

  it("keeps external link imports idempotent", async () => {
    const db = store()
    const input = {
      ...base,
      providerKey: "mailchimp",
      externalObjectType: "subscriber",
      externalObjectId: "sub-1",
      email: "linked@example.com",
    }

    await linkRelationship(db, input)
    await linkRelationship(db, input)

    expect(db.links).toHaveLength(1)
    expect(db.records).toHaveLength(1)
  })
})
