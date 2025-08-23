import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"

export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { answers, customerInfo } = await request.json()

    if (!answers) {
      return NextResponse.json({ error: "Answers are required" }, { status: 400 })
    }

    // Check if survey exists and is active
    const survey = await prisma.survey.findFirst({
      where: {
        id: params.id,
        isActive: true,
      },
      include: {
        user: {
          include: {
            business: true,
          },
        },
      },
    })

    if (!survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    if (!survey.user.business) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

    let customer = null

    // Create or find customer if customer info provided
    if (customerInfo?.email && survey.user.business) {
      customer = await prisma.customer.upsert({
        where: {
          email: customerInfo.email,
        },
        update: {
          name: customerInfo.name || customer?.name,
          phone: customerInfo.phone || customer?.phone,
          location: customerInfo.location || customer?.location,
          age: customerInfo.age || customer?.age,
          notes: customerInfo.notes || customer?.notes,
          data: customerInfo,
        },
        create: {
          email: customerInfo.email,
          name: customerInfo.name,
          phone: customerInfo.phone,
          location: customerInfo.location,
          age: customerInfo.age,
          notes: customerInfo.notes,
          data: customerInfo,
          businessId: survey.user.business.id,
        },
      })
    }

    // Create survey response
    const response = await prisma.surveyResponse.create({
      data: {
        answers,
        surveyId: params.id,
        businessId: survey.user.business.id,
        customerId: customer?.id || null,
        submittedAt: new Date(),
      },
    })

    return NextResponse.json({ success: true, responseId: response.id })
  } catch (error) {
    console.error("Create survey response error:", error)
    return NextResponse.json({ error: "Failed to submit survey response" }, { status: 500 })
  }
}
