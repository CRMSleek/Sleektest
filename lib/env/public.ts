const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

function readPublicEnv(name: keyof typeof publicEnv) {
  const value = publicEnv[name]
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

function assertJwtLike(name: keyof typeof publicEnv, value: string) {
  const parts = value.split(".")
  if (parts.length !== 3 || parts.some((part) => !part)) {
    throw new Error(`${name} must be a valid Supabase JWT. Re-copy it from Supabase Project Settings -> API.`)
  }
}

export function getSupabaseBrowserConfig() {
  const supabaseUrl = readPublicEnv("NEXT_PUBLIC_SUPABASE_URL")
  const supabaseAnonKey = readPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase browser environment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy.",
    )
  }
  assertJwtLike("NEXT_PUBLIC_SUPABASE_ANON_KEY", supabaseAnonKey)

  return { supabaseUrl, supabaseAnonKey }
}
