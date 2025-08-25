import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  try {
    const { id } = await params

    // Increment the times_opened counter for this survey
    const { data, error } = await supabase
      .from('surveys')
      .update({ times_opened: (supabase as any).rpc ? undefined : undefined })
      .eq('id', id)
      .select('times_opened')
      .single()

    // When direct increment isn’t supported, do read-modify-write
    let timesOpened = data?.times_opened
    if (!data || error) {
      const { data: current } = await supabase
        .from('surveys')
        .select('times_opened')
        .eq('id', id)
        .single()
      const next = (current?.times_opened || 0) + 1
      const { data: after } = await supabase
        .from('surveys')
        .update({ times_opened: next })
        .eq('id', id)
        .select('times_opened')
        .single()
      timesOpened = after?.times_opened || next
    }

    return NextResponse.json({ success: true, timesOpened })
  } catch (error) {
    console.error("Error tracking survey open:", error)
    return NextResponse.json(
      { error: "Failed to track survey open" },
      { status: 500 }
    )
  }
}
