import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const customer = await prisma.customer.findFirst({
      where: {
        id: params.id,
        businessId: user.business.id,
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
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = await request.json()

    const customer = await prisma.customer.updateMany({
      where: {
        id: params.id,
        businessId: user.business.id,
      },
      data: body,
    })

    if (customer.count === 0) {
      return NextResponse.json({ error: "Customer not found" }, { status: 404 })
    }

    // Fetch the updated customer to return
    const updatedCustomer = await prisma.customer.findUnique({
      where: { id: params.id },
    })

    return NextResponse.json({ customer: updatedCustomer })
  } catch (error) {
    console.error("Update customer error:", error)
    return NextResponse.json({ error: "Failed to update customer" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const customer = await prisma.customer.deleteMany({
      where: {
        id: params.id,
        businessId: user.business.id,
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
