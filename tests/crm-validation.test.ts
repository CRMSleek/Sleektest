import { describe, expect, it } from "vitest"
import { normalizeDuplicateKey, normalizePhone } from "../lib/crm-normalization"
import { riskTierForAction, approvalStatusForRisk, proposedDiffForAction } from "../lib/crm-agent-risk"
import { externalLinkSchema, taskSchema } from "../lib/crm-module-schemas"

describe("CRM normalization and schemas", () => {
  it("normalizes duplicate keys by email before phone or name", () => {
    expect(normalizeDuplicateKey({ email: " Test@Example.com ", phone: "(312) 555-0199", name: "Test User" })).toBe(
      "test@example.com",
    )
    expect(normalizePhone("+1 (312) 555-0199")).toBe("3125550199")
  })

  it("validates writable module payloads", () => {
    expect(taskSchema.parse({ title: "Call donor", recordId: null }).status).toBe("open")
    expect(() => externalLinkSchema.parse({ recordId: "bad", providerKey: "x", externalObjectType: "y", externalObjectId: "z" })).toThrow()
  })

  it("classifies agent action risk and proposed diffs", () => {
    expect(riskTierForAction("send_email")).toBe("high")
    expect(riskTierForAction("create_task")).toBe("medium")
    expect(approvalStatusForRisk("low")).toBe("approved")
    expect(
      proposedDiffForAction({
        id: "p1",
        kind: "update_customer",
        title: "Update profile",
        status: "proposed",
        reasoning: "",
        evidence: [],
        payload: { updates: { relationship_type: "donor" } },
        createdAt: new Date().toISOString(),
      }),
    ).toEqual({ relationship_type: "donor" })
  })
})
