import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { getCurrentUser } from "@/lib/supabase/auth"
import { supabase } from "@/lib/supabase/client"

export const runtime = "nodejs"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key",
  baseURL: "https://api.groq.com/openai/v1",
})

const SYSTEM_PROMPT = `
You are the SleekCRM Analytics Assistant embedded inside a CRM dashboard.

Primary goals:
- Help users understand their customer analytics, surveys, and email engagement conceptually.
- Suggest concrete actions to improve customer satisfaction, conversion, and retention.
- Explain ideas clearly in simple, non-technical language unless the user asks for technical detail.

Behavior guidelines:
- Be concise but insightful. Prefer clear bullet points for recommendations.
- When you don't have direct access to exact numbers, speak in terms of likely patterns and best practices.
- When the user mentions specific metrics (e.g. response rate, NPS, open rate), interpret them and suggest next steps.
- Tie advice back to how they can use SleekCRM features like surveys, email campaigns, and customer segmentation.
`.trim()

/** Keep stored + prompt context bounded for Groq TPM limits */
const MAX_STORED_MESSAGES = 40
const MAX_CONTEXT_CHARS = 9000
const COMPRESS_BATCH = 12
const MAX_COMPRESS_ROUNDS = 25

type DbMessage = {
  id: string
  user_id: string
  role: string
  content: string
  created_at: string
}

async function getRollingSummary(userId: string): Promise<string> {
  const { data } = await supabase
    .from("analytics_assistant_context")
    .select("rolling_summary")
    .eq("user_id", userId)
    .maybeSingle()
  return (data?.rolling_summary as string) || ""
}

async function setRollingSummary(userId: string, summary: string) {
  const now = new Date().toISOString()
  const { data: existing } = await supabase
    .from("analytics_assistant_context")
    .select("user_id")
    .eq("user_id", userId)
    .maybeSingle()

  if (existing) {
    await supabase.from("analytics_assistant_context").update({ rolling_summary: summary, updated_at: now }).eq("user_id", userId)
  } else {
    await supabase.from("analytics_assistant_context").insert({
      user_id: userId,
      rolling_summary: summary,
      created_at: now,
      updated_at: now,
    })
  }
}

async function listMessages(userId: string): Promise<DbMessage[]> {
  const { data, error } = await supabase
    .from("analytics_assistant_messages")
    .select("id, user_id, role, content, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: true })
    .limit(500)

  if (error) {
    console.error("listMessages:", error)
    return []
  }
  return (data as DbMessage[]) || []
}

function totalChars(messages: DbMessage[]) {
  return messages.reduce((n, m) => n + (m.content?.length || 0), 0)
}

function shouldCompress(messages: DbMessage[]) {
  return messages.length > MAX_STORED_MESSAGES || totalChars(messages) > MAX_CONTEXT_CHARS
}

async function mergeSummaries(prev: string, transcript: string): Promise<string> {
  const input = `You compress CRM analytics chat history. Merge the prior summary with the new transcript. Preserve: user goals, named metrics, decisions, open questions, product areas (surveys, email, customers). Max ~600 words. Plain text only, no JSON.

Prior summary:
${prev || "(none)"}

New messages:
${transcript.slice(0, 12000)}

Merged summary:`.trim()

  try {
    const response = await client.responses.create({
      model: "openai/gpt-oss-20b",
      input,
    })
    const out = (response.output_text || "").trim()
    if (out) return out
  } catch (e) {
    console.warn("mergeSummaries LLM failed, using text fallback:", e)
  }
  const fallback = [prev, transcript.slice(0, 4000)].filter(Boolean).join("\n---\n")
  return fallback.slice(0, 8000)
}

async function compressOldestBatch(userId: string, messages: DbMessage[]): Promise<DbMessage[]> {
  if (messages.length === 0) return messages
  const batch = messages.slice(0, Math.min(COMPRESS_BATCH, messages.length))
  const rest = messages.slice(batch.length)
  const transcript = batch.map((m) => `${m.role}: ${m.content}`).join("\n")
  const prev = await getRollingSummary(userId)
  const merged = await mergeSummaries(prev, transcript)
  await setRollingSummary(userId, merged)
  const ids = batch.map((m) => m.id)
  await supabase.from("analytics_assistant_messages").delete().in("id", ids)
  return rest
}

async function ensureWithinLimits(userId: string): Promise<void> {
  let rounds = 0
  while (rounds < MAX_COMPRESS_ROUNDS) {
    const messages = await listMessages(userId)
    if (!shouldCompress(messages)) break
    await compressOldestBatch(userId, messages)
    rounds += 1
  }
}

function buildModelInput(rollingSummary: string, messages: DbMessage[], userName?: string | null) {
  const who = userName ? `The user's display name is ${userName}.` : ""
  const summaryBlock = rollingSummary
    ? `Earlier conversation (compressed summary):\n${rollingSummary}\n`
    : ""
  const recent = messages.map((m) => `${m.role}: ${m.content}`).join("\n")
  return `${SYSTEM_PROMPT}

${who}
${summaryBlock}
Recent messages:
${recent}

Continue as the SleekCRM Analytics Assistant. One helpful reply only, no JSON or markdown code fences.
Assistant:`.trim()
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const messages = await listMessages(user.id)
    return NextResponse.json({
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      })),
    })
  } catch (e) {
    console.error("Assistant GET error:", e)
    return NextResponse.json({ error: "Failed to load chat" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const body = (await request.json()) as { content?: string }
    const content = typeof body.content === "string" ? body.content.trim() : ""
    if (!content) {
      return NextResponse.json({ error: "content is required" }, { status: 400 })
    }

    await ensureWithinLimits(user.id)

    const now = new Date().toISOString()
    const { error: insertUserErr } = await supabase.from("analytics_assistant_messages").insert({
      user_id: user.id,
      role: "user",
      content,
      created_at: now,
    })
    if (insertUserErr) {
      console.error("insert user message:", insertUserErr)
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
    }

    await ensureWithinLimits(user.id)

    const rollingSummary = await getRollingSummary(user.id)
    const messages = await listMessages(user.id)

    const input = buildModelInput(rollingSummary, messages, user.name)

    const response = await client.responses.create({
      model: "openai/gpt-oss-20b",
      input,
    })

    const reply = (response.output_text || "").trim()
    if (!reply) {
      return NextResponse.json({ error: "Empty model response" }, { status: 502 })
    }

    const { error: insertAsstErr } = await supabase.from("analytics_assistant_messages").insert({
      user_id: user.id,
      role: "assistant",
      content: reply,
      created_at: new Date().toISOString(),
    })
    if (insertAsstErr) {
      console.error("insert assistant message:", insertAsstErr)
    }

    await ensureWithinLimits(user.id)

    const updated = await listMessages(user.id)
    return NextResponse.json({ reply, messages: updated })
  } catch (error) {
    console.error("SleekCRM assistant error:", error)
    return NextResponse.json(
      { error: "Something went wrong while processing your request. Please try again." },
      { status: 500 }
    )
  }
}
