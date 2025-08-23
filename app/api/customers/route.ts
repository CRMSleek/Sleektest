import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/middleware"
import { customerSchema } from "@/lib/validations"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized 4" }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const search = searchParams.get("search") || ""

    const customers = await prisma.customer.findMany({
      where: {
        businessId: user.business.id,
        OR: search
          ? [
              { name: { contains: search, mode: "insensitive" } },
              { email: { contains: search, mode: "insensitive" } },
              { location: { contains: search, mode: "insensitive" } },
              { phone: { contains: search, mode: "insensitive" } },
            ]
          : undefined,
      },
      orderBy: { name: "asc" },
      include: {
        responses: {
          include: {
            survey: {
              select: { title: true },
            },
          },
          orderBy: { createdAt: "desc" },
          take: 1,
        },
      },
    })

    return NextResponse.json({ customers })
  } catch (error) {
    console.error("Get customers error:", error)
    return NextResponse.json({ error: "Failed to fetch customers" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || !user.business.id) {
      return NextResponse.json({ error: "Unauthorized 5" }, { status: 401 })
    }

    const body = await request.json()
    const validatedData = customerSchema.parse(body)

    const customer = await prisma.customer.create({
      data: {
        ...validatedData,
        businessId: user.business.id,
      },
    })

    return NextResponse.json({ customer })
  } catch (error) {
    console.error("Create customer error:", error)
    return NextResponse.json({ error: "Failed to create customer" }, { status: 500 })
  }
}
