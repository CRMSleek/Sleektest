import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    
    // Increment the timesOpened counter for this survey
    const updatedSurvey = await prisma.survey.update({
      where: { id },
      data: {
        timesOpened: {
          increment: 1
        }
      }
    })

    return NextResponse.json({ 
      success: true, 
      timesOpened: updatedSurvey.timesOpened 
    })
  } catch (error) {
    console.error("Error tracking survey open:", error)
    return NextResponse.json(
      { error: "Failed to track survey open" }, 
      { status: 500 }
    )
  }
}
