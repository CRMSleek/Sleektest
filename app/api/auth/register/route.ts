import { type NextRequest, NextResponse } from "next/server"
import { createUser, generateToken } from "@/lib/supabase/auth"
import { supabase } from "@/lib/supabase/client"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, businessName } = await request.json()

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }

    // Check if user already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('email', email.toLowerCase())
      .single()

    if (existingUser) {
      return NextResponse.json({ error: "User already exists" }, { status: 400 })
    }

    // Create user
    const user = await createUser({ email, password, name })

    // Create business if businessName is provided
    let business = null
    if (businessName) {
      const { data: newBusiness } = await supabase
        .from('businesses')
        .insert({
          name: businessName,
          user_id: user.id
        })
        .select()
        .single()
      
      business = newBusiness
    }


    const token = await generateToken(user.id)

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        business: business,
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
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
