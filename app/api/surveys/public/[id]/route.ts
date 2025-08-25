import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const { id } = await params

    const { data: survey, error } = await supabase
      .from('surveys')
      .select('id, title, description, questions, is_active')
      .eq('id', id)
      .eq('is_active', true)
      .single()

    if (error || !survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    const normalized = {
      id: survey.id,
      title: survey.title,
      description: survey.description,
      questions: survey.questions,
    }

    return NextResponse.json({ survey: normalized })
  } catch (error) {
    console.error("Get public survey error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
