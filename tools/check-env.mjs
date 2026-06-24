import { existsSync, readFileSync } from "node:fs"
import { resolve } from "node:path"

const envFiles = [".env.local", ".env"]

function unquote(value) {
  const trimmed = value.trim()
  if (
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
  ) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}

for (const file of envFiles) {
  const path = resolve(process.cwd(), file)
  if (!existsSync(path)) continue
  const lines = readFileSync(path, "utf8").split(/\r?\n/)
  for (const line of lines) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith("#")) continue
    const match = trimmed.match(/^([A-Za-z_][A-Za-z0-9_]*)=(.*)$/)
    if (!match) continue
    const [, key, raw] = match
    if (process.env[key] == null) process.env[key] = unquote(raw)
  }
}

const required = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_ANON_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
]

const requiredAny = [["AUTH_SECRET", "NEXTAUTH_SECRET", "JWT_SECRET"]]
const optionalPairs = [
  ["GOOGLE_CLIENT_ID", "GOOGLE_CLIENT_SECRET"],
]

const optional = [
  "OPENROUTER_KEY",
  "OPENROUTER_MODEL",
  "OPENAI_API_KEY",
  "HF_API_TOKEN",
  "EMAIL_ADDRESS",
  "APP_PASSWORD",
  "DEFAULT_IMAP_HOST",
  "DEFAULT_IMAP_PORT",
  "COMPLIANCE_ENCRYPTION_KEY",
]

const missing = required.filter((key) => !process.env[key])

for (const group of requiredAny) {
  if (!group.some((key) => process.env[key])) {
    missing.push(group.join(" or "))
  }
}

const warnings = []
for (const [left, right] of optionalPairs) {
  if (Boolean(process.env[left]) !== Boolean(process.env[right])) {
    warnings.push(`${left} and ${right} must be set together; Google sign-in will fail with only one.`)
  }
}

if (process.env.JWT_SECRET && !process.env.AUTH_SECRET && !process.env.NEXTAUTH_SECRET) {
  warnings.push("JWT_SECRET works, but AUTH_SECRET is preferred for Vercel/Auth.js production deployments.")
}

if (process.env.COMPLIANCE_ENCRYPTION_KEY) {
  const raw = process.env.COMPLIANCE_ENCRYPTION_KEY
  const base64Length = Buffer.from(raw, "base64").length
  const utf8Length = Buffer.from(raw, "utf8").length
  if (base64Length !== 32 && utf8Length !== 32) {
    missing.push("COMPLIANCE_ENCRYPTION_KEY must be 32 bytes or base64-encoded 32 bytes when set")
  }
}

const configuredOptional = optional.filter((key) => process.env[key]).length

if (missing.length) {
  console.error("Environment check failed. Missing:")
  for (const key of missing) console.error(`- ${key}`)
  if (warnings.length) {
    console.warn("\nWarnings:")
    for (const warning of warnings) console.warn(`- ${warning}`)
  }
  process.exit(1)
}

console.log("Environment check passed.")
console.log(`Required groups ready. Optional configured: ${configuredOptional}/${optional.length}.`)
if (warnings.length) {
  console.warn("Warnings:")
  for (const warning of warnings) console.warn(`- ${warning}`)
}
