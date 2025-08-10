import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/middleware"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || !user.businessId) {
      return NextResponse.json({ error: "Unauthorized 1" }, { status: 401 })
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: params.id,
        businessId: user.businessId,
      },
      include: {
        responses: {
          include: {
            survey: {
              select: { title: true },
            },
          },
          orderBy: { createdAt: "asc" },
        },
      },
    })

    if (!customer) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({ customer })
  } catch (error) {
    console.error("Get customer error:", error)
    return NextResponse.json({ error: "Failed to fetch customer" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || !user.businessId) {
      return NextResponse.json({ error: "Unauthorized 2" }, { status: 401 })
    }

    const body = await request.json()

    const customer = await prisma.customer.updateMany({
      where: {
        id: params.id,
        businessId: user.businessId,
      },
      data: body,
    })

    if (customer.count === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Update customer error:", error)
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || !user.businessId) {
      return NextResponse.json({ error: "Unauthorized 3" }, { status: 401 })
    }

    const customer = await prisma.customer.deleteMany({
      where: {
        id: params.id,
        businessId: user.businessId,
      },
    })

    if (customer.count === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete customer error:", error)
    return NextResponse.json({ error: "Failed to delete customer" }, { status: 500 })
  }
}
