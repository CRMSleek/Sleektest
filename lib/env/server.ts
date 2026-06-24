import "server-only"

function readServerEnv(name: string) {
  const value = process.env[name]
  if (typeof value !== "string") return undefined
  const normalized = normalizeEnvValue(value)
  return normalized || undefined
}

function normalizeEnvValue(value: string) {
  const trimmed = value.trim()
  const unquoted =
    (trimmed.startsWith('"') && trimmed.endsWith('"')) ||
    (trimmed.startsWith("'") && trimmed.endsWith("'"))
      ? trimmed.slice(1, -1)
      : trimmed
  return unquoted.replace(/\s+/g, "")
}

function parseJwtPayload(value: string) {
  const parts = value.split(".")
  if (parts.length !== 3 || parts.some((part) => !part)) return null

  try {
    const base64 = parts[1].replace(/-/g, "+").replace(/_/g, "/")
    const padded = base64.padEnd(Math.ceil(base64.length / 4) * 4, "=")
    return JSON.parse(Buffer.from(padded, "base64").toString("utf8")) as Record<string, unknown>
  } catch {
    return null
  }
}

function getRequiredSupabaseJwt(name: string, expectedRole: string) {
  const value = getRequiredServerEnv(name)
  const payload = parseJwtPayload(value)
  if (!payload) {
    throw new Error(`${name} must be a valid Supabase JWT. Re-copy it from Supabase Project Settings -> API.`)
  }
  if (payload.role !== expectedRole) {
    throw new Error(`${name} must have Supabase role "${expectedRole}". Current key has role "${String(payload.role || "unknown")}".`)
  }
  return value
}

export function getOptionalServerEnv(name: string) {
  return readServerEnv(name)
}

export function getRequiredServerEnv(name: string) {
  const value = readServerEnv(name)
  if (!value) {
    throw new Error(`Missing required server environment variable: ${name}`)
  }
  return value
}

export function getAuthSecret() {
  const value = readServerEnv("AUTH_SECRET") || readServerEnv("NEXTAUTH_SECRET") || readServerEnv("JWT_SECRET")
  if (!value) {
    throw new Error("Missing auth secret. Set AUTH_SECRET or NEXTAUTH_SECRET in Vercel Production.")
  }
  return value
}

export function getGoogleOAuthConfig() {
  const clientId = readServerEnv("GOOGLE_CLIENT_ID")
  const clientSecret = readServerEnv("GOOGLE_CLIENT_SECRET")

  if (!clientId && !clientSecret) return null
  if (!clientId || !clientSecret) {
    throw new Error("Google OAuth requires both GOOGLE_CLIENT_ID and GOOGLE_CLIENT_SECRET")
  }

  return { clientId, clientSecret }
}

export function getSupabaseServerConfig() {
  return {
    supabaseUrl: getRequiredServerEnv("NEXT_PUBLIC_SUPABASE_URL"),
    serviceRoleKey: getRequiredSupabaseJwt("SUPABASE_SERVICE_ROLE_KEY", "service_role"),
  }
}
