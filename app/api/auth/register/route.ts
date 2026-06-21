import { type NextRequest, NextResponse } from "next/server"
import { authCookieOptions, createUser, generateToken } from "@/lib/supabase/auth"
import { supabaseAdmin as supabase } from "@/lib/supabase/server"
import { normalizeComplianceMode } from "@/lib/compliance"
import { writeAuditLog } from "@/lib/audit-log"

export async function POST(request: NextRequest) {
  try {
    const { email, password, name, businessName, complianceMode } = await request.json()
    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required" }, { status: 400 })
    }
    const selectedComplianceMode = normalizeComplianceMode(complianceMode)

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

    const { data: business } = await supabase
      .from('businesses')
      .insert({
        name: businessName || `${name || email}'s Business`,
        user_id: user.id,
        compliance_mode: selectedComplianceMode,
        regulated_data_enabled: selectedComplianceMode !== "standard",
      })
      .select()
      .single()


    const token = await generateToken(user.id)

    const response = NextResponse.json({
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        business: business,
      },
    })

    await writeAuditLog({
      actorUserId: user.id,
      businessId: business?.id ?? null,
      action: "user.register",
      tableName: "users",
      rowId: user.id,
      metadata: { complianceMode: selectedComplianceMode },
      request,
    })

    response.cookies.set("auth-token", token, authCookieOptions)

    return response
  } catch (error) {
    console.error("Registration error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
