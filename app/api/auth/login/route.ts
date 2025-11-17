import { type NextRequest, NextResponse } from "next/server"
import { verifyPassword, generateToken, findUserByEmail } from "@/lib/supabase/auth"
import nodemailer from "nodemailer"


export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    const user = await findUserByEmail(email)
    
    if (!user) {
      return NextResponse.json({ error: "User does not exist, please sign up"}, { status: 401 })
    }

    if (user.google_id) {
      return NextResponse.json({ error: "This user was registered in using OAuth, please sign in using Google"}, { status: 401 })
    }

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ error: "Invalid credentials" }, { status: 401 })
    }

    const token = await generateToken(user.id)

    const transporter = nodemailer.createTransport({
      auth: {
        user: user.email,
        pass: user.password,
      },
    });

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        business: user.business,
      }
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
