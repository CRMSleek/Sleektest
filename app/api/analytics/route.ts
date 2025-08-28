import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"

function groupDataByPeriod<T extends { created_at?: string; submitted_at?: string }>(
  data: T[],
  dateField: keyof T,
  type: "count" | "average",
  valueExtractor?: (item: T) => number | null
) {
  if (!data || data.length === 0) return []


  const dates = data.map(d => new Date(d[dateField] as string))
  const firstDate = new Date(Math.min(...dates.map(d => d.getTime())))
  const now = new Date()

  const diffMonths = (now.getFullYear() - firstDate.getFullYear()) * 12 + (now.getMonth() - firstDate.getMonth())

  let bucketSize: "day" | "biweek" | "month"
  if (diffMonths < 1) bucketSize = "day"
  else if (diffMonths < 6) bucketSize = "biweek"
  else bucketSize = "month"

  const buckets: Record<string, number[]> = {}

  data.forEach(item => {
    const date = new Date(item[dateField] as string)
    let bucketKey: string

    if (bucketSize === "day") {
      bucketKey = date.toISOString().split("T")[0] 
    } else if (bucketSize === "biweek") {
      const year = date.getFullYear()
      const month = date.getMonth() + 1
      const biweek = date.getDate() <= 15 ? "1" : "2"
      bucketKey = `${year}-${String(month).padStart(2, "0")}-H${biweek}`
    } else {
      const year = date.getFullYear()
      const month = String(date.getMonth() + 1).padStart(2, "0")
      bucketKey = `${year}-${month}`
    }

    const val = valueExtractor ? valueExtractor(item) : 1
    if (val != null) {
      buckets[bucketKey] = buckets[bucketKey] || []
      buckets[bucketKey].push(val)
    }
  })

  return Object.entries(buckets).map(([date, values]) => {
    if (type === "count") {
      return { date, count: values.length }
    } else {
      const avg = values.length ? values.reduce((a, b) => a + b, 0) / values.length : 0
      return { date, rating: Math.round(avg * 10) / 10 }
    }
  })
}

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
      .limit(10)

    const recentActivity = recentActivityRaw?.map(item => ({
      id: item.id,
      surveyTitle: (item.surveys as any)?.title || "Unknown Survey",
      customerName: (item.customers as any)?.name || "Anonymous",
      customerEmail: (item.customers as any)?.email || "No email",
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
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const businessId = user.business.id

    // Fetch basic metrics with better error handling
    const [customersResult, surveysResult, responsesResult, activeSurveysResult] = await Promise.all([
      supabase.from('customers').select('id, created_at, age, location').eq('business_id', businessId),
      supabase.from('surveys').select('id, created_at').eq('user_id', user.id),
      supabase.from('survey_responses').select('id, submitted_at, answers').eq('business_id', businessId),
      supabase.from('surveys').select('id, times_opened').eq('user_id', user.id).eq('is_active', true),
    ])

    const totalCustomers = customersResult.data?.length || 0
    const totalSurveys = surveysResult.data?.length || 0
    const totalResponses = responsesResult.data?.length || 0
    const activeSurveys = activeSurveysResult.data?.length || 0

    // Calculate total survey opens using times_opened field
    const totalSurveyOpens = activeSurveysResult.data?.reduce((sum, survey) => sum + (survey.times_opened || 0), 0) || 0

    // Calculate completion rate based on survey opens vs responses
    const completionRate = totalSurveyOpens > 0 ? (totalResponses / totalSurveyOpens) * 100 : 0

    // Get current month responses for satisfaction calculation
    const now = new Date()
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1).toISOString()

    const { data: satisfactionData } = await supabase
      .from('survey_responses')
      .select(`
        answers,
        submitted_at,
        surveys (questions)
      `)
      .eq('business_id', businessId)
      .gte('submitted_at', startOfCurrentMonth)

    // Calculate average satisfaction
    const satisfactionScores = satisfactionData?.map(response => {
      const answers = response.answers as any
      const surveys = response.surveys as any
      const questions = surveys?.questions as any[]
      const question = questions?.find((q: any) => q.type === "satisfaction")
      if (question) {
        const answer = answers[question.id]?.value
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

    const generateResponseTrends = () => {
      return groupDataByPeriod(responsesResult.data || [], "submitted_at", "count")
    }

    const generateCustomerGrowth = () => {
      return groupDataByPeriod(customersResult.data || [], "created_at", "count")
    }

    const generateAgeDemographics = () => {
      const ageGroups = { '18-25': 0, '26-35': 0, '36-45': 0, '46-55': 0, '55+': 0 }
      customersResult.data?.forEach(customer => {
        if (customer.age) {
          if (customer.age < 26) ageGroups['18-25']++
          else if (customer.age < 36) ageGroups['26-35']++
          else if (customer.age < 46) ageGroups['36-45']++
          else if (customer.age < 56) ageGroups['46-55']++
          else ageGroups['55+']++
        }
      })
      return Object.entries(ageGroups).map(([age, count]) => ({ age, count }))
    }

    const generateLocationDistribution = () => {
      const locations: Record<string, number> = {}
      customersResult.data?.forEach(customer => {
        if (customer.location) {
          locations[customer.location] = (locations[customer.location] || 0) + 1
        }
      })
      return Object.entries(locations).map(([location, count]) => ({ location, count }))
    }

    const generateSatisfactionTrends = () => {
      return groupDataByPeriod(
        satisfactionData || [],
        "submitted_at",
        "average",
        (response) => {
          const answers = response.answers as any
          const surveys = response.surveys as any
          const questions = surveys?.questions as any[]
          const question = questions?.find((q: any) => q.type === "satisfaction")
          if (!question) return null
          const answer = answers[question.id]?.value
          const map: Record<string, number> = { "1": 1, "2": 2, "3": 3, "4": 4, "5": 5 }
          return map[answer] || null
        }
      )
    }

    return NextResponse.json({
      metrics: {
        totalResponses: { 
          value: totalResponses, 
          change: calcChange(totalResponses, prevMonthCount) 
        },
        totalSurveyOpens: {
          value: totalSurveyOpens,
          change: 0
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

      responseTrends: generateResponseTrends(),
      customerGrowth: generateCustomerGrowth(),
      ageDemographics: generateAgeDemographics(),
      locationDistribution: generateLocationDistribution(),
      satisfactionTrends: generateSatisfactionTrends(),
      recentActivity: [],
    })
  } catch (error) {
    console.error("Get analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}