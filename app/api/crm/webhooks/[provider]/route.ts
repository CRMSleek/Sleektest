import { type NextRequest, NextResponse } from "next/server"
import { supabaseAdmin as supabase } from "@/lib/supabase/server"

type RouteContext = { params: Promise<{ provider: string }> }

export async function POST(request: NextRequest, context: RouteContext) {
  try {
    const { provider } = await context.params
    const eventType = request.headers.get("x-sleekcrm-event") || request.headers.get("x-event-type") || "unknown"
    const payload = await request.json().catch(() => ({}))
    const { data, error } = await supabase
      .from("crm_webhook_events")
      .insert({
        provider_key: provider,
        event_type: eventType,
        payload,
        status: "received",
      })
      .select()
      .single()
    if (error) throw error
    return NextResponse.json({ received: true, event: data })
  } catch (error) {
    console.error("Inbound CRM webhook error:", error)
    return NextResponse.json({ error: "Webhook received but could not be stored" }, { status: 400 })
  }
}
