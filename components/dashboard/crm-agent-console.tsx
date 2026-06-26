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
import { InteractivePromptBlock } from "@/components/dashboard/agent-interactive-prompt"
import { parseInteractiveFromAssistant } from "@/lib/agent-interactive-prompts"
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

type UploadedAttachment = {
  id: string
  name: string
  rows: number
  customerCreated: number
  customerUpdated: number
  emailsSaved: number
  emailsSkipped: number
  errors: string[]
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
  kind: "send_email" | "create_task" | "update_customer" | "create_report" | "create_survey" | "prepare_donor_research"
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

const WELCOME: AgentMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Ask a CRM question or pick a starter below. I'll inspect your data and offer next steps as buttons when a choice is needed.",
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

type StoredProposalState = {
  proposals: AgentProposal[]
  resolvedIds: string[]
}

const PROPOSAL_STORE_KEY = "sleekcrm-chat-proposals-v1"
const LEGACY_RESOLVED_PROPOSALS_KEY = "sleekcrm-resolved-proposals"
const NO_CHAT_PROPOSAL_KEY = "__no_chat__"

function proposalChatKey(chatId?: string | null) {
  return chatId || NO_CHAT_PROPOSAL_KEY
}

function encodeMessageWithAttachments(content: string, attachments: UploadedAttachment[]) {
  if (attachments.length === 0) return content
  return [
    `<!--sleekcrm-attachments:${JSON.stringify(attachments)}-->`,
    content,
    "",
    "Uploaded CRM data is already imported. Use CRM tools to check the new records before answering.",
  ].join("\n")
}

function parseMessageAttachments(content: string): { text: string; attachments: UploadedAttachment[] } {
  const match = content.match(/^<!--sleekcrm-attachments:([\s\S]*?)-->\n?/)
  if (!match) return { text: content, attachments: [] }
  const parsed = parseJsonOrNull(match[1])
  return {
    text: content.replace(match[0], "").trim(),
    attachments: Array.isArray(parsed) ? parsed : [],
  }
}

function readResolvedProposalIds() {
  if (typeof window === "undefined") return new Set<string>()
  try {
    const parsed = JSON.parse(window.localStorage.getItem(LEGACY_RESOLVED_PROPOSALS_KEY) || "[]")
    return new Set<string>(Array.isArray(parsed) ? parsed : [])
  } catch {
    return new Set<string>()
  }
}

function readProposalStore(): Record<string, StoredProposalState> {
  if (typeof window === "undefined") return {}
  try {
    const parsed = JSON.parse(window.localStorage.getItem(PROPOSAL_STORE_KEY) || "{}")
    return parsed && typeof parsed === "object" && !Array.isArray(parsed) ? parsed : {}
  } catch {
    return {}
  }
}

function writeProposalStore(store: Record<string, StoredProposalState>) {
  if (typeof window === "undefined") return
  window.localStorage.setItem(PROPOSAL_STORE_KEY, JSON.stringify(store))
}

function normalizeProposal(proposal: AgentProposal): AgentProposal {
  return { ...proposal, status: proposal.status || "proposed" }
}

function visibleProposals(proposals: AgentProposal[], resolvedIds: Set<string>) {
  return proposals
    .map(normalizeProposal)
    .filter((proposal) => !resolvedIds.has(proposal.id) && proposal.status !== "completed" && proposal.status !== "rejected")
}

function readStoredProposalState(chatId?: string | null): { proposals: AgentProposal[]; resolvedIds: Set<string> } {
  const store = readProposalStore()
  const key = proposalChatKey(chatId)
  const stored = store[key]
  const resolvedIds = new Set<string>(Array.isArray(stored?.resolvedIds) ? stored.resolvedIds : [])

  if (!stored) {
    readResolvedProposalIds().forEach((id) => resolvedIds.add(id))
  }

  return {
    proposals: visibleProposals(Array.isArray(stored?.proposals) ? stored.proposals : [], resolvedIds),
    resolvedIds,
  }
}

function writeStoredProposalState(
  chatId: string | null | undefined,
  state: { proposals: AgentProposal[]; resolvedIds: Set<string> },
) {
  const store = readProposalStore()
  const key = proposalChatKey(chatId)
  store[key] = {
    proposals: visibleProposals(state.proposals, state.resolvedIds),
    resolvedIds: Array.from(state.resolvedIds).slice(-300),
  }
  writeProposalStore(store)
}

function mergeProposalLists(existing: AgentProposal[], incoming: AgentProposal[], resolvedIds: Set<string>) {
  const byId = new Map<string, AgentProposal>()

  for (const proposal of visibleProposals(existing, resolvedIds)) {
    byId.set(proposal.id, proposal)
  }

  for (const proposal of visibleProposals(incoming, resolvedIds)) {
    if (!byId.has(proposal.id)) byId.set(proposal.id, proposal)
  }

  return Array.from(byId.values())
}

function parseAssistantMessage(content: string) {
  const parsed = parseInteractiveFromAssistant(content)
  return {
    text: parsed.text || (parsed.interactive ? "" : content.trim()),
    interactive: parsed.interactive,
  }
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
    <aside className="hidden w-[min(360px,32vw)] max-w-[360px] shrink-0 flex-col overflow-hidden border-l bg-card/95 lg:flex">
      <div className="shrink-0 border-b px-4 py-4">
        <div className="flex min-w-0 items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="min-w-0 truncate text-sm font-semibold">History</p>
            <p className="mt-1 text-xs text-muted-foreground">{chats.length} saved sessions</p>
          </div>

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
        <div className="w-[calc(100%-1px)] max-w-[calc(100%-1px)] space-y-2 p-3">
          {chats.map((chat) => (
            <div
              key={chat.id}
              className={`group grid w-full grid-cols-[1fr_auto] gap-2 overflow-hidden rounded-lg border bg-background p-3 text-left transition-all ${
                chat.id === activeChatId
                  ? "border-primary bg-primary/5 shadow-[inset_4px_0_0_hsl(var(--primary))]"
                  : "hover:-translate-x-0.5 hover:border-primary/30 hover:bg-muted/50"
              }`}
            >
              <button
                type="button"
                onClick={() => onOpenChat(chat.id)}
                className="grid min-w-0 grid-cols-[auto_1fr] gap-3 text-left"
              >
                <History className="mt-0.5 h-4 w-4 shrink-0 text-muted-foreground" />

                <span className="min-w-0 overflow-hidden">
                  <span className="block truncate text-sm font-medium">
                    {chat.title || "CRM agent session"}
                  </span>
                  <span className="block truncate text-xs text-muted-foreground">
                    {formatTime(chat.updated_at)}
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => onDeleteChat(chat.id)}
                className="rounded-md p-1 text-muted-foreground opacity-0 transition-opacity hover:bg-destructive/10 hover:text-destructive group-hover:opacity-100"
                aria-label="Delete chat"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
          {chats.length === 0 ? (
            <div className="rounded-lg border border-dashed bg-background/70 p-4 text-sm text-muted-foreground">
              No saved sessions yet.
            </div>
          ) : null}
        </div>
      </ScrollArea>
    </aside>
  )
}

function InlineProposals({
  proposals,
  sending,
  onEdit,
  onReject,
  onApprove,
}: {
  proposals: AgentProposal[]
  sending: boolean
  onEdit: (proposal: AgentProposal) => void
  onReject: (proposalId: string) => void
  onApprove: (proposal: AgentProposal) => void
}) {
  if (proposals.length === 0) return null

  return (
    <div className="space-y-3 rounded-lg border bg-card p-3">
      <div className="flex items-center justify-between border-b pb-3">
        <div>
          <p className="text-sm font-semibold">Actions waiting for approval</p>
          <p className="mt-1 text-xs text-muted-foreground">Review proposed CRM changes before they run.</p>
        </div>
        <Badge variant="secondary" className="agent-number">{proposals.length}</Badge>
      </div>
      {proposals.map((proposal) => {
        const Icon = proposalIcon(proposal.kind)
        return (
          <div key={proposal.id} className="overflow-hidden rounded-lg border bg-background p-4 text-sm shadow-sm shadow-primary/5">
            <div className="flex min-w-0 gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md border bg-primary text-primary-foreground">
                <Icon className="h-4 w-4" />
              </div>
              <div className="min-w-0 flex-1">
                <div className="flex min-w-0 items-start justify-between gap-3">
                  <p className="min-w-0 break-words font-semibold">{proposal.title}</p>
                  <Badge variant={proposal.status === "rejected" ? "destructive" : "outline"} className="shrink-0">
                    {proposal.status}
                  </Badge>
                </div>
                <p className="mt-2 break-words text-muted-foreground">{proposal.reasoning}</p>
                {proposal.draft ? (
                  <div className="mt-3 max-h-36 overflow-auto whitespace-pre-wrap break-words rounded-md bg-muted p-3 text-xs text-muted-foreground">
                    {proposal.draft}
                  </div>
                ) : null}
                {proposal.evidence?.length ? (
                  <div className="mt-3 space-y-1">
                    {proposal.evidence.slice(0, 2).map((item, index) => (
                      <p key={`${proposal.id}-inline-e-${index}`} className="break-words border-l pl-2 text-xs text-muted-foreground">
                        {item.label}: {item.detail}
                      </p>
                    ))}
                  </div>
                ) : null}
                <div className="mt-4 flex flex-wrap gap-2">
                  <Button size="sm" variant="outline" onClick={() => onEdit(proposal)}>
                    <Pencil className="mr-2 h-4 w-4" />
                    Edit
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => onReject(proposal.id)}>
                    <XCircle className="mr-2 h-4 w-4 text-destructive" />
                    Reject
                  </Button>
                  <Button size="sm" disabled={sending || proposal.status === "completed" || proposal.status === "rejected"} onClick={() => onApprove(proposal)}>
                    Approve
                  </Button>
                </div>
              </div>
            </div>
          </div>
        )
      })}
    </div>
  )
}

function AgentContextRail({
  snapshot,
  proposals,
  enabledSkillCount,
  suggestedPrompts,
  sending,
  onPrompt,
}: {
  snapshot?: AgentContext["snapshot"]
  proposals: AgentProposal[]
  enabledSkillCount: number
  suggestedPrompts: string[]
  sending: boolean
  onPrompt: (prompt: string) => void
}) {
  const metrics = [
    { label: "Relationships", value: snapshot?.customerCount },
    { label: "Surveys", value: snapshot?.surveyCount },
    { label: "Responses", value: snapshot?.responseCount },
    { label: "Emails", value: snapshot?.emailCount },
  ]

  return (
    <aside className="border-b bg-card/90 xl:w-[280px] xl:shrink-0 xl:border-b-0 xl:border-r">
      <div className=" border-b px-4 py-5">
        <div className="flex items-center gap-3">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold">Agent workspace</p>
            <p className="mt-1 text-xs text-muted-foreground">{snapshot?.latestActivityAt ? `Updated ${formatTime(snapshot.latestActivityAt)}` : "CRM context loading"}</p>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 border-b xl:grid-cols-1">
        {metrics.map((metric, index) => (
          <div key={metric.label} className={`p-4 ${index % 2 === 0 ? "border-r xl:border-r-0" : ""} ${index < 2 ? "border-b xl:border-b" : "xl:border-b"}`}>
            <p className="text-xs text-muted-foreground">{metric.label}</p>
            <p className="agent-number mt-2 text-3xl font-semibold tracking-tight">{metric.value ?? "-"}</p>
          </div>
        ))}
      </div>

      <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-1">
        <div className="rounded-lg border bg-background p-3">
          <p className="text-xs font-medium text-muted-foreground">Pending approvals</p>
          <p className="agent-number mt-2 text-2xl font-semibold">{proposals.length}</p>
        </div>
        <div className="rounded-lg border bg-background p-3">
          <p className="text-xs font-medium text-muted-foreground">Enabled skills</p>
          <p className="agent-number mt-2 text-2xl font-semibold">{enabledSkillCount}</p>
        </div>
      </div>

      <div className="border-t p-4">
        <p className="text-xs font-semibold text-muted-foreground">Starter prompts</p>
        <div className="mt-3 grid gap-2">
          {suggestedPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              disabled={sending}
              onClick={() => onPrompt(prompt)}
              className="group flex min-h-11 items-center justify-between gap-3 rounded-lg border bg-background px-3 py-2 text-left text-sm transition-all hover:-translate-y-0.5 hover:border-primary/40 hover:bg-primary/5 disabled:pointer-events-none disabled:opacity-50"
            >
              <span>{prompt}</span>
              <Send className="h-3.5 w-3.5 shrink-0 text-muted-foreground transition-colors group-hover:text-primary" />
            </button>
          ))}
        </div>
      </div>
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
  const [historyOpen, setHistoryOpen] = useState(true)
  const [composerFocused, setComposerFocused] = useState(false)
  const [commandOpen, setCommandOpen] = useState(false)
  const [importFileName, setImportFileName] = useState("")
  const [pendingAttachments, setPendingAttachments] = useState<UploadedAttachment[]>([])
  const [answeredInteractions, setAnsweredInteractions] = useState<Record<string, string>>({})
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const importInputRef = useRef<HTMLInputElement>(null)
  const textareaRef = useRef<HTMLTextAreaElement>(null)
  const { enabled, toggle } = useEnabledSkills(skills)

  const snapshot = context?.snapshot

  const updateCurrentChatProposals = (updater: (current: AgentProposal[]) => AgentProposal[]) => {
    setProposals((current) => updater(current))
  }

  const rememberResolvedProposal = (proposalId: string) => {
    setProposals((current) => {
      const state = readStoredProposalState(activeChatId)
      state.resolvedIds.add(proposalId)
      const next = current.filter((proposal) => proposal.id !== proposalId)
      return next
    })
  }

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

  const applyResponse = (json: AssistantResponse, proposalMode: "load" | "merge" | "ignore" = "load") => {
    const nextContext = json.context || json.workspace
    const nextProposals = json.proposals || json.context?.proposals || json.workspace?.proposals
    const responseChatId = json.activeChatId !== undefined ? json.activeChatId : activeChatId
    if (nextContext) setContext(nextContext)
    if (proposalMode === "merge" && nextProposals) {
      setProposals(visibleProposals(nextProposals, new Set()))
    } else if (proposalMode === "load" && responseChatId !== undefined) {
      setProposals(visibleProposals(nextProposals || [], new Set()))
    }
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
      applyResponse(json, "load")
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
      applyResponse(json, "load")
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
    if ((!trimmed && pendingAttachments.length === 0) || sending || importing) return

    const attachments = pendingAttachments
    const messageContent = encodeMessageWithAttachments(trimmed || "I uploaded CRM data. Analyze it and update the CRM as needed.", attachments)
    const optimistic: AgentMessage = { id: crypto.randomUUID(), role: "user", content: messageContent, created_at: new Date().toISOString() }
    const streamingId = crypto.randomUUID()
    setMessages((current) => [
      ...current.filter((message) => message.id !== "welcome"),
      optimistic,
      { id: streamingId, role: "assistant", content: "", created_at: new Date().toISOString() },
    ])
    setInput("")
    setPendingAttachments([])
    setCommandOpen(false)
    setSending(true)
    setStatus("Working")

    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: messageContent, mode: "chat", chatId: activeChatId, enabledSkills: enabled, stream: true }),
      })

      if (!response.ok) {
        const json = (await response.json().catch(() => ({}))) as AssistantResponse
        throw new Error(json.error || "Agent failed")
      }

      if (!response.body || !response.headers.get("content-type")?.includes("text/event-stream")) {
        const json = (await response.json()) as AssistantResponse
        applyResponse(json, "merge")
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
            applyResponse(parsed.payload, "merge")
          }

          if (parsed.event === "delta" && parsed.payload.delta) {
            setMessages((current) =>
              current.map((message) =>
                message.id === streamingId ? { ...message, content: `${message.content}${parsed.payload.delta}` } : message,
              ),
            )
          }

          if (parsed.event === "done") {
            applyResponse(parsed.payload, "merge")
          }
        }
      }

      setStatus("")
    } catch (error) {
      console.error("CRM agent send failed:", error)
      const message = error instanceof Error ? error.message : "Agent failed"
      setPendingAttachments((current) => (current.length ? current : attachments))
      setMessages((current) => [
        ...current.filter((message) => message.id !== streamingId),
        { id: crypto.randomUUID(), role: "assistant", content: `Agent error: ${message}`, created_at: new Date().toISOString() },
      ])
      setStatus("Agent response failed")
    } finally {
      setSending(false)
    }
  }

  const executeProposal = async (proposal: AgentProposal) => {
    setSending(true)
    setStatus(`Executing: ${proposal.title}`)
    updateCurrentChatProposals((current) => current.map((item) => (item.id === proposal.id ? { ...proposal, status: "approved" } : item)))
    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "execute_action", chatId: activeChatId, action: { ...proposal, status: "approved" } }),
      })
      const json = (await response.json()) as AssistantResponse
      if (!response.ok) throw new Error(json.error || "Action failed")
      rememberResolvedProposal(proposal.id)
      applyResponse(json, "load")
      setStatus("")
    } catch (error) {
      console.error("Action execution failed:", error)
      const message = error instanceof Error ? error.message : "Action failed"
      updateCurrentChatProposals((current) => current.map((item) => (item.id === proposal.id ? { ...item, status: "proposed" } : item)))
      setMessages((current) => [
        ...current.filter((message) => message.id !== "welcome"),
        { id: crypto.randomUUID(), role: "assistant", content: `Action error: ${proposal.title}. ${message}`, created_at: new Date().toISOString() },
      ])
      setStatus("Approved action failed")
    } finally {
      setSending(false)
    }
  }

  const rejectProposal = async (proposalId: string) => {
    const proposal = proposals.find((item) => item.id === proposalId)
    if (!proposal) return
    rememberResolvedProposal(proposalId)
    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "reject_action", chatId: activeChatId, action: proposal }),
      })
      const json = (await response.json()) as AssistantResponse
      if (response.ok) applyResponse(json, "load")
    } catch (error) {
      console.error("Reject action failed:", error)
    }
  }

  const saveEditedProposal = async (proposal: AgentProposal) => {
    updateCurrentChatProposals((current) => current.map((item) => (item.id === proposal.id ? proposal : item)))
    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "save_action", chatId: activeChatId, action: proposal }),
      })
      const json = (await response.json()) as AssistantResponse
      if (response.ok) applyResponse(json, "load")
    } catch (error) {
      console.error("Save action failed:", error)
    }
  }

  const deleteChat = async (chatId: string) => {
    setChats((current) => current.filter((chat) => chat.id !== chatId))
    if (activeChatId === chatId) {
      setActiveChatId(null)
      setMessages([WELCOME])
      setProposals([])
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

      const attachment: UploadedAttachment = {
        id: crypto.randomUUID(),
        name: file.name,
        rows: data.rows || 0,
        customerCreated: data.customers?.created || 0,
        customerUpdated: data.customers?.updated || 0,
        emailsSaved: data.emails?.saved?.length || 0,
        emailsSkipped: data.emails?.skipped || 0,
        errors: [...(data.customers?.errors || []), ...(data.emails?.errors || [])].slice(0, 5),
      }

      setPendingAttachments((current) => [...current, attachment])
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

  const selectInteractiveReply = (messageId: string, label: string, value: string) => {
    setAnsweredInteractions((current) => ({ ...current, [messageId]: label }))
    void sendChat(value)
  }

  return (
    <div className="agent-command-surface flex h-[100dvh] min-h-0 overflow-hidden bg-background text-foreground">
      <ProposalEditor proposal={editing} open={editorOpen} onOpenChange={setEditorOpen} onSave={(proposal) => void saveEditedProposal(proposal)} />
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

      <main className="flex min-w-0 flex-1 flex-col bg-background/76 backdrop-blur-sm">
        <header className=" flex min-h-16 shrink-0 items-center justify-between gap-4 border-b bg-card/95 px-4 py-3">
          <div className="flex min-w-0 items-center gap-4">
            <div className="flex min-w-0 items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary text-primary-foreground shadow-sm">
                <Bot className="h-4 w-4" />
              </div>
              <div className="min-w-0">
                <p className="truncate text-base font-semibold tracking-tight">SleekCRM Agent</p>
                <p className="hidden truncate text-xs text-muted-foreground sm:block">
                  CRM questions, imports, proposals, and approved actions
                </p>
              </div>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {status ? (
              <span className="hidden items-center gap-2 rounded-full border bg-background px-3 py-1.5 text-xs text-muted-foreground md:inline-flex">
                <span className={`h-1.5 w-1.5 rounded-full bg-primary ${sending || loading || importing ? "animate-pulse" : ""}`} />
                {status}
              </span>
            ) : null}
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

        <section className="flex min-h-0 flex-1 flex-col xl:flex-row">
          <AgentContextRail
            snapshot={snapshot}
            proposals={proposals}
            enabledSkillCount={enabled.length}
            suggestedPrompts={suggestedPrompts}
            sending={sending || importing}
            onPrompt={(prompt) => void sendChat(prompt)}
          />

          <div className="flex min-h-0 flex-1 flex-col">
            <ScrollArea className="min-h-0 flex-1">
              <div className="mx-auto w-full max-w-5xl space-y-5 px-4 py-6 sm:px-6">
                {messages.map((message) => {
                  const messageParts = parseMessageAttachments(message.content)
                  const parsed = message.role === "assistant" ? parseAssistantMessage(messageParts.text) : { text: messageParts.text, interactive: null }
                  const answeredLabel = answeredInteractions[message.id]

                  return (
                    <div key={message.id} className={`flex ${message.role === "user" ? "justify-end" : "justify-start"}`}>
                      <div
                        className={`max-w-[92%] rounded-lg px-4 py-3 text-sm leading-6 shadow-sm transition-all duration-200 md:max-w-[78%] ${
                          message.role === "user"
                            ? "bg-primary text-primary-foreground shadow-primary/15"
                            : "border bg-card text-card-foreground hover:border-primary/30"
                        }`}
                      >
                        {message.role === "assistant" ? (
                          <>
                            {messageParts.attachments.length ? (
                              <div className="mb-3 flex flex-wrap gap-2">
                                {messageParts.attachments.map((attachment) => (
                                  <span key={attachment.id} className="inline-flex max-w-full items-center gap-2 rounded-md border bg-background px-2.5 py-1.5 text-xs text-muted-foreground">
                                    <FileUp className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{attachment.name}</span>
                                  </span>
                                ))}
                              </div>
                            ) : null}
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
                            {parsed.interactive ? (
                              <InteractivePromptBlock
                                prompt={parsed.interactive}
                                disabled={sending || Boolean(answeredLabel)}
                                answeredLabel={answeredLabel}
                                onSelect={(value, label) => selectInteractiveReply(message.id, label, value)}
                              />
                            ) : null}
                          </>
                        ) : (
                          <>
                            {messageParts.attachments.length ? (
                              <div className="mb-3 flex flex-wrap gap-2">
                                {messageParts.attachments.map((attachment) => (
                                  <span key={attachment.id} className="inline-flex max-w-full items-center gap-2 rounded-md bg-primary-foreground/15 px-2.5 py-1.5 text-xs">
                                    <FileUp className="h-3.5 w-3.5 shrink-0" />
                                    <span className="truncate">{attachment.name}</span>
                                  </span>
                                ))}
                              </div>
                            ) : null}
                            <p>{parsed.text}</p>
                          </>
                        )}
                      </div>
                    </div>
                  )
                })}

                <InlineProposals
                  proposals={proposals}
                  sending={sending}
                  onEdit={(proposal) => {
                    setEditing(proposal)
                    setEditorOpen(true)
                  }}
                  onReject={(proposalId) => void rejectProposal(proposalId)}
                  onApprove={(proposal) => void executeProposal(proposal)}
                />

                <div ref={messagesEndRef} />
              </div>
            </ScrollArea>

            <div className="shrink-0 border-t bg-card/95 p-4">
              <div className="relative mx-auto max-w-5xl">
              {commandOpen ? (
                <div className="absolute bottom-full left-0 right-0 z-20 mb-2 overflow-hidden rounded-lg border bg-popover shadow-xl shadow-primary/10">
                  <div className=" border-b px-3 py-2 text-xs font-medium text-muted-foreground">Commands</div>
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
                          <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
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
                className={`relative overflow-hidden rounded-lg border bg-background shadow-sm transition-all duration-200 ${
                  composerFocused ? "border-primary/60 shadow-xl shadow-primary/10 ring-4 ring-primary/10" : "hover:border-primary/30"
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
                  className={`min-h-[72px] resize-none border-0 bg-transparent px-4 py-4 text-base shadow-none focus-visible:ring-0 md:text-sm ${
                    pendingAttachments.length || importFileName ? "pb-28" : "pb-16"
                  }`}
                />

                {importFileName || pendingAttachments.length ? (
                  <div className="absolute bottom-14 left-3 right-3 flex min-w-0 flex-wrap items-center gap-2 rounded-md border bg-muted/70 px-3 py-2 text-xs text-muted-foreground">
                    {importing && importFileName ? (
                      <span className="inline-flex min-w-0 items-center gap-2">
                        <RefreshCw className="h-3.5 w-3.5 shrink-0 animate-spin" />
                        <span className="truncate">Importing {importFileName}</span>
                      </span>
                    ) : null}
                    {pendingAttachments.map((attachment) => (
                      <span key={attachment.id} className="inline-flex max-w-full items-center gap-2 rounded-md border bg-background px-2 py-1">
                        <FileUp className="h-3.5 w-3.5 shrink-0" />
                        <span className="truncate">{attachment.name}</span>
                        <button
                          type="button"
                          className="rounded p-0.5 text-muted-foreground hover:bg-muted hover:text-foreground"
                          onClick={() => setPendingAttachments((current) => current.filter((item) => item.id !== attachment.id))}
                          aria-label={`Remove ${attachment.name}`}
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </span>
                    ))}
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
                      {pendingAttachments.length ? "File attached to next message" : importing ? "Importing CRM data" : "Shift+Enter for newline"}
                    </span>
                  </div>

                  <Button
                    onClick={() => void sendChat(input)}
                    disabled={sending || importing || (!input.trim() && pendingAttachments.length === 0)}
                    className="h-8 px-3 transition-all hover:-translate-y-0.5"
                  >
                    {sending ? <RefreshCw className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
                  </Button>
                </div>
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
