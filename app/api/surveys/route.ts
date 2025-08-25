import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { supabase } from "@/lib/supabase/client"

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { data: surveys, error } = await supabase
      .from('surveys')
      .select('id, title, description, questions, is_active, created_at')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })

    if (error) throw error

    // Fetch counts per survey in one query
    const { data: counts } = await supabase
      .from('survey_responses')
      .select('survey_id, count:id', { count: 'exact', head: false })
      .in('survey_id', (surveys || []).map(s => s.id))

    const countBySurvey: Record<string, number> = {}
    counts?.forEach((row: any) => {
      countBySurvey[row.survey_id] = (countBySurvey[row.survey_id] || 0) + 1
    })

    const normalized = (surveys || []).map((s: any) => ({
      id: s.id,
      title: s.title,
      description: s.description,
      questions: s.questions,
      isActive: Boolean(s.is_active),
      createdAt: s.created_at,
      _count: { responses: countBySurvey[s.id] || 0 },
    }))

    return NextResponse.json({ surveys: normalized })
  } catch (error) {
    console.error("Get surveys error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { title, description, questions } = await request.json()

    if (!title || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Title and questions are required" }, { status: 400 })
    }

    const { data: survey, error } = await supabase
      .from('surveys')
      .insert({
        title,
        description,
        questions,
        user_id: user.id,
      })
      .select()
      .single()

    if (error) throw error

    const normalized = {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      questions: survey.questions,
      isActive: Boolean(survey.is_active),
      createdAt: survey.created_at,
    }

    return NextResponse.json({ survey: normalized })
  } catch (error) {
    console.error("Create survey error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
