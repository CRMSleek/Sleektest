"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  ArrowUpRight,
  Bot,
  CheckCircle2,
  Download,
  FileText,
  Mail,
  Paperclip,
  Plus,
  RefreshCw,
  Send,
  Sparkles,
  Users,
  Wand2,
  MessageSquareText,
  X,
  MessageSquare,
  Clock,
  Trash2,
} from "lucide-react"
import Link from "next/link"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import { InteractivePromptBlock } from "@/components/dashboard/agent-interactive-prompt"
import { parseInteractiveFromAssistant } from "@/lib/agent-interactive-prompts"

type MetricWithChange = {
  value: number
  change: number
}

type AnalyticsData = {
  metrics?: {
    totalResponses?: MetricWithChange
    totalSurveyOpens?: MetricWithChange
    avgSatisfaction?: MetricWithChange
    completionRate?: MetricWithChange
    activeCustomers?: MetricWithChange
    totalCustomers?: MetricWithChange
    totalSurveys?: MetricWithChange
  }
  responseTrends?: Array<{ date: string; count: number }>
  customerGrowth?: Array<{ date: string; count: number }>
  ageDemographics?: Array<{ age: string; count: number }>
  locationDistribution?: Array<{ location: string; count: number }>
  satisfactionTrends?: Array<{ date: string; rating: number }>
  recentActivity?: Array<{
    id: string
    surveyTitle: string
    customerName: string
    customerEmail: string
    submittedAt: string
  }>
}

type TaskKey = "survey" | "email" | "customers" | "export"

type AgentMessage = {
  id: string
  role: "assistant" | "user"
  content: string
  attachments?: UploadedFile[]
}

type ChatItem = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

type TaskItem = {
  key: TaskKey
  priority: number
  title: string
  summary: string
  detail: string
  prompt: string
  icon: LucideIcon
}

type AssistantResponse = {
  reply?: string
  messages?: Array<{ id: string; role: "assistant" | "user"; content: string }>
  workspace?: AnalyticsData
  chats?: ChatItem[]
  activeChatId?: string
  chat?: ChatItem
  error?: string
}

type UploadedFile = {
  id: string
  name: string
  size: number
  type: string
  dataUrl: string
}

const WELCOME: AgentMessage = {
  id: "welcome",
  role: "assistant",
  content: "Pick a task, then run it.",
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35 },
  }),
}

const modalVariants = {
  hidden: { opacity: 0, scale: 0.95 },
  visible: { opacity: 1, scale: 1, transition: { duration: 0.2, ease: "easeOut" as const } },
  exit: { opacity: 0, scale: 0.95, transition: { duration: 0.15, ease: "easeIn" as const } },
}

function csvEscape(value: unknown) {
  const text = value == null ? "" : String(value)
  return `"${text.replace(/"/g, '""')}"`
}

function downloadCsv(filename: string, rows: Array<Record<string, string | number>>) {
  if (rows.length === 0) return

  const headers = Array.from(new Set(rows.flatMap((row) => Object.keys(row))))
  const csv = [
    headers.join(","),
    ...rows.map((row) => headers.map((header) => csvEscape(row[header] ?? "")).join(",")),
  ].join("\n")

  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = filename
  link.click()
  URL.revokeObjectURL(url)
}

function buildPlaceholderRows(data: AnalyticsData | null) {
  const rows: Array<Record<string, string | number>> = []
  const metrics = data?.metrics

  if (metrics) {
    rows.push(
      { dataset: "metrics", label: "totalResponses", value: metrics.totalResponses?.value ?? 0, change: metrics.totalResponses?.change ?? 0 },
      { dataset: "metrics", label: "totalSurveyOpens", value: metrics.totalSurveyOpens?.value ?? 0, change: metrics.totalSurveyOpens?.change ?? 0 },
      { dataset: "metrics", label: "avgSatisfaction", value: metrics.avgSatisfaction?.value ?? 0, change: metrics.avgSatisfaction?.change ?? 0 },
      { dataset: "metrics", label: "completionRate", value: metrics.completionRate?.value ?? 0, change: metrics.completionRate?.change ?? 0 },
      { dataset: "metrics", label: "activeCustomers", value: metrics.activeCustomers?.value ?? metrics.totalCustomers?.value ?? 0, change: metrics.activeCustomers?.change ?? 0 },
    )
  }

  data?.responseTrends?.forEach((row) => rows.push({ dataset: "responseTrends", label: row.date, value: row.count }))
  data?.customerGrowth?.forEach((row) => rows.push({ dataset: "customerGrowth", label: row.date, value: row.count }))
  data?.ageDemographics?.forEach((row) => rows.push({ dataset: "ageDemographics", label: row.age, value: row.count }))
  data?.locationDistribution?.forEach((row) => rows.push({ dataset: "locationDistribution", label: row.location, value: row.count }))
  data?.satisfactionTrends?.forEach((row) => rows.push({ dataset: "satisfactionTrends", label: row.date, value: row.rating }))
  data?.recentActivity?.forEach((row) =>
    rows.push({
      dataset: "recentActivity",
      label: row.customerName,
      value: row.surveyTitle,
      change: row.submittedAt,
    }),
  )

  return rows
}

function parseAgentMessage(content: string) {
  const parsed = parseInteractiveFromAssistant(content)
  return { textContent: parsed.text || content.trim(), interactive: parsed.interactive }
}

function deriveTasks(data: AnalyticsData | null): TaskItem[] {
  const totalResponses = data?.metrics?.totalResponses?.value ?? 0
  const avgSatisfaction = data?.metrics?.avgSatisfaction?.value ?? 0
  const activeCustomers = data?.metrics?.activeCustomers?.value ?? 0
  const totalSurveys = data?.metrics?.totalSurveys?.value ?? 0
  const hasRecentActivity = (data?.recentActivity || []).length > 0
  const hasCustomerBase = activeCustomers > 0

  const tasks: TaskItem[] = [
    {
      key: "survey",
      priority: totalResponses === 0 ? 1 : totalResponses < 10 ? 2 : 4,
      title: totalSurveys === 0 ? "Create first customer survey" : "Tighten survey feedback loop",
      summary:
        totalResponses === 0
          ? "No response volume yet. Start with a short survey."
          : "Survey activity exists. Use the next run to narrow the gap.",
      detail:
        totalResponses === 0
          ? "Build a short survey with three focused questions so the agent can collect a baseline."
          : "Review the current survey flow and run a tighter version that targets the biggest response gap.",
      prompt:
        totalResponses === 0
          ? "Create a short customer survey with three questions that surfaces the biggest friction in the current workspace."
          : "Refine the current survey strategy and propose the smallest change that will improve response quality.",
      icon: FileText,
    },
    {
      key: "email",
      priority: avgSatisfaction < 4 ? 1 : 3,
      title: avgSatisfaction < 4 ? "Draft a re-engagement email" : "Segment follow-up email",
      summary:
        avgSatisfaction < 4
          ? "The satisfaction signal is weak. Send a direct follow-up."
          : "Satisfaction looks stable. Use email to keep the strongest accounts moving.",
      detail:
        avgSatisfaction < 4
          ? "The agent should draft a message that asks what changed and what needs to be fixed first."
          : "The agent should draft a targeted follow-up for the best customer segment in the workspace.",
      prompt:
        avgSatisfaction < 4
          ? "Draft a concise re-engagement email for customers with recent low satisfaction signals."
          : "Draft a segmented follow-up email for customers who look most ready for a next step.",
      icon: Mail,
    },
    {
      key: "customers",
      priority: hasCustomerBase ? 2 : 5,
      title: hasCustomerBase ? "Review customer coverage" : "Load customer records",
      summary:
        hasCustomerBase
          ? "There are active customers to inspect. Tighten relationships and next steps."
          : "The workspace is sparse. The first job is to get customer data in place.",
      detail:
        hasCustomerBase
          ? "Open the customer coverage task and ask the agent where relationships are thin or stale."
          : "Ask the agent to identify the smallest customer import or cleanup that will unblock the workspace.",
      prompt:
        hasCustomerBase
          ? "Review customer relationships and identify the accounts that need attention first."
          : "Identify the smallest customer data cleanup needed to make the workspace useful.",
      icon: Users,
    },
    {
      key: "export",
      priority: hasRecentActivity ? 4 : 6,
      title: "Export current workspace",
      summary: hasRecentActivity ? "Export once, from one place." : "One CSV export is enough for handoff.",
      detail:
        hasRecentActivity
          ? "Use this task when you need the current workspace in CSV form for review or handoff."
          : "This stays available, but it should not repeat across the panel.",
      prompt: "Export the current workspace as CSV.",
      icon: Download,
    },
  ]

  return tasks.sort((a, b) => a.priority - b.priority || a.title.localeCompare(b.title))
}

function formatChatLabel(chat: ChatItem) {
  return chat.title || "Insight chat"
}

function formatChatTime(value: string) {
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function formatFileSize(bytes: number) {
  if (bytes < 1024) return `${bytes} B`
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`
}

// ─── Chat History Modal ────────────────────────────────────────────────────────
function ChatHistoryModal({
  open,
  onClose,
  chats,
  activeChatId,
  loading,
  sending,
  onOpenChat,
  onNewChat,
  onDeleteChat,
}: {
  open: boolean
  onClose: () => void
  chats: ChatItem[]
  activeChatId: string | null
  loading: boolean
  sending: boolean
  onOpenChat: (id: string) => void
  onNewChat: () => void
  onDeleteChat: (id: string) => void
}) {
  return (
    <AnimatePresence>
      {open && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 bg-black/40 backdrop-blur-sm"
            onClick={onClose}
          />

          {/* Modal panel */}
          <motion.div
            variants={modalVariants}
            initial="hidden"
            animate="visible"
            exit="exit"
            className="relative z-10 w-full max-w-sm rounded-2xl border border-primary/20 bg-background/98 shadow-2xl backdrop-blur-xl"
          >
            {/* Header */}
            <div className="flex items-center justify-between border-b border-primary/10 px-5 py-4">
              <div className="flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-primary" />
                <p className="font-semibold text-sm">Chat History</p>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  size="sm"
                  variant="outline"
                  onClick={onNewChat}
                  disabled={loading || sending}
                  className="h-7 gap-1.5 rounded-full px-3 text-xs"
                >
                  <Plus className="h-3 w-3" />
                  New chat
                </Button>
                <button
                  type="button"
                  onClick={onClose}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-background text-muted-foreground shadow-sm transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>

            {/* List */}
            <ScrollArea className="max-h-80">
              <div className="space-y-1.5 p-3">
                {chats.length > 0 ? (
                  chats.map((chat) => {
                    const active = chat.id === activeChatId
                    return (
                      <button
                        key={chat.id}
                        type="button"
                        onClick={() => {
                          onOpenChat(chat.id)
                          onClose()
                        }}
                        className={`flex w-full items-center gap-3 rounded-xl border px-3 py-2.5 text-left transition-colors ${
                          active
                            ? "border-primary/30 bg-primary/8"
                            : "border-primary/10 bg-background hover:bg-muted/50"
                        }`}
                      >
                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                          <MessageSquare className="h-3.5 w-3.5" />
                        </div>
                        <div className="min-w-0 flex-1">
                          <p className="truncate text-sm font-medium">{formatChatLabel(chat)}</p>
                          <div className="flex items-center gap-1 mt-0.5">
                            <Clock className="h-3 w-3 text-muted-foreground" />
                            <p className="text-xs text-muted-foreground">{formatChatTime(chat.updated_at)}</p>
                          </div>
                        </div>
                        {active && <Badge variant="secondary" className="shrink-0 text-xs">Current</Badge>}
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation()
                            onDeleteChat(chat.id)
                          }}
                          className="shrink-0 rounded-full p-1.5 text-muted-foreground/60 transition-colors hover:bg-destructive/10 hover:text-destructive"
                          title="Delete chat"
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </button>
                      </button>
                    )
                  })
                ) : (
                  <div className="flex flex-col items-center gap-2 py-8 text-center">
                    <MessageSquare className="h-8 w-8 text-muted-foreground/40" />
                    <p className="text-sm text-muted-foreground">No previous chats yet.</p>
                    <p className="text-xs text-muted-foreground/60">Start a new chat to get going.</p>
                  </div>
                )}
              </div>
            </ScrollArea>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  )
}

// ─── Main Component ────────────────────────────────────────────────────────────
export function AnalyticsAgentTab({ closeHref }: { closeHref?: string } = {}) {
  const [hasStarted, setHasStarted] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [messages, setMessages] = useState<AgentMessage[]>([WELCOME])
  const [chats, setChats] = useState<ChatItem[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [selectedTask, setSelectedTask] = useState<TaskKey | null>(null)
  const [completedTasks, setCompletedTasks] = useState<Record<TaskKey, boolean>>({
    survey: false,
    email: false,
    customers: false,
    export: false,
  })
  const [input, setInput] = useState("")
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState("")
  const [chatHistoryOpen, setChatHistoryOpen] = useState(false)
  const [attachments, setAttachments] = useState<UploadedFile[]>([])
  const [answeredInteractions, setAnsweredInteractions] = useState<Record<string, string>>({})
  const fileInputRef = useRef<HTMLInputElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  // ─── Draggable divider state ────────────────────────────────────────────────
  const containerRef = useRef<HTMLDivElement>(null)
  const [leftWidthPct, setLeftWidthPct] = useState(60) // percent
  const isDragging = useRef(false)
  const dragStartX = useRef(0)
  const dragStartPct = useRef(0)

  const tasks = useMemo(() => deriveTasks(data), [data])
  const activeTask = tasks.find((task) => task.key === selectedTask) || tasks[0]
  const activeChat = chats.find((chat) => chat.id === activeChatId) || null

  // Auto-scroll to bottom on new messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  // ─── Drag handlers ──────────────────────────────────────────────────────────
  const onDividerMouseDown = useCallback((e: React.MouseEvent) => {
    e.preventDefault()
    isDragging.current = true
    dragStartX.current = e.clientX
    dragStartPct.current = leftWidthPct
    document.body.style.cursor = "col-resize"
    document.body.style.userSelect = "none"
  }, [leftWidthPct])

  useEffect(() => {
    const onMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return
      const containerWidth = containerRef.current.offsetWidth
      const delta = e.clientX - dragStartX.current
      const deltaPct = (delta / containerWidth) * 100
      const newPct = Math.min(70, Math.max(20, dragStartPct.current + deltaPct))
      setLeftWidthPct(newPct)
    }
    const onMouseUp = () => {
      if (!isDragging.current) return
      isDragging.current = false
      document.body.style.cursor = ""
      document.body.style.userSelect = ""
    }
    window.addEventListener("mousemove", onMouseMove)
    window.addEventListener("mouseup", onMouseUp)
    return () => {
      window.removeEventListener("mousemove", onMouseMove)
      window.removeEventListener("mouseup", onMouseUp)
    }
  }, [])

  // ─── Data loading ───────────────────────────────────────────────────────────
  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) throw new Error("Failed to load analytics data")
      const json = (await response.json()) as AnalyticsData
      setData(json)
    } catch (error) {
      console.error("Analytics agent data load failed:", error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  const loadChat = async (chatId?: string) => {
    try {
      const url = chatId ? `/api/analytics/assistant?chatId=${encodeURIComponent(chatId)}` : "/api/analytics/assistant"
      const response = await fetch(url, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      })

      const json = (await response.json()) as {
        messages?: Array<{ id: string; role: "assistant" | "user"; content: string }>
        chats?: ChatItem[]
        activeChatId?: string
        workspace?: AnalyticsData
        error?: string
      }

      if (!response.ok) throw new Error(json.error || "Failed to load chat")

      setData((prev) => json.workspace || prev)
      setChats(json.chats || [])
      setActiveChatId(json.activeChatId || chatId || null)

      const history = (json.messages || []).map((message) => ({
        id: message.id,
        role: message.role,
        content: message.content,
      }))

      setMessages(history.length > 0 ? history : [WELCOME])
      return json.activeChatId || chatId || null
    } catch (error) {
      console.error("Chat load failed:", error)
      setMessages([WELCOME])
      setChats([])
      setActiveChatId(null)
      return null
    }
  }

  useEffect(() => {
    void loadAnalytics()
    void (async () => {
      setHasStarted(true)
      await loadChat()
    })()
  }, [])

  const activateAgent = async () => {
    setHasStarted(true)
    setStatus("Creating new chat...")
    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "new_chat" }),
      })
      const json = (await response.json()) as AssistantResponse

      if (!response.ok) throw new Error(json.error || "Failed to create chat")

      setData(json.workspace || null)
      setChats(json.chats || [])
      setActiveChatId(json.activeChatId || json.chat?.id || null)
      setMessages([WELCOME])
      setSelectedTask(tasks[0]?.key || null)
      setStatus("")
      await loadChat(json.activeChatId || json.chat?.id || undefined)
    } catch (error) {
      console.error("New chat failed:", error)
      setStatus("Could not create a new chat.")
    }
  }

  const selectTask = (task: TaskKey) => {
    setSelectedTask(task)
  }

  const exportAll = () => {
    const rows = buildPlaceholderRows(data)
    downloadCsv("analytics-export.csv", rows)
    setCompletedTasks((prev) => ({ ...prev, export: true }))
    setStatus("CSV exported.")
  }

  // ─── File upload ─────────────────────────────────────────────────────────────
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || [])
    files.forEach((file) => {
      const reader = new FileReader()
      reader.onload = (event) => {
        const dataUrl = event.target?.result as string
        setAttachments((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            name: file.name,
            size: file.size,
            type: file.type,
            dataUrl,
          },
        ])
      }
      reader.readAsDataURL(file)
    })
    // Reset the input so the same file can be re-uploaded
    if (fileInputRef.current) fileInputRef.current.value = ""
  }

  const removeAttachment = (id: string) => {
    setAttachments((prev) => prev.filter((f) => f.id !== id))
  }

  // ─── Chat sending ─────────────────────────────────────────────────────────────
  const sendChat = async (content: string) => {
    const trimmed = content.trim()
    if ((!trimmed && attachments.length === 0) || sending) return

    if (!hasStarted) setHasStarted(true)

    const optimisticUserMessage: AgentMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed || (attachments.length > 0 ? `[Attached ${attachments.length} file(s)]` : ""),
      attachments: attachments.length > 0 ? [...attachments] : undefined,
    }

    setSending(true)
    setStatus("Thinking...")
    setMessages((prev) => [...prev, optimisticUserMessage])
    setInput("")
    setAttachments([])

    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          content: trimmed,
          mode: "chat",
          chatId: activeChatId,
          attachments: optimisticUserMessage.attachments?.map((f) => ({
            name: f.name,
            type: f.type,
            size: f.size,
          })),
        }),
      })

      const json = (await response.json()) as AssistantResponse

      if (!response.ok) throw new Error(json.error || "Failed to send message")

      setData(json.workspace || null)
      setChats(json.chats || [])
      setActiveChatId(json.activeChatId || activeChatId)

      if (Array.isArray(json.messages) && json.messages.length > 0) {
        setMessages(
          json.messages.map((message) => ({
            id: message.id,
            role: message.role,
            content: message.content,
          })),
        )
      } else if (json.reply) {
        setMessages((prev) => [
          ...prev,
          {
            id: crypto.randomUUID(),
            role: "assistant",
            content: json.reply ?? "Response received.",
          },
        ])
      }

      setStatus("")
    } catch (error) {
      console.error("Assistant send failed:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "The assistant could not respond just now. Check the model connection and try again.",
        },
      ])
      setStatus("Connection issue")
    } finally {
      setSending(false)
    }
  }

  const runTask = async (task: TaskItem) => {
    if (sending) return
    if (task.key === "export") {
      exportAll()
      return
    }
    await sendChat(task.prompt)
    setCompletedTasks((prev) => ({ ...prev, [task.key]: true }))
  }

  const openChat = async (chatId: string) => {
    setStatus("Loading chat...")
    const id = await loadChat(chatId)
    setActiveChatId(id)
    setStatus("")
  }

  const deleteChat = async (chatId: string) => {
    // Optimistic UI update
    setChats((prev) => prev.filter((c) => c.id !== chatId))
    if (activeChatId === chatId) {
      setActiveChatId(null)
      setMessages([WELCOME])
    }

    try {
      await fetch(`/api/analytics/assistant?chatId=${encodeURIComponent(chatId)}`, {
        method: "DELETE",
      })
    } catch (e) {
      console.error("Failed to delete chat:", e)
      // On failure, reload chats
      void loadChat(activeChatId || undefined)
    }
  }

  // ─── Main layout ──────────────────────────────────────────────────────────────
  return (
    <>
      {/* Chat History Modal */}
      <ChatHistoryModal
        open={chatHistoryOpen}
        onClose={() => setChatHistoryOpen(false)}
        chats={chats}
        activeChatId={activeChatId}
        loading={loading}
        sending={sending}
        onOpenChat={openChat}
        onNewChat={() => {
          setChatHistoryOpen(false)
          void activateAgent()
        }}
        onDeleteChat={deleteChat}
      />

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        multiple
        className="hidden"
        onChange={handleFileSelect}
        accept="*/*"
        id="agent-file-upload"
      />

      {/* Main two-panel container */}
      <div
        ref={containerRef}
        className="flex h-[100dvh] min-h-0 overflow-hidden bg-background"
      >
        {/* ── Left panel: Task checklist ─────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={0}
          style={{ width: `${leftWidthPct}%` }}
          className="flex min-h-0 min-w-0 flex-col border-r border-primary/10 bg-gradient-to-br from-background via-background to-muted/20"
        >
          {/* Compact top bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-primary/10 bg-background/95 px-5 py-3 backdrop-blur">
            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="gap-1">
                <Bot className="h-3.5 w-3.5" />
                Agent active
              </Badge>
              <Badge variant="outline">{activeChat ? `${formatChatLabel(activeChat)}` : "Ready"}</Badge>
            </div>
            <Button variant="outline" size="sm" onClick={activateAgent} disabled={loading || sending} className="h-7 gap-1.5 rounded-full px-3 text-xs">
              <Plus className="h-3 w-3" />
              New chat
            </Button>
          </div>

          {/* Task list */}
          <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-5 py-5">
            <div className="space-y-3">
              {tasks.map((task, index) => {
                const Icon = task.icon
                const isSelected = selectedTask === task.key
                const isComplete = completedTasks[task.key]

                return (
                  <motion.div key={task.key} initial="hidden" animate="visible" variants={fadeUp} custom={index}>
                    <Card className={`rounded-xl border transition-colors ${isSelected ? "border-primary/30 bg-background" : "border-primary/10 bg-background/80"}`}>
                      <CardHeader className="space-y-2 px-5 pt-4">
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2">
                            <div className="rounded-lg bg-primary/10 p-2 text-primary">
                              <Icon className="h-4 w-4" />
                            </div>
                            <CardTitle className="text-base">{task.title}</CardTitle>
                          </div>
                          <Badge variant="outline">#{task.priority}</Badge>
                        </div>
                        <CardDescription>{task.summary}</CardDescription>
                      </CardHeader>
                      <CardContent className="space-y-3 px-5 pb-4">
                        <div className="flex flex-wrap gap-2">
                          <Button size="sm" variant="outline" onClick={() => selectTask(task.key)}>
                            Complete task
                          </Button>
                          {task.key === "export" ? (
                            <Button size="sm" onClick={exportAll}>
                              <Download className="mr-2 h-4 w-4" />
                              Export CSV
                            </Button>
                          ) : null}
                          {isComplete ? (
                            <Badge variant="secondary" className="gap-1">
                              <CheckCircle2 className="h-3.5 w-3.5" />
                              Complete
                            </Badge>
                          ) : null}
                        </div>

                        {isSelected ? (
                          <div className="rounded-lg border bg-background/80 p-4">
                            <p className="text-sm font-medium">Task details</p>
                            <p className="mt-2 text-sm text-muted-foreground">{task.detail}</p>
                            <div className="mt-4 flex flex-wrap items-center gap-2">
                              <Button onClick={() => void runTask(task)} disabled={sending}>
                                <ArrowUpRight className="mr-2 h-4 w-4" />
                                Run
                              </Button>
                              <Badge variant="outline">Run the agent on this task</Badge>
                            </div>
                          </div>
                        ) : null}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </div>

            {/* Metrics strip */}
            <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1} className="mt-5">
              <Card className="rounded-xl border-primary/10 bg-transparent shadow-none">
                <CardContent className="grid gap-3 px-0 py-4 sm:grid-cols-4">
                  {[
                    ["Responses", data?.metrics?.totalResponses?.value ?? 0],
                    ["Opens", data?.metrics?.totalSurveyOpens?.value ?? 0],
                    ["Customers", data?.metrics?.activeCustomers?.value ?? 0],
                    ["Score", `${data?.metrics?.avgSatisfaction?.value?.toFixed(1) ?? "0.0"}/5`],
                  ].map(([label, value]) => (
                    <div key={String(label)} className="rounded-lg border border-primary/10 bg-background/80 p-4">
                      <p className="text-xs uppercase tracking-wide text-muted-foreground">{label}</p>
                      <p className="mt-1 text-xl font-semibold">{value}</p>
                    </div>
                  ))}
                </CardContent>
              </Card>
            </motion.div>

            {status ? (
              <div className="mt-2 flex items-start gap-2 rounded-lg border border-primary/10 bg-background/80 p-4 text-sm">
                <MessageSquareText className="mt-0.5 h-4 w-4 text-primary" />
                <p>{status}</p>
              </div>
            ) : null}
          </div>
        </motion.div>

        {/* ── Draggable divider ─────────────────────────────────────────────── */}
        <div
          onMouseDown={onDividerMouseDown}
          className="group relative z-10 flex w-1.5 shrink-0 cursor-col-resize items-center justify-center bg-primary/5 transition-colors hover:bg-primary/20"
          title="Drag to resize"
        >
          {/* Visual drag handle pip */}
          <div className="absolute flex h-10 w-3.5 flex-col items-center justify-center gap-0.5 rounded-full border border-primary/20 bg-background opacity-0 shadow-sm transition-opacity group-hover:opacity-100">
            <span className="h-0.5 w-1.5 rounded-full bg-primary/60" />
            <span className="h-0.5 w-1.5 rounded-full bg-primary/60" />
            <span className="h-0.5 w-1.5 rounded-full bg-primary/60" />
          </div>
        </div>

        {/* ── Right panel: Chat ─────────────────────────────────────────────── */}
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          custom={2}
          className="flex min-h-0 min-w-0 flex-1 flex-col bg-background"
        >
          {/* Slim chat top bar */}
          <div className="flex shrink-0 items-center justify-between border-b border-primary/10 bg-background/95 px-5 py-3 backdrop-blur">
            <div className="flex items-center gap-2 min-w-0">
              <Sparkles className="h-4 w-4 shrink-0 text-primary" />
              <p className="truncate text-sm font-semibold">
                {activeChat ? formatChatLabel(activeChat) : "Current chat"}
              </p>
              <Badge variant="outline" className="shrink-0">{sending ? "Working" : "Ready"}</Badge>
            </div>
            <div className="flex items-center gap-2">
              {/* Chat history button */}
              <Button
                variant="outline"
                size="sm"
                onClick={() => setChatHistoryOpen(true)}
                className="h-7 gap-1.5 rounded-full px-3 text-xs"
              >
                <MessageSquare className="h-3.5 w-3.5" />
                History
                {chats.length > 0 && (
                  <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-bold text-primary-foreground">
                    {chats.length}
                  </span>
                )}
              </Button>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => void loadChat(activeChatId || undefined)}
                disabled={loading || sending}
                className="h-7 w-7 rounded-full p-0"
              >
                <RefreshCw className="h-3.5 w-3.5" />
              </Button>
              {closeHref && (
                <Link
                  href={closeHref}
                  aria-label="Close agent"
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/20 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
                >
                  <X className="h-3.5 w-3.5" />
                </Link>
              )}
            </div>
          </div>

          {/* Messages area */}
          <ScrollArea className="min-h-0 flex-1">
            <div className="space-y-4 px-5 py-5">
              {messages.map((message, index) => {
                const { textContent, interactive } = message.role === "assistant"
                  ? parseAgentMessage(message.content)
                  : { textContent: message.content, interactive: null }
                const answeredLabel = answeredInteractions[message.id]

                return (
                  <motion.div
                    key={message.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    className={`flex flex-col ${message.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[85%] rounded-2xl px-4 py-3 text-sm leading-6 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border border-primary/10 bg-background/95"
                      }`}
                    >
                      {message.role === "user" ? (
                        textContent
                      ) : (
                        <ReactMarkdown
                          remarkPlugins={[remarkGfm]}
                          components={{
                            p: ({ node, ...props }) => <p className="mb-2 last:mb-0 leading-relaxed" {...props} />,
                            ul: ({ node, ...props }) => <ul className="mb-2 ml-4 list-disc space-y-1" {...props} />,
                            ol: ({ node, ...props }) => <ol className="mb-2 ml-4 list-decimal space-y-1" {...props} />,
                            li: ({ node, ...props }) => <li className="leading-relaxed" {...props} />,
                            a: ({ node, ...props }) => <a className="text-primary underline underline-offset-4 hover:text-primary/80" {...props} />,
                            strong: ({ node, ...props }) => <strong className="font-semibold text-foreground" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="mt-4 mb-2 font-semibold tracking-tight" {...props} />,
                            // @ts-ignore
                            code: ({ node, inline, ...props }) => 
                              inline ? (
                                <code className="rounded bg-muted px-1.5 py-0.5 font-mono text-xs text-muted-foreground" {...props} />
                              ) : (
                                <pre className="mt-2 mb-2 overflow-x-auto rounded-lg bg-muted/50 p-3">
                                  <code className="font-mono text-xs text-muted-foreground" {...props} />
                                </pre>
                              ),
                          }}
                        >
                          {textContent}
                        </ReactMarkdown>
                      )}
                      {/* Attachment previews */}
                      {message.attachments && message.attachments.length > 0 && (
                        <div className="mt-2 flex flex-wrap gap-2">
                          {message.attachments.map((file) => (
                            <div
                              key={file.id}
                              className={`flex items-center gap-1.5 rounded-lg px-2 py-1 text-xs ${
                                message.role === "user"
                                  ? "bg-primary-foreground/15 text-primary-foreground"
                                  : "border border-primary/10 bg-muted/50"
                              }`}
                            >
                              <Paperclip className="h-3 w-3" />
                              <span className="max-w-[120px] truncate">{file.name}</span>
                              <span className="opacity-60">({formatFileSize(file.size)})</span>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>

                    {/* Interactive Action Block */}
                    {interactive ? (
                      <InteractivePromptBlock
                        prompt={interactive}
                        disabled={sending || Boolean(answeredLabel)}
                        answeredLabel={answeredLabel}
                        onSelect={(value, label) => {
                          setAnsweredInteractions((current) => ({ ...current, [message.id]: label }))
                          void sendChat(value)
                        }}
                      />
                    ) : null}
                  </motion.div>
                )
              })}
              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          {/* Input area */}
          <div className="shrink-0 border-t border-primary/10 bg-background/98 p-4">
            {/* Attachment preview strip */}
            {attachments.length > 0 && (
              <div className="mb-3 flex flex-wrap gap-2">
                {attachments.map((file) => (
                  <div
                    key={file.id}
                    className="flex items-center gap-1.5 rounded-lg border border-primary/15 bg-muted/50 px-2.5 py-1.5 text-xs"
                  >
                    <Paperclip className="h-3 w-3 text-primary" />
                    <span className="max-w-[120px] truncate font-medium">{file.name}</span>
                    <span className="text-muted-foreground">({formatFileSize(file.size)})</span>
                    <button
                      type="button"
                      onClick={() => removeAttachment(file.id)}
                      className="ml-0.5 rounded-full p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground transition-colors"
                    >
                      <X className="h-3 w-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="relative">
              <Textarea
                placeholder="Ask the agent anything, or run a task..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void sendChat(input)
                  }
                }}
                className="min-h-[80px] resize-none rounded-2xl border-primary/15 bg-background/80 pb-12 pr-28"
              />

              {/* Bottom toolbar inside textarea */}
              <div className="absolute bottom-3 left-3 flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex h-7 w-7 items-center justify-center rounded-full border border-primary/15 bg-background text-muted-foreground transition-colors hover:bg-muted hover:text-primary"
                  title="Attach file"
                >
                  <Paperclip className="h-3.5 w-3.5" />
                </button>
                <span className="text-xs text-muted-foreground/60">Shift+Enter for newline</span>
              </div>

              {/* Send / Run button */}
              <div className="absolute bottom-3 right-3">
                <Button
                  size="sm"
                  className="h-7 gap-1.5 rounded-full px-3"
                  onClick={() => void (input.trim() || attachments.length > 0 ? sendChat(input) : runTask(activeTask))}
                  disabled={sending || (!input.trim() && attachments.length === 0 && !activeTask)}
                >
                  {sending ? (
                    <RefreshCw className="h-3.5 w-3.5 animate-spin" />
                  ) : (
                    <Send className="h-3.5 w-3.5" />
                  )}
                  {sending ? "Sending..." : input.trim() || attachments.length > 0 ? "Send" : "Run"}
                </Button>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </>
  )
}
