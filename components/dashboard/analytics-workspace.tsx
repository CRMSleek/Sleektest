"use client"

import { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { AlertCircle, CheckCircle2, RefreshCw, Sparkles, Send } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

type WorkspaceAction = {
  kind: "email" | "survey" | "customer_update"
  title: string
  summary: string
  confidence: number
  citations: Array<{ label: string; detail: string }>
  payload: Record<string, any>
}

type WorkspaceData = {
  snapshot: {
    customerCount: number
    surveyCount: number
    activeSurveyCount: number
    responseCount: number
    emailCount: number
    recentCustomers: Array<{
      id: string
      name: string
      email: string
      location: string
      relationshipType: string
      notes: string
    }>
    recentSurveys: Array<{
      id: string
      title: string
      isActive: boolean
      responseCount: number
    }>
    recentEmails: Array<{
      id: string
      senderEmail: string
      senderName: string
      subject: string
      date: string
    }>
    recentResponses: Array<{
      id: string
      surveyId: string
      customerName: string
      customerEmail: string
      submittedAt: string
    }>
  }
  brief: {
    headline: string
    whyNow: string
    nextSteps: string[]
    actionLabel: string
  }
  action: WorkspaceAction
}

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "I’m ready. The center panel shows the current recommended action, and I can explain the data or help you refine it from the right rail.",
}

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.05, duration: 0.35 },
  }),
}

function confidenceLabel(confidence: number) {
  return `${Math.round(confidence * 100)}% confidence`
}

function ActionPayload({ action }: { action: WorkspaceAction }) {
  if (action.kind === "survey") {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Survey title</p>
          <p className="text-sm text-muted-foreground">{action.payload.title}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Description</p>
          <p className="text-sm text-muted-foreground">{action.payload.description}</p>
        </div>
        <div className="space-y-2">
          <p className="text-sm font-medium">Questions</p>
          <div className="space-y-2">
            {(action.payload.questions || []).map((question: any) => (
              <div key={question.id} className="rounded-lg border bg-background/70 p-3">
                <p className="text-sm font-medium">{question.question}</p>
                <p className="text-xs text-muted-foreground">
                  {question.type} {question.required ? "• required" : "• optional"}
                </p>
              </div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  if (action.kind === "email") {
    return (
      <div className="space-y-3">
        <div>
          <p className="text-sm font-medium">Subject</p>
          <p className="text-sm text-muted-foreground">{action.payload.subject}</p>
        </div>
        <div>
          <p className="text-sm font-medium">Recipients</p>
          <div className="mt-2 flex flex-wrap gap-2">
            {(action.payload.to || []).length > 0 ? (
              action.payload.to.map((recipient: { name: string; email: string }) => (
                <Badge key={recipient.email} variant="secondary" className="max-w-full">
                  {recipient.name ? `${recipient.name} <${recipient.email}>` : recipient.email}
                </Badge>
              ))
            ) : (
              <p className="text-sm text-muted-foreground">No recipients available in the current dataset.</p>
            )}
          </div>
        </div>
        <div>
          <p className="text-sm font-medium">Draft</p>
          <div className="rounded-lg border bg-background/70 p-3">
            <p className="whitespace-pre-wrap text-sm text-muted-foreground">{action.payload.text}</p>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div>
        <p className="text-sm font-medium">Customer IDs</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {(action.payload.customerIds || []).length > 0 ? (
            action.payload.customerIds.map((id: string) => (
              <Badge key={id} variant="secondary">
                {id.slice(0, 8)}
              </Badge>
            ))
          ) : (
            <p className="text-sm text-muted-foreground">No customer records need updating right now.</p>
          )}
        </div>
      </div>
      <div>
        <p className="text-sm font-medium">Update payload</p>
        <div className="rounded-lg border bg-background/70 p-3">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{JSON.stringify(action.payload.updates, null, 2)}</p>
        </div>
      </div>
    </div>
  )
}

export function AnalyticsWorkspace() {
  const [workspace, setWorkspace] = useState<WorkspaceData | null>(null)
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isSending, setIsSending] = useState(false)
  const [status, setStatus] = useState<string | null>(null)

  const loadWorkspace = async (preserveStatus = false) => {
    setIsLoading(true)
    if (!preserveStatus) {
      setStatus(null)
    }
    try {
      const response = await fetch("/api/analytics/assistant")
      if (!response.ok) {
        throw new Error("Failed to load workspace")
      }

      const data = (await response.json()) as {
        messages?: Array<{ id: string; role: string; content: string }>
        workspace?: WorkspaceData
      }

      const rows = data.messages || []
      setMessages(
        rows.length > 0
          ? rows.map((message) => ({
              id: message.id,
              role: message.role as "user" | "assistant",
              content: message.content,
            }))
          : [WELCOME],
      )
      setWorkspace(data.workspace || null)
    } catch (error) {
      console.error("Workspace load error:", error)
      setWorkspace(null)
      setMessages([WELCOME])
      setStatus("Could not load the workspace. Check your data connection.")
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    void loadWorkspace()
  }, [])

  const submitChat = async () => {
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    const optimistic: ChatMessage = {
      id: `temp-${crypto.randomUUID()}`,
      role: "user",
      content: trimmed,
    }

    setMessages((prev) => [...prev.filter((message) => message.id !== "welcome"), optimistic])
    setInput("")
    setIsSending(true)
    setStatus(null)

    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed, mode: "chat" }),
      })

      const data = (await response.json()) as {
        reply?: string
        messages?: Array<{ id: string; role: string; content: string }>
        workspace?: WorkspaceData
        error?: string
      }

      if (!response.ok) {
        throw new Error(data.error || "Failed to send message")
      }

      setWorkspace(data.workspace || null)
      if (data.messages?.length) {
        setMessages(
          data.messages.map((message) => ({
            id: message.id,
            role: message.role as "user" | "assistant",
            content: message.content,
          })),
        )
      } else {
        setMessages((prev) => [
          ...prev.filter((message) => message.id !== "welcome"),
          { id: crypto.randomUUID(), role: "assistant", content: data.reply?.trim() || "No response returned." },
        ])
      }
    } catch (error: any) {
      console.error("Assistant chat error:", error)
      setStatus(error?.message || "The assistant could not respond just now.")
      setMessages((prev) => [
        ...prev,
        {
          id: crypto.randomUUID(),
          role: "assistant",
          content: "I could not complete that request right now. Try refreshing the workspace or checking credentials.",
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  const approveAction = async () => {
    if (!workspace) return
    setIsSending(true)
    setStatus(null)

    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ mode: "approve" }),
      })
      const data = (await response.json()) as {
        reply?: string
        workspace?: WorkspaceData
        error?: string
        needsCredentials?: boolean
      }

      if (!response.ok) {
        throw new Error(data.error || "Approval failed")
      }

      setStatus(data.reply || "Action approved and executed.")
      setWorkspace(data.workspace || null)
      await loadWorkspace(true)
    } catch (error: any) {
      console.error("Approve action error:", error)
      setStatus(error?.message || "Could not approve the current action.")
    } finally {
      setIsSending(false)
    }
  }

  const action = workspace?.action
  const isExecutableAction =
    !!action && (action.kind !== "customer_update" || (action.payload.customerIds || []).length > 0)

  return (
    <div className="grid gap-6 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-6">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <Card className="border-primary/10 bg-gradient-to-br from-background via-background to-muted/20">
            <CardHeader className="space-y-2">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Sparkles className="h-3.5 w-3.5" />
                  {workspace?.brief.actionLabel || "Action workflow"}
                </Badge>
                {action && (
                  <Badge variant="outline" className="gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    {confidenceLabel(action.confidence)}
                  </Badge>
                )}
              </div>
              <CardTitle className="text-2xl">
                {workspace?.brief.headline || "Loading your CRM workspace"}
              </CardTitle>
              <CardDescription className="max-w-3xl text-base">
                {workspace?.brief.whyNow ||
                  "The agent is scanning your CRM data and preparing the highest-leverage action for the center panel."}
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 lg:grid-cols-[minmax(0,1.3fr)_minmax(0,0.7fr)]">
              <div className="space-y-4">
                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-medium text-muted-foreground">Recommended action</p>
                      <h3 className="text-xl font-semibold">{action?.title || "Loading recommendation..."}</h3>
                    </div>
                    <Button variant="outline" size="sm" onClick={() => void loadWorkspace()} disabled={isLoading || isSending}>
                      <RefreshCw className="mr-2 h-4 w-4" />
                      Refresh
                    </Button>
                  </div>
                  <p className="mt-3 text-sm text-muted-foreground">{action?.summary}</p>
                  <div className="mt-4 flex flex-wrap gap-2">
                    <Button onClick={() => void approveAction()} disabled={!isExecutableAction || isSending}>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Approve and execute
                    </Button>
                    <Button variant="secondary" onClick={() => void submitChat()} disabled={!input.trim() || isSending}>
                      <Send className="mr-2 h-4 w-4" />
                      Ask agent
                    </Button>
                  </div>
                </div>

                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                  <div className="flex items-center justify-between">
                    <p className="text-sm font-medium">Execution details</p>
                    {action && <Badge variant="secondary">{action.kind}</Badge>}
                  </div>
                  <div className="mt-4">
                    {action ? <ActionPayload action={action} /> : <p className="text-sm text-muted-foreground">No action is ready yet.</p>}
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-sm font-medium">Sources</p>
                  <div className="mt-3 space-y-2">
                    {action?.citations?.map((citation) => (
                      <div key={`${citation.label}-${citation.detail}`} className="rounded-lg bg-muted/60 p-3 text-sm">
                        <p className="font-medium capitalize">{citation.label}</p>
                        <p className="text-muted-foreground">{citation.detail}</p>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="rounded-2xl border bg-background/80 p-4 shadow-sm">
                  <p className="text-sm font-medium">Next steps</p>
                  <ol className="mt-3 space-y-2 text-sm text-muted-foreground">
                    {(workspace?.brief.nextSteps || []).map((step) => (
                      <li key={step} className="flex gap-2">
                        <span className="mt-0.5 text-primary">•</span>
                        <span>{step}</span>
                      </li>
                    ))}
                  </ol>
                </div>

                {status && (
                  <div className="flex items-start gap-2 rounded-2xl border border-primary/20 bg-primary/5 p-4 text-sm">
                    <AlertCircle className="mt-0.5 h-4 w-4 text-primary" />
                    <p>{status}</p>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>

        <div className="grid gap-6 xl:grid-cols-2">
          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} custom={1}>
            <Card>
              <CardHeader>
                <CardTitle>Workspace data</CardTitle>
                <CardDescription>The concrete objects the agent is acting on right now.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="grid gap-3 sm:grid-cols-2">
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Customers</p>
                    <p className="mt-1 text-2xl font-semibold">{workspace?.snapshot.customerCount ?? 0}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Responses</p>
                    <p className="mt-1 text-2xl font-semibold">{workspace?.snapshot.responseCount ?? 0}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Surveys</p>
                    <p className="mt-1 text-2xl font-semibold">{workspace?.snapshot.surveyCount ?? 0}</p>
                  </div>
                  <div className="rounded-lg border p-3">
                    <p className="text-xs uppercase tracking-wide text-muted-foreground">Emails</p>
                    <p className="mt-1 text-2xl font-semibold">{workspace?.snapshot.emailCount ?? 0}</p>
                  </div>
                </div>

                <div className="space-y-2">
                  <p className="text-sm font-medium">Recent surveys</p>
                  <div className="space-y-2">
                    {(workspace?.snapshot.recentSurveys || []).map((survey) => (
                      <div key={survey.id} className="rounded-lg bg-muted/40 p-3 text-sm">
                        <div className="flex items-center justify-between gap-2">
                          <p className="font-medium">{survey.title}</p>
                          <Badge variant={survey.isActive ? "default" : "secondary"}>{survey.isActive ? "Active" : "Draft"}</Badge>
                        </div>
                        <p className="text-muted-foreground">{survey.responseCount} response(s)</p>
                      </div>
                    ))}
                  </div>
                </div>
              </CardContent>
            </Card>
          </motion.div>

          <motion.div initial="hidden" whileInView="visible" viewport={{ once: true, amount: 0.2 }} variants={fadeUp} custom={2}>
            <Card>
              <CardHeader>
                <CardTitle>Recent activity</CardTitle>
                <CardDescription>Customers, emails, and responses the agent used as evidence.</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                {(workspace?.snapshot.recentCustomers || []).slice(0, 4).map((customer) => (
                  <div key={customer.id} className="rounded-lg border p-3 text-sm">
                    <div className="flex items-center justify-between gap-2">
                      <p className="font-medium">{customer.name}</p>
                      <Badge variant="outline">{customer.relationshipType}</Badge>
                    </div>
                    <p className="text-muted-foreground">{customer.email}</p>
                    <p className="text-muted-foreground">{customer.location || "No location"}</p>
                  </div>
                ))}
                {(workspace?.snapshot.recentResponses || []).slice(0, 3).map((response) => (
                  <div key={response.id} className="rounded-lg border p-3 text-sm">
                    <p className="font-medium">{response.customerName}</p>
                    <p className="text-muted-foreground">{response.customerEmail}</p>
                    <p className="text-muted-foreground">Submitted {response.submittedAt}</p>
                  </div>
                ))}
              </CardContent>
            </Card>
          </motion.div>
        </div>
      </div>

      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0} className="xl:sticky xl:top-6">
        <Card className="h-full border-primary/10 bg-card/95 shadow-lg backdrop-blur">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-4 w-4 text-primary" />
              Agent Panel
            </CardTitle>
            <CardDescription>Ask questions, request a different action, or have the agent explain the recommendation.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-[760px] flex-col gap-4">
            <ScrollArea className="flex-1 rounded-xl border bg-muted/30 p-3">
              <div className="space-y-3">
                {isLoading && <p className="text-sm text-muted-foreground">Loading workspace…</p>}
                {messages.map((message, index) => (
                  <motion.div
                    key={message.id}
                    variants={fadeUp}
                    initial="hidden"
                    animate="visible"
                    custom={index}
                    className={`flex flex-col gap-2 ${message.role === "user" ? "items-end" : "items-start"}`}
                  >
                    <div
                      className={`max-w-[90%] rounded-2xl px-3 py-2 text-sm ${
                        message.role === "user" ? "bg-primary text-primary-foreground" : "bg-background text-foreground"
                      }`}
                    >
                      {message.content}
                    </div>
                  </motion.div>
                ))}
              </div>
            </ScrollArea>

            <div className="flex flex-col gap-2">
              <Input
                placeholder="Ask for a different action or more context..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    void submitChat()
                  }
                }}
                disabled={isSending}
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={() => void submitChat()} disabled={!input.trim() || isSending}>
                  <Send className="mr-2 h-4 w-4" />
                  {isSending ? "Sending…" : "Send"}
                </Button>
                <Button variant="outline" onClick={() => void loadWorkspace()} disabled={isLoading || isSending}>
                  <RefreshCw className="h-4 w-4" />
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
