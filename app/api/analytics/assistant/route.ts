import { type NextRequest, NextResponse } from "next/server"
import OpenAI from "openai"
import { getCurrentUser } from "@/lib/supabase/auth"
import { supabaseAdmin as supabase } from "@/lib/supabase/server"
import {
  CRM_OPENAI_TOOLS,
  DEFAULT_AGENT_SKILLS,
  buildCRMAgentContext,
  callCRMTool,
  executeCRMAction,
  formatAgentContext,
  openAIToolNameToCRM,
  type CRMAgentContext,
  type CRMActionProposal,
} from "@/lib/crm-agent-tools"

export const runtime = "nodejs"

const client = new OpenAI({
  apiKey: process.env.OPENROUTER_KEY || "",
  baseURL: "https://openrouter.ai/api/v1",
})

const MODEL = process.env.OPENROUTER_MODEL || "google/gemma-4-31b-it:free"
const MAX_STORED_MESSAGES = 44
const MAX_CONTEXT_CHARS = 12000
const COMPRESS_BATCH = 12

const SYSTEM_PROMPT = `
You are SleekCRM Agent, an approval-gated CRM operator.

Core loop:
1. Investigate Supabase CRM data through MCP tool calls.
2. Form grounded insights from customers, custom objects, dynamic records, engagement events, surveys, forms, emails, SMS scaffolds, donations, events, automations, reports, integrations, and settings where permitted.
3. Recommend concrete CRM tasks, draft messages, draft reports, draft automations, donor follow-ups, event follow-ups, and record updates with reasoning and evidence.
4. Ask for approval before external or destructive action.
5. After approval, summarize execution result.

Rules:
- Never claim an action was executed unless the API reports completion.
- Never invent customers, quotes, counts, survey answers, emails, or analysis results.
- Query Supabase with CRM MCP tools when record details are needed. Do not ask the user for data that tools can fetch.
- Do not dump broad record lists into the answer. Query narrowly and summarize.
- You may update scoped CRM records when the user explicitly asks for cleanup/import/update work.
- Prefer direct, operational writing.
- Distinguish insight, evidence, proposed action, and next approval step.
- If cached analysis was used, mention that it came from the recent Supabase analysis cache.
- If evidence is thin, say what data is missing and propose the smallest next data-gathering task.
- Do not claim HIPAA or FERPA compliance. Say compliance-readiness unless legal, deployment, policy, and contract controls are verified outside the app.
`.trim()

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

type ChatMessage = {
  role: "system" | "user" | "assistant" | "tool"
  content: string
  tool_call_id?: string
  tool_calls?: any[]
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

async function cleanupEmptyChats(userId: string, excludeChatId?: string) {
  const { data } = await supabase
    .from("analytics_assistant_chats")
    .select("id, created_at, updated_at")
    .eq("user_id", userId)

  const idsToDelete = (data || [])
    .filter((chat: any) => chat.created_at === chat.updated_at && chat.id !== excludeChatId)
    .map((chat: any) => chat.id)

  if (idsToDelete.length > 0) {
    await supabase.from("analytics_assistant_chats").delete().in("id", idsToDelete)
  }
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

async function createChat(userId: string, title = "CRM agent session"): Promise<DbChat | null> {
  const now = new Date().toISOString()
  const { data, error } = await supabase
    .from("analytics_assistant_chats")
    .insert({ user_id: userId, title: title.slice(0, 72), rolling_summary: "", created_at: now, updated_at: now })
    .select("id, user_id, title, rolling_summary, created_at, updated_at")
    .single()

  if (error) {
    console.error("createChat:", error)
    return null
  }
  return data as DbChat
}

async function resolveChat(userId: string, chatId?: string, title?: string): Promise<DbChat | null> {
  if (chatId) {
    const chat = await getChat(userId, chatId)
    if (chat) return chat
  }
  const latest = await getLatestChat(userId)
  return latest || createChat(userId, title)
}

async function touchChat(chatId: string, title?: string) {
  const updates: Record<string, any> = { updated_at: new Date().toISOString() }
  if (title) updates.title = title.slice(0, 72)
  await supabase.from("analytics_assistant_chats").update(updates).eq("id", chatId)
}

async function getRollingSummary(chatId: string): Promise<string> {
  const { data } = await supabase.from("analytics_assistant_chats").select("rolling_summary").eq("id", chatId).maybeSingle()
  return (data?.rolling_summary as string) || ""
}

async function setRollingSummary(chatId: string, summary: string) {
  await supabase
    .from("analytics_assistant_chats")
    .update({ rolling_summary: summary, updated_at: new Date().toISOString() })
    .eq("id", chatId)
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
  return messages.reduce((sum, message) => sum + (message.content?.length || 0), 0)
}

function shouldCompress(messages: DbMessage[]) {
  return messages.length > MAX_STORED_MESSAGES || totalChars(messages) > MAX_CONTEXT_CHARS
}

async function mergeSummaries(prev: string, transcript: string): Promise<string> {
  try {
    if (!process.env.OPENROUTER_KEY) throw new Error("OPENROUTER_KEY is missing")
    const response = await client.chat.completions.create({
      model: MODEL,
      temperature: 0.2,
      messages: [
        {
          role: "system",
          content:
            "Compress CRM agent chat history. Preserve goals, grounded findings, proposed actions, approvals, rejected actions, and open questions. Plain text only.",
        },
        { role: "user", content: `Prior summary:\n${prev || "(none)"}\n\nTranscript:\n${transcript.slice(0, 12000)}` },
      ],
    })
    const out = response.choices[0]?.message?.content?.trim()
    if (out) return out
  } catch (error) {
    console.warn("mergeSummaries fallback:", error)
  }
  return [prev, transcript.slice(0, 4000)].filter(Boolean).join("\n---\n").slice(0, 8000)
}

async function ensureWithinLimits(chatId: string) {
  for (let round = 0; round < 20; round += 1) {
    const messages = await listMessages(chatId)
    if (!shouldCompress(messages)) break
    const batch = messages.slice(0, Math.min(COMPRESS_BATCH, messages.length))
    const transcript = batch.map((message) => `${message.role}: ${message.content}`).join("\n")
    const merged = await mergeSummaries(await getRollingSummary(chatId), transcript)
    await setRollingSummary(chatId, merged)
    await supabase.from("analytics_assistant_messages").delete().in("id", batch.map((message) => message.id))
  }
}

function enabledSkillPrompt(enabledSkillIds?: string[]) {
  const enabled = DEFAULT_AGENT_SKILLS.filter((skill) => enabledSkillIds?.includes(skill.id))
  if (enabled.length === 0) return "No custom skills enabled."
  return enabled.map((skill) => `Skill: ${skill.name}\nDescription: ${skill.description}\nInstructions: ${skill.instructions}`).join("\n\n")
}

function buildChatMessages(params: {
  rollingSummary: string
  messages: DbMessage[]
  userName?: string | null
  context: CRMAgentContext | null
  enabledSkillIds?: string[]
}): ChatMessage[] {
  const summaryBlock = params.rollingSummary ? `\nEarlier conversation summary:\n${params.rollingSummary}` : ""
  const userBlock = params.userName ? `\nUser display name: ${params.userName}` : ""
  return [
    {
      role: "system",
      content: `${SYSTEM_PROMPT}\n\nEnabled lightweight skills:\n${enabledSkillPrompt(params.enabledSkillIds)}\n\nCRM tool context:\n${formatAgentContext(params.context)}${summaryBlock}${userBlock}`,
    },
    ...params.messages.map((message): ChatMessage => ({
      role: message.role === "assistant" ? "assistant" : "user",
      content: message.content,
    })),
  ]
}

function parseToolArguments(value: string | null | undefined) {
  if (!value) return {}
  try {
    return JSON.parse(value)
  } catch {
    return {}
  }
}

function toolResultText(result: unknown) {
  const text = typeof result === "string" ? result : JSON.stringify(result, null, 2)
  return text.length > 16000 ? `${text.slice(0, 16000)}\n...[truncated]` : text
}

async function runAgentCompletion(params: {
  user: any
  request: NextRequest
  messages: ChatMessage[]
}) {
  const messages: any[] = [...params.messages]

  for (let round = 0; round < 8; round += 1) {
    const response = await client.chat.completions.create({
      model: MODEL,
      messages,
      temperature: 0.35,
      tools: CRM_OPENAI_TOOLS as any,
      tool_choice: "auto",
    })

    const message = response.choices[0]?.message as any
    const toolCalls = message?.tool_calls || []
    if (!toolCalls.length) return typeof message?.content === "string" ? message.content.trim() : ""

    messages.push({
      role: "assistant",
      content: message.content || "",
      tool_calls: toolCalls,
    })

    for (const toolCall of toolCalls) {
      const toolName = openAIToolNameToCRM(toolCall.function?.name || "")
      const args = parseToolArguments(toolCall.function?.arguments)
      let result: unknown
      try {
        result = await callCRMTool(params.user, toolName, args, params.request)
      } catch (error: any) {
        result = { error: error?.message || "Tool call failed" }
      }
      messages.push({
        role: "tool",
        tool_call_id: toolCall.id,
        content: toolResultText(result),
      })
    }
  }

  return "I reached the CRM tool-call limit before finishing. Narrow the request or approve a specific action."
}

function fallbackReply(context: CRMAgentContext | null) {
  if (!context) return "I could not load CRM data. Check Supabase configuration and try again."
  const lines = [
    `I inspected ${context.snapshot.customerCount} customers, ${context.snapshot.responseCount} survey responses, and ${context.snapshot.emailCount} saved emails.`,
  ]
  const pain = context.analyses.find((analysis) => analysis.type === "pain_points")?.result.painPoints?.[0]
  const churn = context.analyses.find((analysis) => analysis.type === "churn_risk")?.result.atRiskCustomers?.[0]
  if (pain) lines.push(`Top pain point: ${pain.theme} with ${pain.count} mention(s).`)
  if (churn) lines.push(`Highest churn risk: ${churn.name}, score ${churn.riskScore}.`)
  if (context.proposals[0]) lines.push(`Proposed action: ${context.proposals[0].title}. Review and approve before execution.`)
  return lines.join("\n")
}

async function serializeChats(userId: string) {
  return listChats(userId)
}

export async function GET(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const chatId = request.nextUrl.searchParams.get("chatId") || undefined
    const context = await buildCRMAgentContext(user, "current CRM overview", request)
    const chat = chatId ? await getChat(user.id, chatId) : await getLatestChat(user.id)

    await cleanupEmptyChats(user.id, chat?.id)

    const [chats, messages] = await Promise.all([serializeChats(user.id), chat ? listMessages(chat.id) : Promise.resolve([])])

    return NextResponse.json({
      chats,
      activeChatId: chat?.id || null,
      messages: messages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        created_at: message.created_at,
      })),
      context,
      workspace: context,
      toolStatuses: context.statuses,
      proposals: context.proposals,
      skills: DEFAULT_AGENT_SKILLS,
    })
  } catch (error) {
    console.error("Assistant GET error:", error)
    return NextResponse.json({ error: "Failed to load CRM agent" }, { status: 500 })
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const body = (await request.json().catch(() => ({}))) as {
      content?: string
      mode?: "chat" | "execute_action" | "refresh" | "new_chat"
      chatId?: string
      action?: CRMActionProposal
      enabledSkills?: string[]
      stream?: boolean
    }

    const mode = body.mode || (body.content ? "chat" : "refresh")

    if (mode === "new_chat" || mode === "refresh") {
      const context = await buildCRMAgentContext(user, "current CRM overview", request)
      const chat = mode === "new_chat" ? await createChat(user.id, "CRM agent session") : await resolveChat(user.id, body.chatId, "CRM agent session")
      await cleanupEmptyChats(user.id, chat?.id)
      const chats = await serializeChats(user.id)
      const messages = chat ? await listMessages(chat.id) : []

      return NextResponse.json({
        chat,
        activeChatId: chat?.id || null,
        chats,
        messages: messages.map((message) => ({ id: message.id, role: message.role, content: message.content, created_at: message.created_at })),
        context,
        workspace: context,
        toolStatuses: context.statuses,
        proposals: context.proposals,
        skills: DEFAULT_AGENT_SKILLS,
      })
    }

    if (mode === "execute_action") {
      if (!body.action) return NextResponse.json({ error: "action is required" }, { status: 400 })
      const result = await executeCRMAction(user, body.action, request)
      const context = await buildCRMAgentContext(user, `execution result for ${body.action.title}`, request)
      const chat = await resolveChat(user.id, body.chatId, "CRM agent session")

      const confirmation = result.ok
        ? `Completed action: ${body.action.title}. ${result.message}`
        : `Action failed: ${body.action.title}. ${result.error}`

      if (chat) {
        await supabase.from("analytics_assistant_messages").insert({
          user_id: user.id,
          chat_id: chat.id,
          role: "assistant",
          content: confirmation,
          created_at: new Date().toISOString(),
        })
        await touchChat(chat.id)
      }

      const chats = await serializeChats(user.id)
      const messages = chat ? await listMessages(chat.id) : []
      return NextResponse.json({
        reply: confirmation,
        result,
        context,
        workspace: context,
        toolStatuses: context.statuses,
        proposals: context.proposals,
        chats,
        activeChatId: chat?.id || null,
        messages: messages.map((message) => ({ id: message.id, role: message.role, content: message.content, created_at: message.created_at })),
      })
    }

    const content = typeof body.content === "string" ? body.content.trim() : ""
    if (!content) return NextResponse.json({ error: "content is required for chat messages" }, { status: 400 })

    const context = await buildCRMAgentContext(user, content, request)
    const firstTitle = content.length > 8 ? content : context.proposals[0]?.title || "CRM agent session"
    const chat = await resolveChat(user.id, body.chatId, firstTitle)
    if (!chat) return NextResponse.json({ error: "Failed to create chat" }, { status: 500 })

    await ensureWithinLimits(chat.id)

    await supabase.from("analytics_assistant_messages").insert({
      user_id: user.id,
      chat_id: chat.id,
      role: "user",
      content,
      created_at: new Date().toISOString(),
    })
    await touchChat(chat.id, chat.title === "CRM agent session" ? firstTitle : undefined)

    const rollingSummary = await getRollingSummary(chat.id)
    const messages = await listMessages(chat.id)
    const inputMessages = buildChatMessages({
      rollingSummary,
      messages,
      userName: user.name,
      context,
      enabledSkillIds: body.enabledSkills,
    })

    if (body.stream) {
      const encoder = new TextEncoder()

      return new Response(
        new ReadableStream({
          async start(controller) {
            const send = (event: string, payload: Record<string, unknown>) => {
              controller.enqueue(encoder.encode(`event: ${event}\ndata: ${JSON.stringify(payload)}\n\n`))
            }

            let reply = ""

            send("context", {
              context,
              workspace: context,
              toolStatuses: context.statuses,
              proposals: context.proposals,
              activeChatId: chat.id,
              skills: DEFAULT_AGENT_SKILLS,
            })

            try {
              if (!process.env.OPENROUTER_KEY) throw new Error("OPENROUTER_KEY is missing")
              reply = await runAgentCompletion({ user, request, messages: inputMessages })
              if (reply) send("delta", { delta: reply })
            } catch (error) {
              console.warn("Assistant stream failed, using fallback:", error)
            }

            if (!reply) {
              reply = fallbackReply(context)
              send("delta", { delta: reply })
            }

            await supabase.from("analytics_assistant_messages").insert({
              user_id: user.id,
              chat_id: chat.id,
              role: "assistant",
              content: reply,
              created_at: new Date().toISOString(),
            })

            await touchChat(chat.id)
            await ensureWithinLimits(chat.id)

            const [updatedMessages, chats, updatedChat] = await Promise.all([listMessages(chat.id), serializeChats(user.id), getChat(user.id, chat.id)])

            send("done", {
              reply,
              messages: updatedMessages.map((message) => ({
                id: message.id,
                role: message.role,
                content: message.content,
                created_at: message.created_at,
              })),
              chats,
              activeChatId: chat.id,
              chat: updatedChat,
              context,
              workspace: context,
              toolStatuses: context.statuses,
              proposals: context.proposals,
              skills: DEFAULT_AGENT_SKILLS,
            })
            controller.close()
          },
        }),
        {
          headers: {
            "Content-Type": "text/event-stream; charset=utf-8",
            "Cache-Control": "no-cache, no-transform",
            Connection: "keep-alive",
          },
        },
      )
    }

    let reply = ""
    try {
      if (!process.env.OPENROUTER_KEY) throw new Error("OPENROUTER_KEY is missing")
      reply = await runAgentCompletion({ user, request, messages: inputMessages })
    } catch (error) {
      console.warn("Assistant model failed, using fallback:", error)
    }

    if (!reply) reply = fallbackReply(context)

    await supabase.from("analytics_assistant_messages").insert({
      user_id: user.id,
      chat_id: chat.id,
      role: "assistant",
      content: reply,
      created_at: new Date().toISOString(),
    })

    await touchChat(chat.id)
    await ensureWithinLimits(chat.id)

    const [updatedMessages, chats, updatedChat] = await Promise.all([listMessages(chat.id), serializeChats(user.id), getChat(user.id, chat.id)])

    return NextResponse.json({
      reply,
      messages: updatedMessages.map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
        created_at: message.created_at,
      })),
      chats,
      activeChatId: chat.id,
      chat: updatedChat,
      context,
      workspace: context,
      toolStatuses: context.statuses,
      proposals: context.proposals,
      skills: DEFAULT_AGENT_SKILLS,
    })
  } catch (error) {
    console.error("SleekCRM agent error:", error)
    return NextResponse.json({ error: "SleekCRM agent failed to respond" }, { status: 500 })
  }
}

export async function DELETE(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const chatId = request.nextUrl.searchParams.get("chatId")
    if (!chatId) return NextResponse.json({ error: "chatId required" }, { status: 400 })

    await supabase.from("analytics_assistant_chats").delete().eq("user_id", user.id).eq("id", chatId)
    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Assistant DELETE error:", error)
    return NextResponse.json({ error: "Failed to delete chat" }, { status: 500 })
  }
}
