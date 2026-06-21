export const COMPLIANCE_MODES = ["standard", "hipaa", "ferpa", "hipaa_ferpa"] as const

export type ComplianceMode = (typeof COMPLIANCE_MODES)[number]

export function normalizeComplianceMode(value: unknown): ComplianceMode {
  return COMPLIANCE_MODES.includes(value as ComplianceMode) ? (value as ComplianceMode) : "standard"
}

export function isRegulatedMode(value: unknown) {
  return normalizeComplianceMode(value) !== "standard"
}

export function regulatedModeLabel(value: unknown) {
  switch (normalizeComplianceMode(value)) {
    case "hipaa":
      return "HIPAA"
    case "ferpa":
      return "FERPA"
    case "hipaa_ferpa":
      return "HIPAA + FERPA"
    default:
      return "Standard"
  }
}
