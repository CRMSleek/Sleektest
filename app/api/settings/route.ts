import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { verifyPassword, hashPassword, getCurrentUser } from "@/lib/supabase/auth"

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

    const { error } = await supabase
      .from('users')
      .update({
        password: await hashPassword(newPassword),
      })
      .eq('id', user.id)

    if (error) throw error

    return NextResponse.json({
      status: "success",
    }, { status: 200 })

  } catch (error) {
    console.error("Password Change error:", error)
    return NextResponse.json({ error: "Failed to change password" }, { status: 500 })
  }
}