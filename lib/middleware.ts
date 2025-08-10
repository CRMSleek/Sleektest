import type { NextRequest } from "next/server"
import { verifyToken } from "./auth"
import { prisma } from "./prisma"

export async function getAuthenticatedUser(request: NextRequest) {
  const token = request.cookies.get("auth-token")?.value

  if (!token) {
    return null
  }

  const payload = await verifyToken(token)
  if (!payload) return null

  const user = await prisma.user.findUnique({
    where: { id: payload.userId },
    include: { business: true },
  })

  return user
}

export function createAuthResponse(error: string, status = 401) {
  return Response.json({ error }, { status })
}