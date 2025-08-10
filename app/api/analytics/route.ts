import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/middleware"

export async function GET(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || !user.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get basic metrics
    const [totalCustomers, totalSurveys, totalResponses, activeSurveys] = await Promise.all([
      prisma.customer.count({
        where: { businessId: user.businessId },
      }),
      prisma.survey.count({
        where: { businessId: user.businessId },
      }),
      prisma.surveyResponse.count({
        where: {
          survey: { businessId: user.businessId },
        },
      }),
      prisma.survey.count({
        where: {
          businessId: user.businessId,
          status: "ACTIVE",
        },
      }),
    ])

    // Get customer growth data (last 6 months)
    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    const customerGrowth = await prisma.customer.groupBy({
      by: ["createdAt"],
      where: {
        businessId: user.businessId,
        createdAt: {
          gte: sixMonthsAgo,
        },
      },
      _count: true,
    })

    // Get response trends
    const responseTrends = await prisma.surveyResponse.groupBy({
      by: ["submittedAt"],
      where: {
        survey: { businessId: user.businessId },
        submittedAt: {
          gte: sixMonthsAgo,
        },
      },
      _count: true,
    })

    // Get age demographics
    const ageDemographics = await prisma.customer.groupBy({
      by: ["age"],
      where: {
        businessId: user.businessId,
        age: { not: null },
      },
      _count: true,
    })

    // Get location distribution
    const locationDistribution = await prisma.customer.groupBy({
      by: ["location"],
      where: {
        businessId: user.businessId,
        location: { not: null },
      },
      _count: true,
    })

    // Calculate satisfaction scores from survey responses
    const satisfactionData = await prisma.surveyResponse.findMany({
      where: {
        survey: { businessId: user.businessId },
      },
      select: {
        responses: true,
        submittedAt: true,
      },
    })

    // Process satisfaction scores (looking for rating questions)
    const satisfactionScores = satisfactionData
      .map((response) => {
        const responses = response.responses as any
        // Look for common rating field names
        const ratingFields = ["q4", "rating", "satisfaction", "score"]
        for (const field of ratingFields) {
          if (responses[field]) {
            const rating = responses[field]
            if (rating === "Excellent") return 5
            if (rating === "Good") return 4
            if (rating === "Average") return 3
            if (rating === "Poor") return 2
            if (rating === "Very Poor") return 1
            if (typeof rating === "number") return rating
          }
        }
        return null
      })
      .filter((score) => score !== null)

    const avgSatisfaction =
      satisfactionScores.length > 0 ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length : 0

    // Calculate response rate
    const responseRate = totalSurveys > 0 ? (totalResponses / (totalCustomers * totalSurveys)) * 100 : 0

    return NextResponse.json({
      metrics: {
        totalCustomers,
        totalSurveys,
        totalResponses,
        activeSurveys,
        avgSatisfaction: Math.round(avgSatisfaction * 10) / 10,
        responseRate: Math.round(responseRate * 10) / 10,
      },
      customerGrowth: customerGrowth.map((item) => ({
        date: item.createdAt.toISOString().split("T")[0],
        count: item._count,
      })),
      responseTrends: responseTrends.map((item) => ({
        date: item.submittedAt.toISOString().split("T")[0],
        count: item._count,
      })),
      ageDemographics: ageDemographics.map((item) => ({
        age: item.age,
        count: item._count,
      })),
      locationDistribution: locationDistribution.map((item) => ({
        location: item.location,
        count: item._count,
      })),
    })
  } catch (error) {
    console.error("Get analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}
