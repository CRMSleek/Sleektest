import { type NextRequest, NextResponse } from "next/server"
import { verifyPassword, generateToken, findUserByEmail } from "@/lib/supabase/auth"

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = await findUserByEmail(email)

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = await generateToken(user.id)

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        business: user.business,
      },
    })

    response.cookies.set("auth-token", token, {
      httpOnly: true,
      secure: false,
      sameSite: "lax",
      maxAge: 60 * 60 * 24 * 7, // 7 days
    })

    return response
  } catch (error) {
    console.error("Login error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
