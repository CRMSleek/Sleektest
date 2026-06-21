import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/supabase/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { normalizeComplianceMode } from "@/lib/compliance"
import { writeAuditLog } from "@/lib/audit-log"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userBusiness = user.business
    if (!userBusiness) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

    return NextResponse.json({
        businessData: { 
            name: userBusiness.name || "", 
            email: userBusiness.email || "", 
            website: userBusiness.website || "", 
            description: userBusiness.description || "",
            phone: userBusiness.phone || "", 
            address: userBusiness.address || "",
            complianceMode: userBusiness.compliance_mode || "standard",
            regulatedDataEnabled: Boolean(userBusiness.regulated_data_enabled),
            dataRetentionDays: userBusiness.data_retention_days || 2555,
        }
    }, { status: 200 })

  } catch (error) {
    console.error("Get customers error:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}


export async function POST(request: NextRequest) {
  try {
    const { name, email, website, description, phone, address, complianceMode } = await request.json()
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userBusiness = user.business
    if (!userBusiness) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }
    
    const selectedComplianceMode = normalizeComplianceMode(complianceMode ?? userBusiness.compliance_mode)

    const { error } = await supabase
      .from('businesses')
      .update({
        name,
        email,
        website,
        description,
        phone,
        address,
        compliance_mode: selectedComplianceMode,
        regulated_data_enabled: selectedComplianceMode !== "standard",
      })
      .eq('id', userBusiness.id)

    if (error) throw error

    await writeAuditLog({
      actorUserId: user.id,
      businessId: userBusiness.id,
      action: selectedComplianceMode !== userBusiness.compliance_mode
        ? "business.compliance_mode_changed"
        : "business.settings_updated",
      tableName: "businesses",
      rowId: userBusiness.id,
      metadata: { complianceMode: selectedComplianceMode },
      request,
    })

    return NextResponse.json({
      status: "success",
    }, { status: 200 })

  } catch (error) {
    console.error("Get customers error:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}
