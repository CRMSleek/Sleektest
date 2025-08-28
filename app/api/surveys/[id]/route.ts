import { type NextRequest, NextResponse } from "next/server"
import { getCurrentUser } from "@/lib/supabase/auth"
import { supabase } from "@/lib/supabase/client"

export async function GET(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await params

    const { data: survey, error } = await supabase
      .from('surveys')
      .select('*')
      .eq('id', id)
      .eq('user_id', user.id)
      .single()

    if (error || !survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

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
    console.error("Get survey error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function PUT(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { title, description, questions } = await request.json()

    if (!title || !questions || !Array.isArray(questions)) {
      return NextResponse.json({ error: "Title and questions are required" }, { status: 400 })
    }

    const { id } = await params

    const { data: survey, error } = await supabase
      .from('surveys')
      .update({
        title,
        description,
        questions,
      })
      .eq('id', id)
      .eq('user_id', user.id)
      .select()
      .single()

    if (error || !survey) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

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
    console.error("Update survey error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Not authenticated" }, { status: 401 })
    }

    const { id } = await params

    const { error } = await supabase
      .from('surveys')
      .delete()
      .eq('id', id)
      .eq('user_id', user.id)

    if (error) {
      return NextResponse.json({ error: "Survey not found" }, { status: 404 })
    }

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Delete survey error:", error)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
