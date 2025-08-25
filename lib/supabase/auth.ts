import * as jose from "jose"
import bcrypt from "bcryptjs"
import type { NextRequest } from "next/server"
import { supabase } from "./client"

const JWT_SECRET = process.env.JWT_SECRET || "fallback-secret-key"

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12)
}

export async function verifyPassword(password: string, hashedPassword: string): Promise<boolean> {
  return bcrypt.compare(password, hashedPassword)
}

export async function generateToken(userId: string): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  return await new jose.SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret)
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)
    return payload as { userId: string }
  } catch (error) {
    console.log("verifyToken - Verification failed:", error)
    return null
  }
}

export async function getCurrentUser(request: NextRequest) {
  try {
    const token = request.cookies.get("auth-token")?.value
    if (!token) return null

    const payload = await verifyToken(token)
    if (!payload) return null

    const { data: user, error } = await supabase
      .from('users')
      .select(`
        *,
        businesses (*)
      `)
      .eq('id', payload.userId)
      .single()

    if (error || !user) return null

    return {
      ...user,
      business: user.businesses?.[0] || null
    }
  } catch {
    return null
  }
}

export async function createUser(userData: {
  email: string
  password: string
  name?: string
}) {
  const hashedPassword = await hashPassword(userData.password)
  
  const { data: user, error } = await supabase
    .from('users')
    .insert({
      email: userData.email.toLowerCase(),
      password: hashedPassword,
      name: userData.name
    })
    .select()
    .single()

  if (error) throw error
  return user
}

export async function findUserByEmail(email: string) {
  const { data: user, error } = await supabase
    .from('users')
    .select(`
      *,
      businesses (*)
    `)
    .eq('email', email.toLowerCase())
    .single()

  if (error) return null
  return {
    ...user,
    business: user.businesses?.[0] || null
  }
}
