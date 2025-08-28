import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"
import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key",
  baseURL: "https://api.groq.com/openai/v1"
})

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const businessId = user.business?.id
    if (!businessId) {
      return NextResponse.json({ error: "Business not found" }, { status: 404 })
    }

    const [customersResult, surveysResult, responsesResult] = await Promise.all([
      supabase.from('customers').select('age, location, data, created_at').eq('business_id', businessId),
      supabase.from('surveys').select('title, description, is_active, created_at, id').eq('user_id', user.id),
      supabase.from('survey_responses').select('answers, submitted_at, survey_id').eq('business_id', businessId).limit(100),
    ])

    

    const customers = customersResult.data || []
    let surveys = surveysResult.data || []
    let responses = responsesResult.data || []

    // O(n) right now, will need to change in future
    for (let i = 0; i < surveys.length; i++) {
      surveys[i].response_num = 0
    }

    for (let i = 0; i < responses.length; i++) {
      const surveyId = responses[i].survey_id
      const survey = surveys.find(s => s.id === surveyId)
      if (survey) {
        survey.response_num += 1
      }
    }
    if (customers.length === 0 && surveys.length === 0 && responses.length === 0) {
      return NextResponse.json({
        insights: [
          {
            title: "No Data Available",
            description: "No customer, survey, or response data found to generate insights.",
            type: "trend",
            priority: "low",
          },
        ],
      })
    }

    // Prepare summary for AI
    const dataSummary = {
      totalCustomers: customers.length,
      totalSurveys: surveys.length,
      totalResponses: responses.length,
      customerAges: customers.filter(c => c.age !== null).map(c => c.age),
      customerLocations: customers.filter(c => c.location).map(c => c.location),
      recentFeedback: responses.slice(0, 20).map(r => Object.values(r.answers as Record<string, { value: string }>).map(a => a.value).join(" ")),
      surveyPerformance: surveys.map(s => ({
        title: s.title,
        responses: s.response_num,
        isActive: s.is_active,
      })),
    }


    // Generate AI insights
    const response = await client.responses.create({
      model: "openai/gpt-oss-20b",
      input: `Analyze this customer data and provide 3-4 actionable business insights:

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

    const text = response.output_text.replace(/```json/g, "").replace(/```/g, "")

    try {
      const insights = JSON.parse(text)
      return NextResponse.json({ insights: insights.insights ?? insights })
    } catch {
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