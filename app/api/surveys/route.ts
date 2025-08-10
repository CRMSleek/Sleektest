import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const surveys = await prisma.survey.findMany({
      where: { userId: user.id },
      include: {
        _count: {
          select: { responses: true },
        },
      },
      orderBy: { createdAt: "desc" },
    })

    return NextResponse.json({ surveys })
  } catch (error) {
    console.error("Get surveys error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { title, description, questions } = await request.json()

    if (!title || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Title and questions are required" }, { status: 400 })
    }

    const survey = await prisma.survey.create({
      data: {
        title,
        description,
        questions,
        userId: user.id,
      },
    })

    return NextResponse.json({ survey })
  } catch (error) {
    console.error("Create survey error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
