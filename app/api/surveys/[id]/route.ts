import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/auth"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const survey = await prisma.survey.findFirst({
      where: {
        id: params.id,
        userId: user.id,
      },
      include: {
        responses: {
          include: {
            customer: true,
          },
          orderBy: { createdAt: "desc" },
        },
      },
    })

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    return NextResponse.json({ survey })
  } catch (error) {
    console.error("Get survey error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { title, description, questions, isActive } = await request.json()

    const survey = await prisma.survey.updateMany({
      where: {
        id: params.id,
        userId: user.id,
      },
      data: {
        title,
        description,
        questions,
        isActive,
      },
    })

    if (survey.count === 0) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    const updatedSurvey = await prisma.survey.findUnique({
      where: { id: params.id },
    })

    return NextResponse.json({ survey: updatedSurvey })
  } catch (error) {
    console.error("Update survey error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const survey = await prisma.survey.deleteMany({
      where: {
        id: params.id,
        userId: user.id,
      },
    })

    if (survey.count === 0) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete survey error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
