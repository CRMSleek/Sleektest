import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/middleware"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
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
            address: userBusiness.address || "" 
        }
    }, { status: 200 })

  } catch (error) {
    console.error("Get customers error:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}


export async function POST(request: NextRequest) {
  try {
    const { name, email, website, description, phone, address } = await request.json()
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const userBusiness = user.business
    if (!userBusiness) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }
    const updatedBusiness = await prisma.business.update({
      where: { id: userBusiness.id },
      data: {
        name,
        email,
        website,
        description,
        phone,
        address,
      },
    })

    return NextResponse.json({
      status: "success",
    }, { status: 200 })

  } catch (error) {
    console.error("Get customers error:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}