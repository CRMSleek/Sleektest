const publicEnv = {
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
}

function readPublicEnv(name: keyof typeof publicEnv) {
  const value = publicEnv[name]
  return typeof value === "string" && value.trim() ? value.trim() : undefined
}

export function getSupabaseBrowserConfig() {
  const supabaseUrl = readPublicEnv("NEXT_PUBLIC_SUPABASE_URL")
  const supabaseAnonKey = readPublicEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY")

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Missing Supabase browser environment. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY in Vercel, then redeploy.",
    )
  }

  return { supabaseUrl, supabaseAnonKey }
}
