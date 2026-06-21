import * as jose from "jose"

const JWT_SECRET = process.env.JWT_SECRET

function getJwtSecret() {
  if (!JWT_SECRET) {
    throw new Error("JWT_SECRET is required")
  }
  return new TextEncoder().encode(JWT_SECRET)
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
