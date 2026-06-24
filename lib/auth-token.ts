import * as jose from "jose"

function getAuthSecret() {
  const value = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || process.env.JWT_SECRET
  if (!value) {
    throw new Error("Missing auth secret. Set AUTH_SECRET or NEXTAUTH_SECRET in Vercel Production.")
  }
  return value
}

function getJwtSecret() {
  return new TextEncoder().encode(getAuthSecret())
}

export const authCookieOptions = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  maxAge: 60 * 60 * 24 * 7,
}

export async function generateToken(userId: string): Promise<string> {
  const secret = getJwtSecret()
  return await new jose.SignJWT({ userId })
    .setProtectedHeader({ alg: "HS256" })
    .setExpirationTime("7d")
    .sign(secret)
}

export async function verifyToken(token: string): Promise<{ userId: string } | null> {
  try {
    const secret = getJwtSecret()
    const { payload } = await jose.jwtVerify(token, secret)
    return payload as { userId: string }
  } catch {
    return null
  }
}
