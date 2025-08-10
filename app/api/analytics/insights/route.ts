import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getAuthenticatedUser } from "@/lib/middleware"
import { generateText } from "ai"
import { openai } from "@ai-sdk/openai"

export async function POST(request: NextRequest) {
  try {
    const user = await getAuthenticatedUser(request)
    if (!user || !user.businessId) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    // Get business data for AI analysis
    const [customers, surveys, responses] = await Promise.all([
      prisma.customer.findMany({
        where: { businessId: user.businessId },
        select: {
          age: true,
          location: true,
          preferences: true,
          createdAt: true,
        },
      }),
      prisma.survey.findMany({
        where: { businessId: user.businessId },
        select: {
          title: true,
          status: true,
          createdAt: true,
          _count: {
            select: { responses: true },
          },
        },
      }),
      prisma.surveyResponse.findMany({
        where: {
          survey: { businessId: user.businessId },
        },
        select: {
          responses: true,
          submittedAt: true,
        },
        take: 100, // Limit for AI processing
      }),
    ])

    // Prepare data summary for AI
    const dataSummary = {
      totalCustomers: customers.length,
      totalSurveys: surveys.length,
      totalResponses: responses.length,
      customerAges: customers.filter((c) => c.age).map((c) => c.age),
      customerLocations: customers.filter((c) => c.location).map((c) => c.location),
      recentFeedback: responses.slice(0, 20).map((r) => {
        const resp = r.responses as any
        return Object.values(resp).join(" ")
      }),
      surveyPerformance: surveys.map((s) => ({
        title: s.title,
        responses: s._count.responses,
        status: s.status,
      })),
    }

    // Generate AI insights
    const { text } = await generateText({
      model: openai("gpt-4.1-mini"),
      prompt: `Analyze this customer data and provide 3-4 actionable business insights:

Customer Data Summary:
- Total Customers: ${dataSummary.totalCustomers}
- Total Surveys: ${dataSummary.totalSurveys}
- Total Responses: ${dataSummary.totalResponses}
- Customer Ages: ${dataSummary.customerAges.join(", ")}
- Customer Locations: ${dataSummary.customerLocations.join(", ")}
- Recent Feedback: ${dataSummary.recentFeedback.join(" | ")}
- Survey Performance: ${JSON.stringify(dataSummary.surveyPerformance)}

Please provide insights in this JSON format:
{
  "insights": [
    {
      "title": "Insight Title",
      "description": "Detailed description with actionable recommendations",
      "type": "trend|demographic|feedback|opportunity",
      "priority": "high|medium|low"
    }
  ]
}

Focus on trends, opportunities, demographics, and actionable recommendations.`,
    })

    try {
      const insights = JSON.parse(text)
      return NextResponse.json(insights)
    } catch (parseError) {
      // Fallback if AI doesn't return valid JSON
      return NextResponse.json({
        insights: [
          {
            title: "AI Analysis Complete",
            description: text,
            type: "trend",
            priority: "medium",
          },
        ],
      })
    }
  } catch (error) {
    console.error("Generate insights error:", error)

    // Return fallback insights if AI fails
    return NextResponse.json({
      insights: [
        {
          title: "Customer Engagement Opportunity",
          description:
            "Consider sending more targeted surveys to increase response rates and gather more detailed feedback from your customer base.",
          type: "opportunity",
          priority: "medium",
        },
        {
          title: "Data Collection Enhancement",
          description:
            "Expand your survey questions to capture more demographic and preference data for better customer insights.",
          type: "feedback",
          priority: "low",
        },
      ],
    })
  }
}
