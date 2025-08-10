import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const survey = await prisma.survey.findFirst({
      where: {
        id: params.id,
        isActive: true,
      },
      select: {
        id: true,
        title: true,
        description: true,
        questions: true,
      },
    })

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    return NextResponse.json({ survey })
  } catch (error) {
    console.error("Get public survey error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
