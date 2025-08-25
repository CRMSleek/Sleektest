import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const businessId = user.business.id

    // Fetch basic metrics
    const [customersResult, surveysResult, responsesResult] = await Promise.all([
      supabase.from('customers').select('id').eq('business_id', businessId),
      supabase.from('surveys').select('id').eq('user_id', user.id),
      supabase.from('survey_responses').select('id').eq('business_id', businessId),
    ])

    const totalCustomers = customersResult.data?.length || 0
    const totalSurveys = surveysResult.data?.length || 0
    const totalResponses = responsesResult.data?.length || 0

    // Recent activity (last 5 responses)
    const { data: recentActivityRaw } = await supabase
      .from('survey_responses')
      .select(`
        id,
        submitted_at,
        surveys (title),
        customers (name, email)
      `)
      .eq('business_id', businessId)
      .order('submitted_at', { ascending: false })
      .limit(5)

    const recentActivity = recentActivityRaw?.map(item => ({
      id: item.id,
      surveyTitle: item.surveys?.title || "Unknown Survey",
      customerName: item.customers?.name || "Anonymous",
      customerEmail: item.customers?.email || "No email",
      submittedAt: item.submitted_at,
    })) || []

    return NextResponse.json({
      metrics: {
        totalSurveys,
        totalResponses,
        totalCustomers,
      },
      recentActivity,
    })
  } catch (error) {
    console.error("Get analytics error (GET):", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const businessId = user.business.id

    // Fetch basic metrics
    const [customersResult, surveysResult, responsesResult, activeSurveysResult] = await Promise.all([
      supabase.from('customers').select('id').eq('business_id', businessId),
      supabase.from('surveys').select('id').eq('user_id', user.id),
      supabase.from('survey_responses').select('id').eq('business_id', businessId),
      supabase.from('surveys').select('id, times_opened').eq('user_id', user.id).eq('is_active', true),
    ])

    const totalCustomers = customersResult.data?.length || 0
    const totalSurveys = surveysResult.data?.length || 0
    const totalResponses = responsesResult.data?.length || 0
    const activeSurveys = activeSurveysResult.data?.length || 0

    // Calculate total survey opens
    const totalSurveyOpens = activeSurveysResult.data?.reduce((sum, survey) => sum + (survey.times_opened || 0), 0) || 0

    // Calculate completion rate
    const completionRate = totalSurveyOpens > 0 ? (totalResponses / totalSurveyOpens) * 100 : 0

    // Get current month responses for satisfaction calculation
    const now = new Date()
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data: satisfactionData } = await supabase
      .from('survey_responses')
      .select(`
        answers,
        surveys (questions)
      `)
      .eq('business_id', businessId)
      .gte('submitted_at', startOfCurrentMonth)

    // Calculate average satisfaction
    const satisfactionScores = satisfactionData?.map(response => {
      const answers = response.answers as any
      const questions = response.surveys?.questions as any[]
      const question = questions?.find((q: any) => q.type === "satisfaction")
      if (question) {
        const answer = answers[question.id]
        const map: Record<string, number> = {
          "1": 1, "2": 2, "3": 3, "4": 4, "5": 5
        }
        return map[answer] || null
      }
      return null
    }).filter((score): score is number => score !== null) || []

    const avgSatisfaction = satisfactionScores.length
      ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
      : 0

    // Get previous month responses for change calculation
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1).toISOString()
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0).toISOString()

    const { data: prevMonthResponses } = await supabase
      .from('survey_responses')
      .select('id')
      .eq('business_id', businessId)
      .gte('submitted_at', startOfPrevMonth)
      .lte('submitted_at', endOfPrevMonth)

    const prevMonthCount = prevMonthResponses?.length || 0
    const calcChange = (current: number, prev: number) =>
      prev === 0 ? 0 : ((current - prev) / prev) * 100

    return NextResponse.json({
      metrics: {
        totalResponses: { 
          value: totalResponses, 
          change: calcChange(totalResponses, prevMonthCount) 
        },
        avgSatisfaction: { 
          value: Math.round(avgSatisfaction * 10) / 10, 
          change: 0 
        },
        completionRate: { 
          value: Math.round(completionRate * 10) / 10, 
          change: 0 
        },
        activeCustomers: { 
          value: totalCustomers, 
          change: 0 
        }
      },
      // Simplified data for charts - you can expand these as needed
      customerGrowth: [],
      responseTrends: [],
      ageDemographics: [],
      locationDistribution: [],
      satisfactionTrends: [],
      recentActivity: [],
    })
  } catch (error) {
    console.error("Get analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}