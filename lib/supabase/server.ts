import "server-only"

import { createClient } from "@supabase/supabase-js"
import { getSupabaseServerConfig } from "@/lib/env/server"

type SupabaseAdminClient = ReturnType<typeof createClient<any, "public", any>>

let cachedAdminClient: SupabaseAdminClient | null = null

function getSupabaseAdminClient(): SupabaseAdminClient {
  if (!cachedAdminClient) {
    const { supabaseUrl, serviceRoleKey } = getSupabaseServerConfig()
    cachedAdminClient = createClient<any, "public", any>(supabaseUrl, serviceRoleKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false,
      },
    })
  }
  return cachedAdminClient
}

export const supabaseAdmin = new Proxy({} as SupabaseAdminClient, {
  get(_target, prop, receiver) {
    return Reflect.get(getSupabaseAdminClient(), prop, receiver)
  },
})
