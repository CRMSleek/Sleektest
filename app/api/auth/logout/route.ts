import { NextResponse } from "next/server"
import { authCookieOptions } from "@/lib/auth-token"

export async function POST() {
  const response = NextResponse.json({ success: true })

  response.cookies.set("auth-token", "", {
    ...authCookieOptions,
    maxAge: 0,
  })

  return response
}
