import "server-only"

import { createClient } from "@supabase/supabase-js"
import { getSupabaseServerConfig } from "@/lib/env/server"

const { supabaseUrl, serviceRoleKey } = getSupabaseServerConfig()

export const supabaseAdmin = createClient(supabaseUrl, serviceRoleKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
})
