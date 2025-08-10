import * as jose from "jose"
import bcrypt from "bcryptjs"
import type { NextRequest } from "next/server"
import { prisma } from "./prisma"

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
    console.log("verifyToken - JWT_SECRET available:", !!JWT_SECRET)
    console.log("verifyToken - JWT_SECRET value:", JWT_SECRET ? JWT_SECRET.substring(0, 10) + "..." : "undefined")
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)
    console.log("verifyToken - Verification successful:", payload)
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

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      include: { business: true },
    })

    return user
  } catch {
    return null
  }
}