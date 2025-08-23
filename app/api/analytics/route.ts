import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const businessId = user.business.id

    const now = new Date()
    const startOfCurrentMonth = new Date(now.getFullYear(), now.getMonth(), 1)
    const startOfPrevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1)
    const endOfPrevMonth = new Date(now.getFullYear(), now.getMonth(), 0)

    const [totalCustomers, totalSurveys, totalResponses, activeSurveys] = await Promise.all([
      prisma.customer.count({ where: { businessId } }),
      prisma.survey.count({ where: { userId: user.id } }),
      prisma.surveyResponse.count({ where: { businessId } }),
      prisma.survey.count({ where: { userId: user.id, isActive: true } }),
    ])

    // Get total survey opens for completion rate calculation
    const surveysWithOpens = await prisma.survey.findMany({
      where: { userId: user.id },
      select: { timesOpened: true }
    })
    
    const totalSurveyOpens = surveysWithOpens.reduce((sum, survey) => sum + (survey.timesOpened || 0), 0)

    const prevMonthResponses = await prisma.surveyResponse.count({
      where: {
        businessId,
        submittedAt: { gte: startOfPrevMonth, lte: endOfPrevMonth }
      }
    })

    const satisfactionData = await prisma.surveyResponse.findMany({
      where: { businessId, submittedAt: { gte: startOfCurrentMonth } },
      select: { answers: true, survey: { select: { questions: true } } }
    })

    const satisfactionScores = satisfactionData
      .map(response => {
        const answers = response.answers as any
        const questions = response.survey.questions as any[]
        const question = questions?.find(q => q.type === "satisfaction")
        if (question) {
          const answer = answers[question.id]
          const map: Record<string, number> = {
            "1": 1,
            "2": 2,
            "3": 3,
            "4": 4,
            "5": 5
          }
          return map[answer] || null
        }
        return null
      })
      .filter((score): score is number => score !== null)

    const avgSatisfaction = satisfactionScores.length
      ? satisfactionScores.reduce((a, b) => a + b, 0) / satisfactionScores.length
      : 0

    const completionRate = totalSurveyOpens > 0
      ? (totalResponses / totalSurveyOpens) * 100
      : 0

    const calcChange = (current: number, prev: number) =>
      prev === 0 ? 0 : ((current - prev) / prev) * 100

    const sixMonthsAgo = new Date()
    sixMonthsAgo.setMonth(sixMonthsAgo.getMonth() - 6)

    // Get the actual date range from the data to make charts dynamic
    const [earliestCustomer, earliestResponse] = await Promise.all([
      prisma.customer.findFirst({
        where: { businessId },
        orderBy: { createdAt: 'asc' },
        select: { createdAt: true }
      }),
      prisma.surveyResponse.findFirst({
        where: { businessId },
        orderBy: { submittedAt: 'asc' },
        select: { submittedAt: true }
      })
    ])

    // Use the earliest data point or default to 6 months ago
    const startDate = earliestCustomer || earliestResponse 
      ? new Date(Math.min(
          earliestCustomer?.createdAt.getTime() || Date.now(),
          earliestResponse?.submittedAt.getTime() || Date.now()
        ))
      : sixMonthsAgo

    const [customerGrowthRaw, responseTrendsRaw, ageDemographicsRaw, locationDistributionRaw, satisfactionDataFull, recentActivityRaw] = await Promise.all([
      prisma.customer.groupBy({
        by: ["createdAt"],
        where: { businessId, createdAt: { gte: startDate } },
        _count: true,
      }),
      prisma.surveyResponse.groupBy({
        by: ["submittedAt"],
        where: { businessId, submittedAt: { gte: startDate } },
        _count: true,
      }),
      prisma.customer.findMany({
        where: { businessId, age: { not: null } },
        select: { age: true }
      }),
      prisma.customer.groupBy({
        by: ["location"],
        where: { businessId, location: { not: null } },
        _count: true,
      }),
      prisma.surveyResponse.findMany({
        where: { businessId },
        select: { answers: true, submittedAt: true, survey: { select: { questions: true } } },
      }),
      prisma.surveyResponse.findMany({
        where: { businessId },
        include: { survey: { select: { title: true } }, customer: { select: { name: true, email: true } } },
        orderBy: { submittedAt: "desc" },
        take: 5,
      }),
    ])

    // Aggregate data by date (group by day)
    const aggregateByDate = (data: Array<{ createdAt?: Date; submittedAt?: Date; _count: number }>) => {
      const dateMap = new Map<string, number>()
      
      data.forEach(item => {
        const date = (item.createdAt || item.submittedAt)?.toISOString().split('T')[0] || ''
        if (date) {
          dateMap.set(date, (dateMap.get(date) || 0) + item._count)
        }
      })
      
      // Fill in missing dates with 0
      const sortedDates = Array.from(dateMap.keys()).sort()
      if (sortedDates.length > 0) {
        const start = new Date(sortedDates[0])
        const end = new Date(sortedDates[sortedDates.length - 1])
        
        for (let d = new Date(start); d <= end; d.setDate(d.getDate() + 1)) {
          const dateStr = d.toISOString().split('T')[0]
          if (!dateMap.has(dateStr)) {
            dateMap.set(dateStr, 0)
          }
        }
      }
      
      return Array.from(dateMap.entries())
        .map(([date, count]) => ({ date, count }))
        .sort((a, b) => a.date.localeCompare(b.date))
    }

    // Create age histogram bins (0-17, 18-25, 26-35, 36-50, 51-65, 65+)
    const createAgeHistogram = (ages: Array<{ age: number | null }>) => {
      const bins = [
        { range: '0-17', min: 0, max: 17, count: 0 },
        { range: '18-25', min: 18, max: 25, count: 0 },
        { range: '26-35', min: 26, max: 35, count: 0 },
        { range: '36-50', min: 36, max: 50, count: 0 },
        { range: '51-65', min: 51, max: 65, count: 0 },
        { range: '65+', min: 66, max: 999, count: 0 }
      ]
      
      ages.forEach(({ age }) => {
        if (age !== null) {
          const bin = bins.find(b => age >= b.min && age <= b.max)
          if (bin) bin.count++
        }
      })
      
      return bins.map(bin => ({ age: bin.range, count: bin.count }))
    }

    const satisfactionTrends = satisfactionDataFull
      .map((response) => {
        const answers = response.answers as any
        const questions = response.survey.questions as any[]
        const question = questions?.find(q => q.type === "satisfaction")
        if (question) {
          const answer = answers[question.id]
          const map: Record<string, number> = {
            "1": 1,
            "2": 2,
            "3": 3,
            "4": 4,
            "5": 5
          }
          return answer ? { date: response.submittedAt.toISOString().split("T")[0], rating: map[answer] || 3 } : null
        }
        return null
      })
      .filter((item): item is { date: string; rating: number } => item !== null)

    // Aggregate satisfaction trends by date (average rating per day)
    const aggregateSatisfactionByDate = (satisfactionData: Array<{ date: string; rating: number }>) => {
      const dateMap = new Map<string, { total: number; count: number }>()
      
      satisfactionData.forEach(item => {
        const existing = dateMap.get(item.date)
        if (existing) {
          existing.total += item.rating
          existing.count++
        } else {
          dateMap.set(item.date, { total: item.rating, count: 1 })
        }
      })
      
      return Array.from(dateMap.entries())
        .map(([date, { total, count }]) => ({ 
          date, 
          rating: Math.round((total / count) * 10) / 10 
        }))
        .sort((a, b) => a.date.localeCompare(b.date))
        .slice(-30) // Show last 30 days
    }

    return NextResponse.json({
      metrics: {
        totalResponses: { value: totalResponses, change: calcChange(totalResponses, prevMonthResponses) },
        avgSatisfaction: { value: Math.round(avgSatisfaction * 10) / 10, change: 0 },
        completionRate: { value: Math.round(completionRate * 10) / 10, change: 0 },
        activeCustomers: { value: totalCustomers, change: 0 }
      },
      customerGrowth: aggregateByDate(customerGrowthRaw),
      responseTrends: aggregateByDate(responseTrendsRaw),
      ageDemographics: createAgeHistogram(ageDemographicsRaw),
      locationDistribution: locationDistributionRaw.map(item => ({ location: item.location, count: item._count })),
      satisfactionTrends: aggregateSatisfactionByDate(satisfactionTrends),
      recentActivity: recentActivityRaw.map(item => ({
        id: item.id,
        surveyTitle: item.survey.title,
        customerName: item.customer?.name || "Anonymous",
        customerEmail: item.customer?.email || "No email",
        submittedAt: item.submittedAt,
      })),
    })
  } catch (error) {
    console.error("Get analytics error:", error)
    return NextResponse.json({ error: "Failed to fetch analytics" }, { status: 500 })
  }
}



export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user || !user.business?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const businessId = user.business.id

    // Fetch metrics
    const [totalCustomers, totalSurveys, totalResponses] = await Promise.all([
      prisma.customer.count({ where: { businessId } }),
      prisma.survey.count({ where: { userId: user.id } }),
      prisma.surveyResponse.count({ where: { businessId } }),
    ])

    // Recent activity (last 5 responses)
    const recentActivityRaw = await prisma.surveyResponse.findMany({
      where: { businessId },
      include: { survey: { select: { title: true } }, customer: { select: { name: true, email: true } } },
      orderBy: { submittedAt: "desc" },
      take: 5,
    })

    const recentActivity = recentActivityRaw.map(item => ({
      id: item.id,
      surveyTitle: item.survey.title,
      customerName: item.customer?.name || "Anonymous",
      customerEmail: item.customer?.email || "No email",
      submittedAt: item.submittedAt,
    }))

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