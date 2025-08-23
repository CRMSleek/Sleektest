import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { verifyPassword, hashPassword } from "@/lib/auth"
import { getCurrentUser } from "@/lib/auth"
import bcrypt from "bcryptjs"

export async function POST(request: NextRequest) {
  try {
    const { currentPassword, newPassword, confirmPassword } = await request.json()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

  if (!verifyPassword(currentPassword, user.password)) {
      return NextResponse.json({ error: "Current password is incorrect" }, { status: 400 })
  }

    const updatedUser = await prisma.user.update({
      where: { id: user.id },
      data: {
        password: await hashPassword(newPassword),
      },
    })

    return NextResponse.json({
      status: "success",
    }, { status: 200 })

  } catch (error) {
    console.error("Password Change error:", error)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}