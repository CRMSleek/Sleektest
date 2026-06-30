export function normalizeEmail(value: unknown) {
  return typeof value === "string" ? value.trim().toLowerCase() : ""
}

export function normalizePhone(value: unknown) {
  if (typeof value !== "string") return ""
  const digits = value.replace(/\D/g, "")
  if (digits.length === 11 && digits.startsWith("1")) return digits.slice(1)
  return digits
}

export function normalizeDuplicateKey(values: Record<string, any>) {
  const email = normalizeEmail(values.email)
  const phone = normalizePhone(values.phone)
  const name = typeof values.name === "string" ? values.name.trim().toLowerCase().replace(/\s+/g, "") : ""
  return email || phone || name || null
}
