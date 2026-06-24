import "server-only"

function readServerEnv(name: string) {
  const value = process.env[name]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
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
    serviceRoleKey: getRequiredServerEnv("SUPABASE_SERVICE_ROLE_KEY"),
  }
}
