export type AgentRiskTier = "low" | "medium" | "high"
export type CRMActionKindForRisk =
  | "send_email"
  | "create_task"
  | "update_customer"
  | "create_report"
  | "create_survey"
  | "prepare_donor_research"
export type EvidenceItemForRisk = {
  recordType?: string
  recordId?: string
}
export type CRMActionProposalForRisk = {
  id?: string
  kind: CRMActionKindForRisk
  title: string
  status?: string
  reasoning?: string
  evidence?: EvidenceItemForRisk[]
  payload: Record<string, any>
  createdAt?: string
}

const LOW_RISK = new Set<CRMActionKindForRisk>(["create_report"])
const MEDIUM_RISK = new Set<CRMActionKindForRisk>(["create_task", "update_customer", "create_survey"])
const HIGH_RISK = new Set<CRMActionKindForRisk>(["send_email", "prepare_donor_research"])

export function riskTierForAction(kind: CRMActionKindForRisk): AgentRiskTier {
  if (HIGH_RISK.has(kind)) return "high"
  if (MEDIUM_RISK.has(kind)) return "medium"
  if (LOW_RISK.has(kind)) return "low"
  return "high"
}

export function approvalStatusForRisk(riskTier: AgentRiskTier) {
  return riskTier === "low" ? "approved" : "pending"
}

export function sourceActivityIdsFromEvidence(evidence: EvidenceItemForRisk[] = []) {
  const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return evidence
    .filter((item) => item.recordType === "analysis" || item.recordType === "email" || item.recordType === "crm_record")
    .map((item) => item.recordId)
    .filter((id): id is string => Boolean(id && uuidPattern.test(id)))
}

export function proposedDiffForAction(action: CRMActionProposalForRisk) {
  if (action.kind === "update_customer") return action.payload?.updates || {}
  if (action.kind === "create_task") return { create: "task", title: action.payload?.title || action.title }
  if (action.kind === "send_email") return { send: "email", subject: action.payload?.subject, to: action.payload?.to }
  return action.payload || {}
}
