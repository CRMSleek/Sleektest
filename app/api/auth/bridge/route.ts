import { NextResponse } from "next/server"
import { auth } from "@/auth"
import { supabase } from "@/lib/supabase/client"
import { generateToken } from "@/lib/supabase/auth"

export const runtime = "nodejs"

export async function GET(request: Request) {
  // Read the NextAuth session
  const session = await auth()
  if (!session?.user?.email) {
    return NextResponse.redirect(new URL("/login?error=oauth", request.url))
  }

  // Resolve to our internal user id
  const { data: user } = await supabase
    .from('users')
    .select('id')
    .eq('email', session.user.email.toLowerCase())
    .single()

  if (!user) {
    return NextResponse.redirect(new URL("/login?error=nouser", request.url))
  }

  // Issue our existing custom JWT cookie so the rest of the app keeps working
  const token = await generateToken(user.id)
  const res = NextResponse.redirect(new URL("/dashboard", request.url))
  res.cookies.set("auth-token", token, {
    httpOnly: true,
    secure: false,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7,
  })
  return res
}
