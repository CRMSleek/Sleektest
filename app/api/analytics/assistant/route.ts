import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { getCurrentUser } from "@/lib/supabase/auth"
import { supabase } from "@/lib/supabase/client"
import {
  buildAnalyticsWorkspace,
  executeWorkspaceAction,
  formatWorkspaceContext,
  type AnalyticsWorkspace,
} from "@/lib/agentic-crm"

export const runtime = "nodejs"

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
})

const SYSTEM_PROMPT = `
You are the SleekCRM analytics agent. The product is action-first.

Your job:
- Explain the current workspace state clearly.
- Keep the user focused on one concrete action in the center panel.
- Reference grounded signals from customers, surveys, emails, and responses.
- Mention source citations when possible.
- Be concise, direct, and useful.
- Prefer a recommendation that can be approved and executed immediately.

Style:
- Use plain language and short bullets when helpful.
- Do not invent data that is not in the workspace context.
- If the user asks to act, respond with the next step and the rationale.
`.trim()

const MODEL = "deepseek/deepseek-v4-flash:free"

const MAX_STORED_MESSAGES = 40
const MAX_CONTEXT_CHARS = 9000
const COMPRESS_BATCH = 12
const MAX_COMPRESS_ROUNDS = 25

type DbChat = {
  id: string
  user_id: string
  title: string
  rolling_summary: string
  created_at: string
  updated_at: string
}

type DbMessage = {
  id: string
  user_id: string
  chat_id: string
  role: string
  content: string
  created_at: string
}

type AssistantChat = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

async function listChats(userId: string): Promise<AssistantChat[]> {
  const { data, error } = await supabase
    .from("analytics_assistant_chats")
    .select("id, title, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })

  if (error) {
    console.error("listChats:", error)
    return []
  }

  return (data as AssistantChat[]) || []
}

async function getChat(userId: string, chatId: string): Promise<DbChat | null> {
  const { data, error } = await supabase
    .from("analytics_assistant_chats")
    .select("id, user_id, title, rolling_summary, created_at, updated_at")
    .eq("user_id", userId)
    .eq("id", chatId)
    .maybeSingle()

  if (error) {
    console.error("getChat:", error)
    return null
  }

  return (data as DbChat) || null
}

async function getLatestChat(userId: string): Promise<DbChat | null> {
  const { data, error } = await supabase
    .from("analytics_assistant_chats")
    .select("id, user_id, title, rolling_summary, created_at, updated_at")
    .eq("user_id", userId)
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error) {
    console.error("getLatestChat:", error)
    return null
  }

  return (data as DbChat) || null
}

function buildChatTitle(workspace: AnalyticsWorkspace | null) {
  const raw = workspace?.brief.actionLabel || workspace?.action.title || "Insight chat"
  return raw.slice(0, 72)
}

async function createChat(userId: string, workspace: AnalyticsWorkspace | null): Promise<DbChat | null> {
  const now = new Date().toISOString()
  const title = buildChatTitle(workspace)
  const { data, error } = await supabase
    .from("analytics_assistant_chats")
    .insert({
      user_id: userId,
      title,
      rolling_summary: "",
      created_at: now,
      updated_at: now,
    })
    .select("id, user_id, title, rolling_summary, created_at, updated_at")
    .single()

  if (error) {
    console.error("createChat:", error)
    return null
  }

  return data as DbChat
}

async function resolveChat(
  userId: string,
  chatId: string | undefined,
  workspace: AnalyticsWorkspace | null,
): Promise<DbChat | null> {
  if (chatId) {
    const existing = await getChat(userId, chatId)
    if (existing) return existing
  }

  const latest = await getLatestChat(userId)
  if (latest) return latest

  return createChat(userId, workspace)
}

async function getRollingSummary(chatId: string): Promise<string> {
  const { data } = await supabase
    .from("analytics_assistant_chats")
    .select("rolling_summary")
    .eq("id", chatId)
    .maybeSingle()
  return (data?.rolling_summary as string) || ""
}

async function setRollingSummary(chatId: string, summary: string) {
  const now = new Date().toISOString()
  await supabase.from("analytics_assistant_chats").update({ rolling_summary: summary, updated_at: now }).eq("id", chatId)
}

async function touchChat(chatId: string) {
  await supabase.from("analytics_assistant_chats").update({ updated_at: new Date().toISOString() }).eq("id", chatId)
}

async function listMessages(chatId: string): Promise<DbMessage[]> {
  const { data, error } = await supabase
    .from("analytics_assistant_messages")
    .select("id, user_id, chat_id, role, content, created_at")
    .eq("chat_id", chatId)
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
  try {
    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "You compress CRM analytics chat history. Merge the prior summary with the new transcript. Preserve user goals, named metrics, decisions, open questions, product areas (surveys, email, customers), and any approved actions. Max about 600 words. Plain text only, no JSON.",
        },
        {
          role: "user",
          content: `Prior summary:\n${prev || "(none)"}\n\nNew messages:\n${transcript.slice(0, 12000)}\n\nMerged summary:`,
        },
      ],
    })
    const out = (response.choices[0]?.message?.content || "").trim()
    if (out) return out
  } catch (e) {
    console.warn("mergeSummaries LLM failed, using text fallback:", e)
  }

  const fallback = [prev, transcript.slice(0, 4000)].filter(Boolean).join("\n---\n")
  return fallback.slice(0, 8000)
}

type ChatMessage = {
  role: "system" | "user" | "assistant"
  content: string
}

function buildChatMessages(
  rollingSummary: string,
  messages: DbMessage[],
  userName?: string | null,
  workspace?: AnalyticsWorkspace | null,
): ChatMessage[] {
  const workspaceContext = formatWorkspaceContext(workspace || null)
  const summaryBlock = rollingSummary ? `\nEarlier conversation summary:\n${rollingSummary}` : ""
  const userBlock = userName ? `\nUser display name: ${userName}` : ""

  return [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nCurrent workspace:\n${workspaceContext}${summaryBlock}${userBlock}`,
    },
    ...messages.map(
      (message): ChatMessage => ({
        role: message.role === "assistant" ? "assistant" : "user",
        content: message.content,
      }),
    ),
  ]
}

async function compressOldestBatch(chatId: string, messages: DbMessage[]): Promise<DbMessage[]> {
  if (messages.length === 0) return messages
  const batch = messages.slice(0, Math.min(COMPRESS_BATCH, messages.length))
  const rest = messages.slice(batch.length)
  const transcript = batch.map((m) => `${m.role}: ${m.content}`).join("\n")
  const prev = await getRollingSummary(chatId)
  const merged = await mergeSummaries(prev, transcript)
  await setRollingSummary(chatId, merged)
  const ids = batch.map((m) => m.id)
  await supabase.from("analytics_assistant_messages").delete().in("id", ids)
  return rest
}

async function ensureWithinLimits(chatId: string): Promise<void> {
  let rounds = 0
  while (rounds < MAX_COMPRESS_ROUNDS) {
    const messages = await listMessages(chatId)
    if (!shouldCompress(messages)) break
    await compressOldestBatch(chatId, messages)
    rounds += 1
  }
}

function fallbackReply(workspace: AnalyticsWorkspace | null) {
  if (!workspace) {
    return "I could not load your CRM workspace. Sync customer, survey, or email data and try again."
  }

  const action = workspace.action
  return [
    workspace.brief.headline,
    workspace.brief.whyNow,
    `Recommended action: ${action.title} (${Math.round(action.confidence * 100)}% confidence).`,
    `Sources: ${action.citations.map((citation) => `${citation.label} - ${citation.detail}`).join("; ")}`,
  ].join("\n")
}

async function serializeChats(userId: string) {
  return listChats(userId)
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    const chatId = request.nextUrl.searchParams.get("chatId") || undefined
    const workspace = await buildAnalyticsWorkspace(user)
    const chat = chatId ? await getChat(user.id, chatId) : await getLatestChat(user.id)
    const chats = await serializeChats(user.id)
    const messages = chat ? await listMessages(chat.id) : []

    return NextResponse.json({
      chats,
      activeChatId: chat?.id || null,
      messages: messages.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      })),
      workspace,
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

    const body = (await request.json().catch(() => ({}))) as {
      content?: string
      mode?: "chat" | "approve" | "refresh" | "new_chat"
      chatId?: string
    }

    const workspace = await buildAnalyticsWorkspace(user)
    const mode = body.mode || (body.content ? "chat" : "refresh")

    if (mode === "new_chat" || mode === "refresh") {
      const chat = (await createChat(user.id, workspace)) || (await getLatestChat(user.id))
      const chats = await serializeChats(user.id)

      return NextResponse.json({
        chat: chat
          ? {
              id: chat.id,
              title: chat.title,
              created_at: chat.created_at,
              updated_at: chat.updated_at,
            }
          : null,
        activeChatId: chat?.id || null,
        chats,
        messages: [],
        workspace,
      })
    }

    if (mode === "approve") {
      if (!workspace) {
        return NextResponse.json({ error: "Workspace not available" }, { status: 404 })
      }

      const result = await executeWorkspaceAction(user, workspace.action, request)
      if (!result.ok) {
        return NextResponse.json({ error: result.error, needsCredentials: result.needsCredentials ?? false }, { status: 400 })
      }

      const chat = (await resolveChat(user.id, body.chatId, workspace)) || (await createChat(user.id, workspace))
      if (!chat) {
        return NextResponse.json({ error: "Failed to create chat" }, { status: 500 })
      }

      const confirmation = `Approved: ${result.message}.`
      await supabase.from("analytics_assistant_messages").insert({
        user_id: user.id,
        chat_id: chat.id,
        role: "assistant",
        content: confirmation,
        created_at: new Date().toISOString(),
      })
      await touchChat(chat.id)

      const updatedWorkspace = await buildAnalyticsWorkspace(user)
      const chats = await serializeChats(user.id)

      return NextResponse.json({
        reply: confirmation,
        workspace: updatedWorkspace,
        result,
        chats,
        activeChatId: chat.id,
      })
    }

    const content = typeof body.content === "string" ? body.content.trim() : ""
    if (!content) {
      return NextResponse.json({ error: "content is required for chat messages" }, { status: 400 })
    }

    const chat = (await resolveChat(user.id, body.chatId, workspace)) || (await createChat(user.id, workspace))
    if (!chat) {
      return NextResponse.json({ error: "Failed to create chat" }, { status: 500 })
    }

    await ensureWithinLimits(chat.id)

    const now = new Date().toISOString()
    const { error: insertUserErr } = await supabase.from("analytics_assistant_messages").insert({
      user_id: user.id,
      chat_id: chat.id,
      role: "user",
      content,
      created_at: now,
    })
    if (insertUserErr) {
      console.error("insert user message:", insertUserErr)
      return NextResponse.json({ error: "Failed to save message" }, { status: 500 })
    }

    await touchChat(chat.id)
    await ensureWithinLimits(chat.id)

    const rollingSummary = await getRollingSummary(chat.id)
    const messages = await listMessages(chat.id)
    const inputMessages = buildChatMessages(rollingSummary, messages, user.name, workspace)

    let reply = ""
    try {
      if (!process.env.OPENROUTER_KEY) {
        throw new Error("OPENROUTER_KEY is missing")
      }

      const response = await client.chat.completions.create({
        model: MODEL,
        messages: inputMessages,
        temperature: 0.5,
      })
      reply = (response.choices[0]?.message?.content || "").trim()
    } catch (error) {
      console.warn("Assistant model failed, using fallback:", error)
    }

    if (!reply) {
      reply = fallbackReply(workspace)
    }

    const { error: insertAsstErr } = await supabase.from("analytics_assistant_messages").insert({
      user_id: user.id,
      chat_id: chat.id,
      role: "assistant",
      content: reply,
      created_at: new Date().toISOString(),
    })
    if (insertAsstErr) {
      console.error("insert assistant message:", insertAsstErr)
    }

    await touchChat(chat.id)
    await ensureWithinLimits(chat.id)

    const updated = await listMessages(chat.id)
    const chats = await serializeChats(user.id)
    const updatedChat = await getChat(user.id, chat.id)

    return NextResponse.json({
      reply,
      messages: updated.map((m) => ({
        id: m.id,
        role: m.role,
        content: m.content,
        created_at: m.created_at,
      })),
      chats,
      activeChatId: chat.id,
      chat: updatedChat
        ? {
            id: updatedChat.id,
            title: updatedChat.title,
            created_at: updatedChat.created_at,
            updated_at: updatedChat.updated_at,
          }
        : null,
      workspace,
    })
  } catch (error) {
    console.error("SleekCRM assistant error:", error)
    return NextResponse.json({ error: "SleekCRM assistant failed to respond" }, { status: 500 })
  }
}
