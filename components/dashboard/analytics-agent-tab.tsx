"use client"

import { useEffect, useMemo, useState } from "react"
import { motion } from "framer-motion"
import { Bot, Download, RefreshCw, Sparkles, Wand2, Mail, FileText, Users } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Badge } from "@/components/ui/badge"
import { ScrollArea } from "@/components/ui/scroll-area"

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

type TaskKey = "email" | "survey" | "customers" | "export"

type AgentMessage = {
  id: string
  role: "assistant" | "user"
  content: string
}

const WELCOME: AgentMessage = {
  id: "welcome",
  role: "assistant",
  content: "Let's get to work today!",
}

const fadeUp = {
  hidden: { opacity: 0, y: 28 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.35 },
  }),
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

function deriveSuggestion(
  data: AnalyticsData | null,
): Array<{ title: string; description: string; icon: LucideIcon; task: TaskKey }> {
  const totalResponses = data?.metrics?.totalResponses?.value ?? 0
  const avgSatisfaction = data?.metrics?.avgSatisfaction?.value ?? 0
  const activeCustomers = data?.metrics?.activeCustomers?.value ?? 0
  const hasRecentActivity = (data?.recentActivity || []).length > 0

  const suggestions = [
    {
      title: totalResponses === 0 ? "Create a customer feedback survey" : "Refresh customer follow-up",
      description:
        totalResponses === 0
          ? "There is no response volume yet. Start with a short survey to create a baseline."
          : "Recent responses exist, so the next best move is usually a follow-up email or a tighter survey.",
      icon: FileText,
      task: "survey" as TaskKey,
    },
    {
      title: avgSatisfaction < 4 ? "Draft a re-engagement email" : "Segment your best customers",
      description:
        avgSatisfaction < 4
          ? "The satisfaction signal suggests it is time to ask what needs to change."
          : "The satisfaction trend looks healthy, so segmenting the strongest customers is the next leverage point.",
      icon: Mail,
      task: "email" as TaskKey,
    },
    {
      title: activeCustomers > 0 ? "Review relationship coverage" : "Import customer records",
      description:
        activeCustomers > 0
          ? "There are active customers in the workspace, so you can tighten relationships and next steps."
          : "The workspace is empty or sparse, so the first win is to load customer data.",
      icon: Users,
      task: "customers" as TaskKey,
    },
    {
      title: hasRecentActivity ? "Export the current workspace" : "Prepare for data export",
      description:
        hasRecentActivity
          ? "Technical users can export the current workspace as CSV and take it offline."
          : "Once data lands, CSV export will give technical users a quick handoff format.",
      icon: Download,
      task: "export" as TaskKey,
    },
  ]

  return suggestions
}

export function AnalyticsAgentTab() {
  const [hasGenerated, setHasGenerated] = useState(false)
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<AnalyticsData | null>(null)
  const [messages, setMessages] = useState<AgentMessage[]>([WELCOME])
  const [selectedTask, setSelectedTask] = useState<TaskKey | null>(null)
  const [input, setInput] = useState("")

  const suggestions = useMemo(() => deriveSuggestion(data), [data])

  const loadAnalytics = async () => {
    setLoading(true)
    try {
      const response = await fetch("/api/analytics", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      if (!response.ok) {
        throw new Error("Failed to load analytics data")
      }

      const json = (await response.json()) as AnalyticsData
      setData(json)
    } catch (error) {
      console.error("Analytics agent data load failed:", error)
      setData(null)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void loadAnalytics()
  }, [])

  const activateAgent = () => {
    setHasGenerated(true)
    setMessages([
      WELCOME,
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: "I have loaded the workspace. Choose a task, export the data, or type a request in the panel.",
      },
    ])
  }

  const queueTask = (task: TaskKey) => {
    setSelectedTask(task)
    const taskMessageMap: Record<TaskKey, string> = {
      email: "Queued a placeholder email workflow. API wiring will come next.",
      survey: "Queued a placeholder survey workflow. We can attach a draft builder next.",
      customers: "Queued a placeholder customer review workflow.",
      export: "Prepared the CSV export path for the current workspace.",
    }
    setMessages((prev) => [
      ...prev,
      {
        id: crypto.randomUUID(),
        role: "user",
        content:
          task === "email"
            ? "Help me draft a follow-up email."
            : task === "survey"
              ? "Help me create a survey."
              : task === "customers"
                ? "Show me the customer workflow."
                : "Export everything as CSV.",
      },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content: taskMessageMap[task],
      },
    ])
  }

  const handleSubmit = () => {
    const trimmed = input.trim()
    if (!trimmed) return

    setHasGenerated(true)
    setMessages((prev) => [
      ...prev,
      { id: crypto.randomUUID(), role: "user", content: trimmed },
      {
        id: crypto.randomUUID(),
        role: "assistant",
        content:
          "Placeholder agent response: this request is queued for the next API pass. For now, use the task buttons or export the CSV snapshot.",
      },
    ])
    setInput("")
  }

  const exportAll = () => {
    const rows = buildPlaceholderRows(data)
    downloadCsv("analytics-export.csv", rows)
  }

  if (!hasGenerated) {
    return (
      <Card className="h-full rounded-none border-0 border-dashed border-primary/20 bg-gradient-to-br from-background via-background to-muted/30">
        <CardContent className="flex h-screen flex-col items-center justify-center gap-6 p-10 text-center">
          <div className="flex h-16 w-16 items-center justify-center rounded-full border bg-background shadow-sm">
            <Sparkles className="h-7 w-7 text-primary" />
          </div>
          <div className="max-w-2xl space-y-2">
            <h2 className="text-3xl font-semibold tracking-tight">Let's get to work today!</h2>
            <p className="text-muted-foreground">
              Start the agent workspace when you are ready. It will surface a working set of tasks, placeholder actions, and CSV export tools for technical users.
            </p>
          </div>
          <div className="flex flex-wrap items-center justify-center gap-3">
            <Button onClick={activateAgent} disabled={loading}>
              <Wand2 className="mr-2 h-4 w-4" />
              {loading ? "Loading..." : "Generate insights"}
            </Button>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <div className="grid h-full min-h-screen gap-0 xl:grid-cols-[minmax(0,1fr)_380px]">
      <div className="space-y-0">
        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={0}>
          <Card className="h-full rounded-none border-0 border-r border-primary/10 bg-gradient-to-br from-background via-background to-muted/20">
            <CardHeader className="space-y-2 px-6 pt-6">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="secondary" className="gap-1">
                  <Bot className="h-3.5 w-3.5" />
                  Agent workspace active
                </Badge>
                <Badge variant="outline">{selectedTask ? `Selected: ${selectedTask}` : "Choose a task"}</Badge>
              </div>
              <CardTitle className="text-2xl">Today's workspace</CardTitle>
              <CardDescription className="max-w-2xl">
                Pick a task to shape the next step, or export the current workspace as CSV for a technical handoff.
              </CardDescription>
            </CardHeader>
            <CardContent className="grid gap-4 px-6 pb-6 lg:grid-cols-2">
              {suggestions.map((suggestion, index) => {
                const Icon = suggestion.icon
                return (
                  <motion.div key={suggestion.title} initial="hidden" animate="visible" variants={fadeUp} custom={index}>
                    <Card className="h-full">
                      <CardHeader>
                        <div className="flex items-center gap-2">
                          <div className="rounded-lg bg-primary/10 p-2 text-primary">
                            <Icon className="h-4 w-4" />
                          </div>
                          <CardTitle className="text-base">{suggestion.title}</CardTitle>
                        </div>
                        <CardDescription>{suggestion.description}</CardDescription>
                      </CardHeader>
                      <CardContent className="flex flex-wrap gap-2">
                        <Button size="sm" variant="outline" onClick={() => queueTask(suggestion.task)}>
                          Queue task
                        </Button>
                        {index === 3 && (
                          <Button size="sm" onClick={exportAll}>
                            <Download className="mr-2 h-4 w-4" />
                            Export CSV
                          </Button>
                        )}
                      </CardContent>
                    </Card>
                  </motion.div>
                )
              })}
            </CardContent>
          </Card>
        </motion.div>

        <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={1}>
          <Card className="rounded-none border-0 border-t">
            <CardHeader className="px-6 pt-6">
              <CardTitle>Workspace snapshot</CardTitle>
              <CardDescription>Live dashboard data available to export right now.</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-3 px-6 pb-6 sm:grid-cols-2 xl:grid-cols-4">
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Responses</p>
                <p className="mt-1 text-2xl font-semibold">{data?.metrics?.totalResponses?.value ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Survey opens</p>
                <p className="mt-1 text-2xl font-semibold">{data?.metrics?.totalSurveyOpens?.value ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Customers</p>
                <p className="mt-1 text-2xl font-semibold">{data?.metrics?.activeCustomers?.value ?? 0}</p>
              </div>
              <div className="rounded-lg border p-4">
                <p className="text-xs uppercase tracking-wide text-muted-foreground">Satisfaction</p>
                <p className="mt-1 text-2xl font-semibold">{data?.metrics?.avgSatisfaction?.value?.toFixed(1) ?? "0.0"}/5</p>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

      <motion.div initial="hidden" animate="visible" variants={fadeUp} custom={2} className="xl:sticky xl:top-6">
        <Card className="h-full rounded-none border-0 border-l border-primary/10 bg-card/95 shadow-none backdrop-blur">
          <CardHeader className="px-6 pt-6">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Sparkles className="h-4 w-4 text-primary" />
              Agent Panel
            </CardTitle>
            <CardDescription>Placeholder agent interface for drafting tasks, queueing work, and exporting data.</CardDescription>
          </CardHeader>
          <CardContent className="flex h-[calc(100vh-88px)] flex-col gap-4 px-6 pb-6">
            <ScrollArea className="flex-1 rounded-none border bg-muted/30 p-3">
              <div className="space-y-3">
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

            <div className="space-y-2">
              <Input
                placeholder="Ask the agent to draft, export, or inspect..."
                value={input}
                onChange={(event) => setInput(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter" && !event.shiftKey) {
                    event.preventDefault()
                    handleSubmit()
                  }
                }}
              />
              <div className="flex gap-2">
                <Button className="flex-1" onClick={handleSubmit}>
                  <RefreshCw className="mr-2 h-4 w-4" />
                  Send
                </Button>
                <Button variant="outline" onClick={exportAll}>
                  <Download className="h-4 w-4" />
                </Button>
              </div>
            </div>

              <div className="grid grid-cols-2 gap-2">
                <Button variant="secondary" size="sm" onClick={() => queueTask("survey")}>
                <FileText className="mr-2 h-4 w-4" />
                Survey
              </Button>
              <Button variant="secondary" size="sm" onClick={() => queueTask("email")}>
                <Mail className="mr-2 h-4 w-4" />
                Email
              </Button>
              <Button variant="secondary" size="sm" onClick={() => queueTask("customers")}>
                <Users className="mr-2 h-4 w-4" />
                Customers
              </Button>
              <Button variant="secondary" size="sm" onClick={exportAll}>
                <Download className="mr-2 h-4 w-4" />
                CSV
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
