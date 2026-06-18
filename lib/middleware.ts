import type { NextRequest } from "next/server"
import { getCurrentUser } from "./supabase/auth"

export async function getAuthenticatedUser(request: NextRequest) {
  return getCurrentUser(request)
}

export function createAuthResponse(error: string, status = 401) {
  return Response.json({ error }, { status })
}
