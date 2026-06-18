"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import {
  Bot,
  Check,
  CheckCircle2,
  Command,
  FileUp,
  FileText,
  History,
  Mail,
  PanelLeftClose,
  PanelLeftOpen,
  PanelRightClose,
  PanelRightOpen,
  Pencil,
  Plus,
  RefreshCw,
  Send,
  Settings2,
  Paperclip,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Switch } from "@/components/ui/switch"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

type AgentMessage = {
  id: string
  role: "assistant" | "user"
  content: string
  created_at?: string
}

type ChatItem = {
  id: string
  title: string
  created_at: string
  updated_at: string
}

type EvidenceItem = {
  label: string
  detail: string
  recordType?: string
  recordId?: string
}

type AgentProposal = {
  id: string
  kind: "send_email" | "create_task" | "update_customer" | "create_report" | "create_survey"
  title: string
  status: "proposed" | "approved" | "rejected" | "completed"
  reasoning: string
  evidence: EvidenceItem[]
  payload: Record<string, any>
  draft?: string
  createdAt: string
}

type AgentSkill = {
  id: string
  name: string
  description: string
  instructions: string
}

type AgentContext = {
  snapshot?: {
    customerCount: number
    surveyCount: number
    activeSurveyCount: number
    responseCount: number
    emailCount: number
    latestActivityAt: string | null
  }
  proposals?: AgentProposal[]
}

type AssistantResponse = {
  reply?: string
  messages?: AgentMessage[]
  chats?: ChatItem[]
  activeChatId?: string | null
  context?: AgentContext
  workspace?: AgentContext
  proposals?: AgentProposal[]
  skills?: AgentSkill[]
  error?: string
}

type InlineAction = {
  title: string
  options: Array<{ label: string; value: string }>
}

const WELCOME: AgentMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask a CRM question. I will inspect customer, survey, and email data, then propose actions for approval.",
}

function formatTime(value?: string | null) {
  if (!value) return "No timestamp"
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return value
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  }).format(date)
}

function proposalIcon(kind: AgentProposal["kind"]) {
  if (kind === "send_email") return Mail
  if (kind === "create_report" || kind === "create_survey") return FileText
  return CheckCircle2
}

function safeJson(value: unknown) {
  try {
    return JSON.stringify(value ?? {}, null, 2)
  } catch {
    return "{}"
  }
}

function parseJsonOrNull(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function parseAssistantMessage(content: string): { text: string; inlineAction: InlineAction | null } {
  const blockRegex = /```json\s+([\s\S]*?)\s+```/g
  let text = content
  let inlineAction: InlineAction | null = null
  let match: RegExpExecArray | null

  while ((match = blockRegex.exec(content))) {
    const parsed = parseJsonOrNull(match[1])
    if (parsed?.proposedAction?.title && Array.isArray(parsed.proposedAction.options)) {
      inlineAction = parsed.proposedAction
      text = text.replace(match[0], "").trim()
    }
  }

  return { text: text || (content.trim() ? "Review the proposed action." : ""), inlineAction }
}

function parseStreamBlock(block: string) {
  const event = block
    .split("\n")
    .find((line) => line.startsWith("event:"))
    ?.replace("event:", "")
    .trim()
  const data = block
    .split("\n")
    .filter((line) => line.startsWith("data:"))
    .map((line) => line.replace("data:", "").trim())
    .join("\n")

  if (!event || !data) return null
  try {
    return { event, payload: JSON.parse(data) as AssistantResponse & { delta?: string } }
  } catch {
    return null
  }
}

function useEnabledSkills(skills: AgentSkill[]) {
  const [enabled, setEnabled] = useState<string[]>([])

  useEffect(() => {
    const stored = window.localStorage.getItem("sleekcrm-agent-skills")
    if (stored) {
      setEnabled(JSON.parse(stored))
      return
    }
    setEnabled(skills.map((skill) => skill.id))
  }, [skills])

  useEffect(() => {
    window.localStorage.setItem("sleekcrm-agent-skills", JSON.stringify(enabled))
  }, [enabled])

  const toggle = (id: string, checked: boolean) => {
    setEnabled((current) => (checked ? Array.from(new Set([...current, id])) : current.filter((item) => item !== id)))
  }

  return { enabled, toggle }
}

function ProposalEditor({
  proposal,
  open,
  onOpenChange,
  onSave,
}: {
  proposal: AgentProposal | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (proposal: AgentProposal) => void
}) {
  const [title, setTitle] = useState("")
  const [draft, setDraft] = useState("")
  const [payload, setPayload] = useState("{}")
  const [error, setError] = useState("")

  useEffect(() => {
    if (!proposal) return
    setTitle(proposal.title)
    setDraft(proposal.draft || proposal.payload?.text || proposal.payload?.description || "")
    setPayload(safeJson(proposal.payload))
    setError("")
  }, [proposal])

  if (!proposal) return null

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Review action</DialogTitle>
          <DialogDescription>Edit the action before approving it.</DialogDescription>
        </DialogHeader>
        <div className="space-y-4">
          <label className="block text-sm font-medium">
            Title
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              className="mt-2 h-10 w-full rounded-md border bg-background px-3 text-sm outline-none focus:ring-2 focus:ring-ring"
            />
          </label>
          <label className="block text-sm font-medium">
            Draft or description
            <Textarea
              value={draft}
              onChange={(event) => setDraft(event.target.value)}
              className="mt-2 min-h-32 resize-none"
            />
          </label>
          <label className="block text-sm font-medium">
            Action details
            <Textarea
              value={payload}
              onChange={(event) => setPayload(event.target.value)}
              className="mt-2 min-h-36 resize-none text-xs"
            />
          </label>
          {error ? <p className="text-sm text-destructive">{error}</p> : null}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Cancel
          </Button>
          <Button
            onClick={() => {
              const parsed = parseJsonOrNull(payload)
              if (!parsed) {
                setError("Action details must be valid JSON.")
                return
              }
              onSave({
                ...proposal,
                title,
                draft,
                payload: {
                  ...parsed,
                  ...(proposal.kind === "send_email" ? { text: draft } : { description: draft || parsed.description }),
                },
              })
              onOpenChange(false)
            }}
          >
            <Check className="mr-2 h-4 w-4" />
            Save edits
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}

function SkillsDialog({
  open,
  onOpenChange,
  skills,
  enabled,
  toggle,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  skills: AgentSkill[]
  enabled: string[]
  toggle: (id: string, checked: boolean) => void
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Agent skills</DialogTitle>
          <DialogDescription>Enabled skills add instructions to the agent.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          {skills.map((skill) => (
            <div key={skill.id} className="flex items-start justify-between gap-4 rounded-lg border p-3">
              <div>
                <p className="text-sm font-medium">{skill.name}</p>
                <p className="mt-1 text-sm text-muted-foreground">{skill.description}</p>
              </div>
              <Switch checked={enabled.includes(skill.id)} onCheckedChange={(checked) => toggle(skill.id, checked)} />
            </div>
          ))}
          {skills.length === 0 ? <p className="text-sm text-muted-foreground">No skills loaded.</p> : null}
        </div>
      </DialogContent>
    </Dialog>
  )
}

function ProposedActionsPanel({
  proposals,
  sending,
  onEdit,
  onReject,
  onApprove,
  onCollapse,
}: {
  proposals: AgentProposal[]
  sending: boolean
  onEdit: (proposal: AgentProposal) => void
  onReject: (proposalId: string) => void
  onApprove: (proposal: AgentProposal) => void
  onCollapse: () => void
}) {
  return (
    <aside className="hidden w-[clamp(340px,30vw,420px)] shrink-0 flex-col overflow-hidden border-r bg-card lg:flex">
      <div className="shrink-0 border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-semibold">Proposed actions</p>
            <p className="mt-1 text-sm text-muted-foreground">Review, edit, approve, or reject.</p>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            <Badge variant="secondary">{proposals.length}</Badge>
            <Button size="icon" variant="ghost" onClick={onCollapse} aria-label="Collapse proposed actions">
              <PanelLeftClose className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      <div className="min-h-0 w-full min-w-0 flex-1 overflow-y-auto overflow-x-hidden">
        <div className="w-full min-w-0 space-y-3 p-3">
          {proposals.length ? (
            proposals.map((proposal) => {
              const Icon = proposalIcon(proposal.kind)

              return (
                <div
                  key={proposal.id}
                  className="w-full min-w-0 overflow-hidden rounded-lg border bg-background p-4 shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:border-primary/30 hover:shadow-md"
                >
                  <div className="flex min-w-0 items-start gap-3">
                    <div className="shrink-0 rounded-md bg-primary/10 p-2 text-primary">
                      <Icon className="h-4 w-4" />
                    </div>

                    <div className="min-w-0 flex-1 overflow-hidden">
                      <div className="flex min-w-0 items-start justify-between gap-2">
                        <p className="min-w-0 flex-1 break-words text-sm font-semibold leading-5">
                          {proposal.title}
                        </p>

                        <Badge
                          variant={proposal.status === "rejected" ? "destructive" : "outline"}
                          className="shrink-0"
                        >
                          {proposal.status}
                        </Badge>
                      </div>

                      <p className="mt-2 min-w-0 break-words text-sm leading-5 text-muted-foreground">
                        {proposal.reasoning}
                      </p>
                    </div>
                  </div>

                  {proposal.draft ? (
                    <div className="mt-3 max-h-32 w-full min-w-0 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs text-muted-foreground">
                      {proposal.draft}
                    </div>
                  ) : null}

                  {proposal.evidence?.length ? (
                    <div className="mt-3 w-full min-w-0 space-y-2">
                      <p className="text-xs font-medium text-muted-foreground">Evidence</p>

                      {proposal.evidence.slice(0, 3).map((item, index) => (
                        <p
                          key={`${proposal.id}-e-${index}`}
                          className="min-w-0 break-words border-l pl-2 text-xs leading-5 text-muted-foreground"
                        >
                          {item.label}: {item.detail}
                        </p>
                      ))}
                    </div>
                  ) : null}

                  <div className="mt-4 grid w-full min-w-0 grid-cols-[40px_40px_minmax(0,1fr)] gap-2">
                    <Button size="icon" variant="outline" onClick={() => onEdit(proposal)} aria-label="Edit action">
                      <Pencil className="h-4 w-4" />
                    </Button>

                    <Button size="icon" variant="outline" onClick={() => onReject(proposal.id)} aria-label="Reject action">
                      <XCircle className="h-4 w-4 text-destructive" />
                    </Button>

                    <Button
                      className="min-w-0"
                      disabled={sending || proposal.status === "completed" || proposal.status === "rejected"}
                      onClick={() => onApprove(proposal)}
                    >
                      Approve
                    </Button>
                  </div>
                </div>
              )
            })
          ) : (
            <div className="w-full min-w-0 rounded-lg border bg-background p-4 text-sm text-muted-foreground">
              Ask the agent for a recommendation to generate proposed actions.
            </div>
          )}
        </div>
      </div>
    </aside>
  )
}

function HistoryPanel({
  chats,
  activeChatId,
  sending,
  onNewChat,
  onOpenChat,
  onDeleteChat,
  onCollapse,
}: {
  chats: ChatItem[]
  activeChatId: string | null
  sending: boolean
  onNewChat: () => void
  onOpenChat: (chatId: string) => void
  onDeleteChat: (chatId: string) => void
  onCollapse: () => void
}) {
  return (
    <aside className="hidden w-[clamp(300px,24vw,360px)] shrink-0 flex-col overflow-hidden border-l bg-card lg:flex">
      <div className="border-b px-4 py-3">
        <div className="flex items-center justify-between gap-3">
          <p className="truncate font-semibold">History</p>
          <div className="flex shrink-0 items-center gap-2">
            <Button size="sm" variant="outline" onClick={onNewChat} disabled={sending}>
              <Plus className="mr-2 h-4 w-4" />
              New
            </Button>
            <Button size="icon" variant="ghost" onClick={onCollapse} aria-label="Collapse history">
              <PanelRightClose className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>
      <ScrollArea className="min-h-0 flex-1">
        <div className="space-y-2 p-3">
          {chats.map((chat) => (
            <button
              key={chat.id}
              type="button"
              onClick={() => onOpenChat(chat.id)}
              className={`group flex w-full items-start gap-3 rounded-lg border p-3 text-left transition-all duration-200 hover:-translate-y-0.5 ${
                chat.id === activeChatId ? "border-primary bg-primary/5 shadow-sm" : "bg-background hover:border-primary/30 hover:bg-muted/50"
              }`}
            >
              <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />
              <span className="min-w-0 flex-1">
                <span className="block truncate text-sm font-medium">{chat.title || "CRM agent session"}</span>
                <span className="block text-xs text-muted-foreground">{formatTime(chat.updated_at)}</span>
              </span>
              <span
                role="button"
                tabIndex={0}
                onClick={(event) => {
                  event.stopPropagation()
                  onDeleteChat(chat.id)
                }}
                onKeyDown={(event) => {
                  if (event.key === "Enter" || event.key === " ") {
                    event.preventDefault()
                    event.stopPropagation()
                    onDeleteChat(chat.id)
                  }
                }}
                className="rounded-md p-1 text-muted-foreground opacity-0 hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                aria-label="Delete chat"
              >
                <Trash2 className="h-4 w-4" />
              </span>
            </button>
          ))}
          {chats.length === 0 ? <p className="rounded-lg border bg-background p-3 text-sm text-muted-foreground">No previous chats.</p> : null}
        </div>
      </ScrollArea>
    </aside>
  )
}

export function CRMAgentConsole({ closeHref = "/dashboard" }: { closeHref?: string }) {
  const [messages, setMessages] = useState<AgentMessage[]>([WELCOME])
  const [chats, setChats] = useState<ChatItem[]>([])
  const [activeChatId, setActiveChatId] = useState<string | null>(null)
  const [context, setContext] = useState<AgentContext | null>(null)
  const [proposals, setProposals] = useState<AgentProposal[]>([])
  const [skills, setSkills] = useState<AgentSkill[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(true)
  const [sending, setSending] = useState(false)
  const [status, setStatus] = useState("Loading CRM agent")
  const [importing, setImporting] = useState(false)
  const [editing, setEditing] = useState<AgentProposal | null>(null)
  const [editorOpen, setEditorOpen] = useState(false)
  const [skillsOpen, setSkillsOpen] = useState(false)
  const [actionsOpen, setActionsOpen] = useState(true)
  const [historyOpen, setHistoryOpen] = useState(true)
  const [composerFocused, setComposerFocused] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [importFileName, setImportFileName] = useState("")
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { enabled, toggle } = useEnabledSkills(skills)

  const snapshot = context?.snapshot

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages, sending])

  useEffect(() => {
    const textarea = textareaRef.current
    if (!textarea) return
    textarea.style.height = "72px"
    textarea.style.height = `${Math.min(190, Math.max(72, textarea.scrollHeight))}px`
  }, [input])

  useEffect(() => {
    if (input.startsWith("/") && !input.includes(" ")) setCommandOpen(true)
  }, [input])

  const applyResponse = (json: AssistantResponse) => {
    const nextContext = json.context || json.workspace
    const nextProposals = json.proposals || json.context?.proposals || json.workspace?.proposals
    if (nextContext) setContext(nextContext)
    if (nextProposals) setProposals(nextProposals.map((proposal) => ({ ...proposal, status: proposal.status || "proposed" })))
    if (json.chats) setChats(json.chats)
    if (json.activeChatId !== undefined) setActiveChatId(json.activeChatId || null)
    if (json.skills) setSkills(json.skills)
    if (json.messages) setMessages(json.messages.length ? json.messages : [WELCOME])
  }

  const loadAgent = async (chatId?: string) => {
    setLoading(true)
    setStatus("Loading CRM data")
    try {
      const url = chatId ? `/api/analytics/assistant?chatId=${encodeURIComponent(chatId)}` : "/api/analytics/assistant"
      const response = await fetch(url)
      const json = (await response.json()) as AssistantResponse
      if (!response.ok) throw new Error(json.error || "Failed to load agent")
      applyResponse(json)
      setStatus("")
    } catch (error) {
      console.error("CRM agent load failed:", error)
      setStatus("CRM agent load failed")
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAgent()
  }, [])

  const startNewChat = async () => {
    setSending(true)
    setStatus("Starting new session")
    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "new_chat", enabledSkills: enabled }),
      })
      const json = (await response.json()) as AssistantResponse
      if (!response.ok) throw new Error(json.error || "Failed to create chat")
      applyResponse(json)
      setMessages([WELCOME])
      setStatus("")
    } catch (error) {
      console.error("New chat failed:", error)
      setStatus("New chat failed")
    } finally {
      setSending(false)
    }
  }

  const sendChat = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || sending) return

    const optimistic: AgentMessage = { id: crypto.randomUUID(), role: "user", content: trimmed, created_at: new Date().toISOString() }
    const streamingId = crypto.randomUUID()
    setMessages((current) => [
      ...current.filter((message) => message.id !== "welcome"),
      optimistic,
      { id: streamingId, role: "assistant", content: "", created_at: new Date().toISOString() },
    ])
    setInput("")
    setCommandOpen(false)
    setSending(true)
    setStatus("Working")

    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, mode: "chat", chatId: activeChatId, enabledSkills: enabled, stream: true }),
      })

      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as AssistantResponse
        throw new Error(json.error || "Agent failed")
      }

      if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
        const json = (await response.json()) as AssistantResponse
        applyResponse(json)
        setStatus("")
        return
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ""

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })
        const blocks = buffer.split("\n\n")
        buffer = blocks.pop() || ""

        for (const block of blocks) {
          const parsed = parseStreamBlock(block)
          if (!parsed) continue

          if (parsed.event === "context") {
            applyResponse(parsed.payload)
          }

          if (parsed.event === "delta" && parsed.payload.delta) {
            setMessages((current) =>
              current.map((message) =>
                message.id === streamingId ? { ...message, content: `${message.content}${parsed.payload.delta}` } : message,
              ),
            )
          }

          if (parsed.event === "done") {
            applyResponse(parsed.payload)
          }
        }
      }

      setStatus("")
    } catch (error) {
      console.error("CRM agent send failed:", error)
      setMessages((current) => [
        ...current.filter((message) => message.id !== streamingId),
        { id: crypto.randomUUID(), role: "assistant", content: "CRM agent failed to respond. Check model/API configuration.", created_at: new Date().toISOString() },
      ])
      setStatus("Agent response failed")
    } finally {
      setSending(false)
    }
  }

  const executeProposal = async (proposal: AgentProposal) => {
    setSending(true)
    setStatus(`Executing: ${proposal.title}`)
    setProposals((current) => current.map((item) => (item.id === proposal.id ? { ...proposal, status: "approved" } : item)))
    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "execute_action", chatId: activeChatId, action: { ...proposal, status: "approved" } }),
      })
      const json = (await response.json()) as AssistantResponse
      if (!response.ok) throw new Error(json.error || "Action failed")
      applyResponse(json)
      setProposals((current) => current.map((item) => (item.id === proposal.id ? { ...item, status: "completed" } : item)))
      setStatus("")
    } catch (error) {
      console.error("Action execution failed:", error)
      setProposals((current) => current.map((item) => (item.id === proposal.id ? { ...item, status: "proposed" } : item)))
      setStatus("Approved action failed")
    } finally {
      setSending(false)
    }
  }

  const rejectProposal = (proposalId: string) => {
    setProposals((current) => current.map((proposal) => (proposal.id === proposalId ? { ...proposal, status: "rejected" } : proposal)))
  }

  const saveEditedProposal = (proposal: AgentProposal) => {
    setProposals((current) => current.map((item) => (item.id === proposal.id ? proposal : item)))
  }

  const deleteChat = async (chatId: string) => {
    setChats((current) => current.filter((chat) => chat.id !== chatId))
    if (activeChatId === chatId) {
      setActiveChatId(null)
      setMessages([WELCOME])
    }
    await fetch(`/api/analytics/assistant?chatId=${encodeURIComponent(chatId)}`, { method: "DELETE" }).catch(() => null)
  }

  const uploadImportFile = async (file: File) => {
    setImporting(true)
    setImportFileName(file.name)
    setStatus("Importing CRM data")
    try {
      const formData = new FormData()
      formData.append("file", file)
      const response = await fetch("/api/crm/import", { method: "POST", body: formData })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Import failed")

      const summary = [
        `Imported ${data.rows || 0} row(s) from ${file.name}.`,
        `Customers: ${data.customers?.created || 0} created, ${data.customers?.updated || 0} updated.`,
        `Emails: ${data.emails?.saved?.length || 0} saved for analysis, ${data.emails?.skipped || 0} already existed.`,
      ].join("\n")

      setMessages((current) => [
        ...current.filter((message) => message.id !== "welcome"),
        { id: crypto.randomUUID(), role: "assistant", content: summary, created_at: new Date().toISOString() },
      ])
      await loadAgent(activeChatId || undefined)
      setStatus("")
    } catch (error: any) {
      setMessages((current) => [
        ...current.filter((message) => message.id !== "welcome"),
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: error?.message || "CRM import failed.",
          created_at: new Date().toISOString(),
        },
      ])
      setStatus("CRM import failed")
    } finally {
      setImporting(false)
      setImportFileName("")
      if (importInputRef.current) importInputRef.current.value = ""
    }
  }

  const suggestedPrompts = useMemo(
    () => [
      "What should I focus on this week?",
      "Why are customers unhappy?",
      "Find churn risk and propose follow-ups.",
      "What feature requests are clustering?",
    ],
    [],
  )

  const commandSuggestions = useMemo(
    () => [
      {
        icon: Mail,
        label: "Analyze emails",
        prompt: "Analyze all relevant customer inquiry emails and propose actions.",
      },
      {
        icon: Sparkles,
        label: "This week",
        prompt: "What should I focus on this week?",
      },
      {
        icon: CheckCircle2,
        label: "Churn risk",
        prompt: "Find churn risk and propose follow-ups.",
      },
      {
        icon: FileText,
        label: "Feature requests",
        prompt: "What feature requests are clustering?",
      },
    ],
    [],
  )

  const selectCommand = (prompt: string) => {
    setInput(prompt)
    setCommandOpen(false)
    textareaRef.current?.focus()
  }

  return (
    <div className="flex h-[100dvh] min-h-0 bg-background text-foreground">
      <ProposalEditor proposal={editing} open={editorOpen} onOpenChange={setEditorOpen} onSave={saveEditedProposal} />
      <SkillsDialog open={skillsOpen} onOpenChange={setSkillsOpen} skills={skills} enabled={enabled} toggle={toggle} />
      <input
        ref={importInputRef}
        type="file"
        className="hidden"
        accept=".csv,.json,.xlsx,.xls,text/csv,application/json,application/vnd.openxmlformats-officedocument.spreadsheetml.sheet,application/vnd.ms-excel"
        onChange={(event) => {
          const file = event.target.files?.[0]
          if (file) void uploadImportFile(file)
        }}
      />

      {actionsOpen ? (
        <ProposedActionsPanel
          proposals={proposals}
          sending={sending}
          onEdit={(proposal) => {
            setEditing(proposal)
            setEditorOpen(true)
          }}
          onReject={rejectProposal}
          onApprove={(proposal) => void executeProposal(proposal)}
          onCollapse={() => setActionsOpen(false)}
        />
      ) : (
        <aside className="hidden w-12 shrink-0 flex-col items-center border-r bg-card py-3 lg:flex">
          <Button variant="ghost" size="icon" onClick={() => setActionsOpen(true)} aria-label="Show proposed actions">
            <PanelLeftOpen className="h-4 w-4" />
          </Button>
          <div className="mt-3 flex items-center gap-2 text-xs text-muted-foreground [writing-mode:vertical-rl]">
            <span>Actions</span>
            <Badge variant="secondary" className="px-1 py-0">
              {proposals.length}
            </Badge>
          </div>
        </aside>
      )}

      <main className="flex min-w-0 flex-1 flex-col">
        <header className="flex h-14 shrink-0 items-center justify-between border-b bg-card px-4">
          <div className="flex min-w-0 items-center gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <div className="flex h-8 w-8 items-center justify-center rounded-md bg-primary/10 text-primary">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold">SleekCRM Agent</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {status ? <span className="hidden text-xs text-muted-foreground md:inline">{status}</span> : null}
            <Button variant="outline" size="sm" onClick={() => setSkillsOpen(true)}>
              <Settings2 className="mr-2 h-4 w-4" />
              Skills
            </Button>
            <Button variant="outline" size="icon" onClick={() => void loadAgent(activeChatId || undefined)} disabled={loading || sending} aria-label="Refresh agent">
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Link href={closeHref} className="flex h-9 w-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground" aria-label="Close agent">
              <X className="h-4 w-4" />
            </Link>
          </div>
        </header>

        <section className="flex min-h-0 flex-1 flex-col">
          <ScrollArea className="min-h-0 flex-1">
            <div className="mx-auto w-full max-w-4xl space-y-5 px-4 py-6">
              {messages.map((message) => {
                const parsed = message.role === "assistant" ? parseAssistantMessage(message.content) : { text: message.content, inlineAction: null }

                return (
                  <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                    <div
                      className={`max-w-[88%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm transition-all duration-200 ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "border bg-card text-card-foreground hover:border-primary/20"
                      }`}
                    >
                      {message.role === "assistant" ? (
                        <>
                          {parsed.text ? (
                            <ReactMarkdown
                              remarkPlugins={[remarkGfm]}
                              components={{
                                p: ({ node, ...props }) => <p className="mb-2 last:mb-0" {...props} />,
                                ul: ({ node, ...props }) => <ul className="mb-2 ml-4 list-disc space-y-1" {...props} />,
                                ol: ({ node, ...props }) => <ol className="mb-2 ml-4 list-decimal space-y-1" {...props} />,
                                strong: ({ node, ...props }) => <strong className="font-semibold" {...props} />,
                                code: ({ node, className, children, ...props }) => (
                                  <code className="rounded bg-muted px-1 py-0.5 text-xs" {...props}>
                                    {children}
                                  </code>
                                ),
                              }}
                            >
                              {parsed.text}
                            </ReactMarkdown>
                          ) : (
                            <span className="inline-flex items-center gap-2 text-muted-foreground">
                              <RefreshCw className="h-4 w-4 animate-spin" />
                              Working
                            </span>
                          )}
                          {parsed.inlineAction ? (
                            <div className="mt-3 rounded-lg border bg-background p-3">
                              <p className="text-sm font-medium">{parsed.inlineAction.title}</p>
                              <div className="mt-3 flex flex-wrap gap-2">
                                {parsed.inlineAction.options.map((option) => (
                                  <Button key={option.label} size="sm" variant="outline" onClick={() => void sendChat(option.value)} disabled={sending}>
                                    {option.label}
                                  </Button>
                                ))}
                              </div>
                            </div>
                          ) : null}
                        </>
                      ) : (
                        <p>{message.content}</p>
                      )}
                    </div>
                  </div>
                )
              })}

              <div ref={messagesEndRef} />
            </div>
          </ScrollArea>

          <div className="shrink-0 border-t bg-card/95 p-4">
            {messages.length <= 1 ? (
              <div className="mx-auto mb-3 flex max-w-4xl flex-wrap gap-2">
                {suggestedPrompts.map((prompt) => (
                  <Button key={prompt} type="button" variant="outline" size="sm" className="transition-all hover:-translate-y-0.5 hover:border-primary/40" onClick={() => void sendChat(prompt)}>
                    {prompt}
                  </Button>
                ))}
              </div>
            ) : null}

            <div className="relative mx-auto max-w-4xl">
              {commandOpen ? (
                <div className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-lg border bg-popover shadow-xl">
                  <div className="border-b px-3 py-2 text-xs font-medium text-muted-foreground">Commands</div>
                  <div className="p-1">
                    {commandSuggestions.map((command) => {
                      const Icon = command.icon
                      return (
                        <button
                          key={command.label}
                          type="button"
                          onClick={() => selectCommand(command.prompt)}
                          className="flex w-full items-center gap-3 rounded-md px-3 py-2 text-left text-sm transition-colors hover:bg-muted"
                        >
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary/10 text-primary">
                            <Icon className="h-4 w-4" />
                          </span>
                          <span className="min-w-0">
                            <span className="block font-medium">{command.label}</span>
                            <span className="block truncate text-xs text-muted-foreground">{command.prompt}</span>
                          </span>
                        </button>
                      )
                    })}
                  </div>
                </div>
              ) : null}

              <div
                className={`relative overflow-hidden rounded-xl border bg-background shadow-sm transition-all duration-200 ${
                  composerFocused ? "border-primary/40 shadow-lg ring-4 ring-primary/10" : "hover:border-primary/30"
                }`}
              >
                <Textarea
                  ref={textareaRef}
                  value={input}
                  onChange={(event) => setInput(event.target.value)}
                  onFocus={() => setComposerFocused(true)}
                  onBlur={() => setComposerFocused(false)}
                  onKeyDown={(event) => {
                    if (commandOpen && (event.key === "Tab" || event.key === "Enter") && input.startsWith("/")) {
                      event.preventDefault()
                      selectCommand(commandSuggestions[0].prompt)
                      return
                    }
                    if (event.key === "Escape") {
                      setCommandOpen(false)
                      return
                    }
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault()
                      void sendChat(input)
                    }
                  }}
                  placeholder="Ask about customers, surveys, emails, churn risk, feature requests, or this week's focus..."
                  className="min-h-[72px] resize-none border-0 bg-transparent px-4 py-4 pb-16 shadow-none focus-visible:ring-0"
                />

                {importFileName ? (
                  <div className="absolute bottom-14 left-3 right-3 flex min-w-0 items-center gap-2 rounded-md border bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
                    <FileUp className="h-3.5 w-3.5 shrink-0" />
                    <span className="truncate">{importing ? `Importing ${importFileName}` : importFileName}</span>
                  </div>
                ) : null}

                <div className="flex items-center justify-between gap-3 border-t bg-muted/20 px-3 py-3">
                  <div className="flex min-w-0 items-center gap-1">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => importInputRef.current?.click()}
                      disabled={importing || sending}
                      aria-label="Upload CRM data"
                    >
                      <Paperclip className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant={commandOpen ? "secondary" : "ghost"}
                      size="icon"
                      className="h-8 w-8"
                      onClick={() => {
                        setCommandOpen((current) => !current)
                        textareaRef.current?.focus()
                      }}
                      aria-label="Show commands"
                    >
                      <Command className="h-4 w-4" />
                    </Button>
                    <span className="hidden truncate px-2 text-xs text-muted-foreground sm:inline">
                      {importing ? "Importing CRM data" : "Shift+Enter for newline"}
                    </span>
                  </div>

                <Button
                  onClick={() => void sendChat(input)}
                  disabled={sending || !input.trim()}
                    className="h-8 px-3 transition-all hover:-translate-y-0.5"
                >
                  {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                </Button>
                </div>
              </div>
            </div>
          </div>
        </section>
      </main>

      {historyOpen ? (
        <HistoryPanel
          chats={chats}
          activeChatId={activeChatId}
          sending={sending}
          onNewChat={() => void startNewChat()}
          onOpenChat={(chatId) => void loadAgent(chatId)}
          onDeleteChat={(chatId) => void deleteChat(chatId)}
          onCollapse={() => setHistoryOpen(false)}
        />
      ) : (
        <aside className="hidden w-12 shrink-0 flex-col items-center border-l bg-card py-3 lg:flex">
          <Button variant="ghost" size="icon" onClick={() => setHistoryOpen(true)} aria-label="Show history">
            <PanelRightOpen className="h-4 w-4" />
          </Button>
          <div className="mt-3 text-xs text-muted-foreground [writing-mode:vertical-rl]">History</div>
        </aside>
      )}
    </div>
  )
}
