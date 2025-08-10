import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/middleware"
import { businessSettingsSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || !user.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const business = await prisma.business.findUnique({
      where: { id: user.businessId },
    })

    if (!business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

    return NextResponse.json({ business })
  } catch (error) {
    console.error("Get business settings error:", error)
    return NextResponse.json({ error: "Failed to fetch business settings" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || !user.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = businessSettingsSchema.parse(body)

    const business = await prisma.business.update({
      where: { id: user.businessId },
      data: validatedData,
    })

    return NextResponse.json({ business })
  } catch (error) {
    console.error("Update business settings error:", error)
    return NextResponse.json({ error: "Failed to update business settings" }, { status: 500 })
  }
}
