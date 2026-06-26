"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import {
  Activity,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  DollarSign,
  Download,
  FileText,
  Globe2,
  HeartHandshake,
  Mail,
  MessageSquare,
  Plus,
  RefreshCw,
  Settings2,
  ShieldCheck,
  UserCheck,
  Webhook,
  Zap,
} from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { useToast } from "@/components/ui/use-toast"

type ModuleKind = "communications" | "automations" | "reports" | "fundraising" | "events" | "integrations" | "admin"

type ModuleConfig = {
  kind: ModuleKind
  title: string
  description: string
}

const configs: Record<ModuleKind, ModuleConfig> = {
  communications: {
    kind: "communications",
    title: "Communications",
    description: "Email, texts, templates, forms, consent, and relationship history.",
  },
  automations: {
    kind: "automations",
    title: "Automations",
    description: "Follow-up rules and scheduled work the agent can prepare for review.",
  },
  reports: {
    kind: "reports",
    title: "Reports",
    description: "Saved views, dashboards, and summaries prepared from CRM data.",
  },
  fundraising: {
    kind: "fundraising",
    title: "Fundraising",
    description: "Donors, gifts, campaigns, funds, pledges, events, and follow-up work.",
  },
  events: {
    kind: "events",
    title: "Events",
    description: "Event records, registrations, attendee lists, check-in state, and communications.",
  },
  integrations: {
    kind: "integrations",
    title: "Connected Tools",
    description: "Tools the agent can use after an admin connects them.",
  },
  admin: {
    kind: "admin",
    title: "Settings",
    description: "Team access, data controls, usage, readiness settings, and agent approvals.",
  },
}

const iconByKind = {
  communications: Mail,
  automations: Zap,
  reports: BarChart3,
  fundraising: HeartHandshake,
  events: CalendarDays,
  integrations: Webhook,
  admin: ShieldCheck,
}

function safeDate(value: string) {
  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? "-" : date.toLocaleDateString()
}

function humanize(value: string) {
  return value.replace(/_/g, " ").replace(/\b\w/g, (char) => char.toUpperCase())
}

function displayCellValue(column: string, value: any) {
  if (value == null || value === "") return "-"
  if (typeof value === "boolean") return value ? "Yes" : "No"
  if (/(_at|_date|date|starts_at|checked_in_at)$/i.test(column) && typeof value === "string") return safeDate(value)
  if (column.includes("amount") && (typeof value === "number" || typeof value === "string")) {
    const amount = Number(value)
    return Number.isFinite(amount) ? amount.toLocaleString("en-US", { style: "currency", currency: "USD" }) : value
  }
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function firstText(row: Record<string, any>, keys: string[]) {
  for (const key of keys) {
    if (row[key] != null && row[key] !== "") return String(row[key])
  }
  return "-"
}

function ModuleTable({ title, description, rows, columns }: { title: string; description: string; rows: any[]; columns: string[] }) {
  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              {columns.map((column) => (
                <TableHead key={column}>{humanize(column)}</TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.id}>
                {columns.map((column) => {
                  const key = column.toLowerCase().replace(/\s+/g, "_")
                  const value = row[key] ?? row[column] ?? row[column.toLowerCase()]
                  return <TableCell key={column}>{displayCellValue(key, value)}</TableCell>
                })}
              </TableRow>
            ))}
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="py-10 text-center text-muted-foreground">
                  No records yet.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  )
}

export function CRMModulePage({ kind }: { kind: ModuleKind }) {
  const config = configs[kind]
  const Icon = iconByKind[kind]

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <Icon className="h-8 w-8 text-muted-foreground" />
            <h1 className="text-3xl font-bold tracking-tight">{config.title}</h1>
          </div>
          <p className="max-w-3xl text-muted-foreground">{config.description}</p>
        </div>
      </div>

      {kind === "communications" && <CommunicationsModule />}
      {kind === "automations" && <AutomationsModule />}
      {kind === "reports" && <ReportsModule />}
      {kind === "fundraising" && <FundraisingModule />}
      {kind === "events" && <EventsModule />}
      {kind === "integrations" && <IntegrationsModule />}
      {kind === "admin" && <AdminModule />}
    </div>
  )
}

function CommunicationsModule() {
  const [templates, setTemplates] = useState<any[]>([])
  const [forms, setForms] = useState<any[]>([])
  const [template, setTemplate] = useState({ name: "", channel: "email", subject: "", body: "" })
  const { toast } = useToast()

  const load = async () => {
    const [templateRes, formRes] = await Promise.all([
      fetch("/api/crm/modules/templates"),
      fetch("/api/crm/modules/forms"),
    ])
    setTemplates((await templateRes.json()).rows || [])
    setForms((await formRes.json()).rows || [])
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  const createTemplate = async () => {
    const response = await fetch("/api/crm/modules/templates", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(template),
    })
    if (!response.ok) {
      toast({ title: "Template not saved", variant: "destructive" })
      return
    }
    setTemplate({ name: "", channel: "email", subject: "", body: "" })
    await load()
  }

  return (
    <Tabs defaultValue="templates" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3">
        <TabsTrigger value="templates">Templates</TabsTrigger>
        <TabsTrigger value="forms">Forms</TabsTrigger>
        <TabsTrigger value="tracking">Tracking</TabsTrigger>
      </TabsList>
      <TabsContent value="templates" className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <ModuleTable title="Templates" description="Email, SMS, receipt, and event templates." rows={templates} columns={["name", "channel", "subject", "created_at"]} />
        <Card>
          <CardHeader>
            <CardTitle>Create Template</CardTitle>
            <CardDescription>SMS send and tracking wait for provider credentials.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Name" value={template.name} onChange={(event) => setTemplate((current) => ({ ...current, name: event.target.value }))} />
            <Select value={template.channel} onValueChange={(channel) => setTemplate((current) => ({ ...current, channel }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="email">Email</SelectItem>
                <SelectItem value="sms">SMS</SelectItem>
                <SelectItem value="receipt">Receipt</SelectItem>
                <SelectItem value="event">Event</SelectItem>
              </SelectContent>
            </Select>
            <Input placeholder="Subject" value={template.subject} onChange={(event) => setTemplate((current) => ({ ...current, subject: event.target.value }))} />
            <Textarea placeholder="Body" value={template.body} onChange={(event) => setTemplate((current) => ({ ...current, body: event.target.value }))} />
            <Button className="w-full" onClick={createTemplate} disabled={!template.name || !template.body}>
              <Plus className="mr-2 h-4 w-4" />
              Save Template
            </Button>
          </CardContent>
        </Card>
      </TabsContent>
      <TabsContent value="forms">
        <ModuleTable title="Public Forms" description="Forms can create or update CRM records. Custom-domain routing is scaffolded." rows={forms} columns={["name", "form_type", "slug", "is_active"]} />
      </TabsContent>
      <TabsContent value="tracking" className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Email Workspace</CardTitle>
            <CardDescription>Existing inbox, compose, save, and relationship attachment features stay available.</CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild variant="outline">
              <Link href="/dashboard/email">Open Email Workspace</Link>
            </Button>
          </CardContent>
        </Card>
        <Readiness title="Email Tracking" icon={Mail} text="Fields support sent, replied, bounced, opened, and clicked when a provider supplies those events." />
        <Readiness title="SMS Consent" icon={MessageSquare} text="Consent preferences and suppression list tables are ready before SMS provider connection." />
        <Readiness title="Suppression Handling" icon={UserCheck} text="Email/SMS suppression is stored by channel and value. Sending providers must check it server-side." />
        <Readiness title="Custom Domains" icon={Globe2} text="Public form, survey, and donation page custom-domain fields are scaffolded." />
      </TabsContent>
    </Tabs>
  )
}

function AutomationsModule() {
  const [rules, setRules] = useState<any[]>([])
  const [runs, setRuns] = useState<any[]>([])
  const [rule, setRule] = useState({ name: "", triggerType: "record_created", description: "" })

  const load = async () => {
    const [rulesRes, runsRes] = await Promise.all([
      fetch("/api/crm/modules/automations"),
      fetch("/api/crm/modules/automationRuns"),
    ])
    setRules((await rulesRes.json()).rows || [])
    setRuns((await runsRes.json()).rows || [])
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  const createRule = async () => {
    await fetch("/api/crm/modules/automations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...rule,
        actions: [{ type: "create_task", config: { title: "Review automation result" } }],
        requiresApproval: true,
        isActive: false,
      }),
    })
    setRule({ name: "", triggerType: "record_created", description: "" })
    await load()
  }

  return (
    <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
      <div className="space-y-6">
        <ModuleTable title="Automation Rules" description="Rules are inactive by default until reviewed." rows={rules} columns={["name", "trigger_type", "requires_approval", "is_active"]} />
        <ModuleTable title="Run Logs" description="Every run records trigger data, actions, output, status, and errors." rows={runs} columns={["status", "created_at", "error_message"]} />
      </div>
      <Card>
        <CardHeader>
          <CardTitle>Draft Automation</CardTitle>
          <CardDescription>Sensitive actions require approval before execution.</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Input placeholder="Name" value={rule.name} onChange={(event) => setRule((current) => ({ ...current, name: event.target.value }))} />
          <Select value={rule.triggerType} onValueChange={(triggerType) => setRule((current) => ({ ...current, triggerType }))}>
            <SelectTrigger><SelectValue /></SelectTrigger>
            <SelectContent>
              {["record_created", "record_updated", "survey_submitted", "form_submitted", "email_received", "donation_created", "event_registration_created", "task_due", "manual"].map((trigger) => (
                <SelectItem key={trigger} value={trigger}>{trigger}</SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Textarea placeholder="Description" value={rule.description} onChange={(event) => setRule((current) => ({ ...current, description: event.target.value }))} />
          <Button className="w-full" disabled={!rule.name} onClick={createRule}>
            <Zap className="mr-2 h-4 w-4" />
            Create Draft Rule
          </Button>
        </CardContent>
      </Card>
    </div>
  )
}

function ReportsModule() {
  const [reports, setReports] = useState<any[]>([])
  const [dashboards, setDashboards] = useState<any[]>([])
  const [report, setReport] = useState({ name: "", reportType: "table", description: "" })

  const load = async () => {
    const [reportsRes, dashboardsRes] = await Promise.all([
      fetch("/api/crm/modules/reports"),
      fetch("/api/crm/modules/dashboards"),
    ])
    setReports((await reportsRes.json()).rows || [])
    setDashboards((await dashboardsRes.json()).rows || [])
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  const createReport = async () => {
    await fetch("/api/crm/modules/reports", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        ...report,
        definition: { source: "crm_records", filters: [], columns: ["display_name", "updated_at"] },
      }),
    })
    setReport({ name: "", reportType: "table", description: "" })
    await load()
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-4">
        <Readiness title="KPI Cards" icon={Activity} text="Dashboard widgets support KPI, chart, and table config." />
        <Readiness title="CSV Export" icon={Download} text="Export logs are scaffolded through audit and usage event tables." />
        <Readiness title="Relational Reports" icon={BarChart3} text="Definitions can query linked CRM objects and module tables." />
        <Readiness title="Agent Actions" icon={CheckCircle2} text="Agent can draft report definitions for approval." />
      </div>
      <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
        <div className="space-y-6">
          <ModuleTable title="Saved Reports" description="Report definitions store source, joins, columns, filters, and chart settings." rows={reports} columns={["name", "report_type", "is_shared", "updated_at"]} />
          <ModuleTable title="Dashboards" description="Dashboards store layout and filters separately from widgets." rows={dashboards} columns={["name", "is_default", "updated_at"]} />
        </div>
        <Card>
          <CardHeader>
            <CardTitle>Create Report</CardTitle>
            <CardDescription>Starts as a saved definition. Query builder can expand later.</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input placeholder="Name" value={report.name} onChange={(event) => setReport((current) => ({ ...current, name: event.target.value }))} />
            <Select value={report.reportType} onValueChange={(reportType) => setReport((current) => ({ ...current, reportType }))}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="table">Table</SelectItem>
                <SelectItem value="chart">Chart</SelectItem>
                <SelectItem value="kpi">KPI</SelectItem>
                <SelectItem value="relational">Relational</SelectItem>
              </SelectContent>
            </Select>
            <Textarea placeholder="Description" value={report.description} onChange={(event) => setReport((current) => ({ ...current, description: event.target.value }))} />
            <Button className="w-full" disabled={!report.name} onClick={createReport}>
              <Plus className="mr-2 h-4 w-4" />
              Save Report
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function FundraisingModule() {
  const [researchRequests, setResearchRequests] = useState<any[]>([])
  const [donations, setDonations] = useState<any[]>([])
  const [campaigns, setCampaigns] = useState<any[]>([])
  const [funds, setFunds] = useState<any[]>([])
  const [pledges, setPledges] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [registrations, setRegistrations] = useState<any[]>([])

  const load = async () => {
    const [researchRes, donationRes, campaignRes, fundsRes, pledgesRes, eventRes, regRes] = await Promise.all([
      fetch("/api/crm/modules/donorResearch"),
      fetch("/api/crm/modules/donations"),
      fetch("/api/crm/modules/campaigns"),
      fetch("/api/crm/modules/funds"),
      fetch("/api/crm/modules/pledges"),
      fetch("/api/crm/modules/events"),
      fetch("/api/crm/modules/eventRegistrations"),
    ])
    setResearchRequests((await researchRes.json()).rows || [])
    setDonations((await donationRes.json()).rows || [])
    setCampaigns((await campaignRes.json()).rows || [])
    setFunds((await fundsRes.json()).rows || [])
    setPledges((await pledgesRes.json()).rows || [])
    setEvents((await eventRes.json()).rows || [])
    setRegistrations((await regRes.json()).rows || [])
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  return (
    <Tabs defaultValue="research" className="space-y-6">
      <TabsList className="grid w-full grid-cols-3 md:grid-cols-5">
        <TabsTrigger value="research">Research</TabsTrigger>
        <TabsTrigger value="donations">Donations</TabsTrigger>
        <TabsTrigger value="campaigns">Campaigns</TabsTrigger>
        <TabsTrigger value="funds">Funds</TabsTrigger>
        <TabsTrigger value="pledges">Pledges</TabsTrigger>
      </TabsList>
      <TabsContent value="research" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-3">
          <Readiness title="Donor Research Queue" icon={HeartHandshake} text="Agent-prepared research requests are reviewable before any donor profile changes." />
          <Readiness title="DonorSearch Shell" icon={ShieldCheck} text="The adapter is readiness-only until private API docs and server-side credentials are configured." />
          <Readiness title="Connection Work" icon={UserCheck} text="Use research output to prepare introductions, stewardship notes, and follow-up tasks." />
        </div>
        <ModuleTable
          title="Donor Research Requests"
          description="No live enrichment runs from this table. Requests preserve target, goal, readiness, and review status."
          rows={researchRequests}
          columns={["provider_key", "status", "customer_id", "created_at"]}
        />
      </TabsContent>
      <TabsContent value="donations"><ModuleTable title="Donations" description="Internal gift records work now. Online payment processing is not active until connected." rows={donations} columns={["amount", "currency", "donation_date", "payment_status", "receipt_status"]} /></TabsContent>
      <TabsContent value="campaigns"><ModuleTable title="Campaigns" description="Campaigns can link to donations, events, forms, surveys, and tasks." rows={campaigns} columns={["name", "campaign_type", "goal_amount", "status"]} /></TabsContent>
      <TabsContent value="funds"><ModuleTable title="Funds / Designations" description="Funds let donations map to designations without making the app nonprofit-only." rows={funds} columns={["name", "is_active", "created_at"]} /></TabsContent>
      <TabsContent value="pledges"><ModuleTable title="Pledges" description="Pledge and recurring gift records are separate from live payment processing." rows={pledges} columns={["amount", "currency", "due_date", "status"]} /></TabsContent>
    </Tabs>
  )
}

function EventsModule() {
  const [events, setEvents] = useState<any[]>([])
  const [registrations, setRegistrations] = useState<any[]>([])

  const load = async () => {
    const [eventRes, regRes] = await Promise.all([
      fetch("/api/crm/modules/events"),
      fetch("/api/crm/modules/eventRegistrations"),
    ])
    setEvents((await eventRes.json()).rows || [])
    setRegistrations((await regRes.json()).rows || [])
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  return (
    <div className="space-y-6">
      <div className="grid gap-4 md:grid-cols-3">
        <Readiness title="Internal Calendar" icon={CalendarDays} text="Event model is internal and works before external sync." />
        <Readiness title="Registrations" icon={UserCheck} text="Registration forms can associate attendees with people, organizations, donations, surveys, and tasks." />
        <Readiness title="Calendar Sync" icon={RefreshCw} text="External calendar sync is ready for setup in connected tools." />
      </div>
      <ModuleTable title="Events" description="Events can attach to campaigns and later sync to calendars." rows={events} columns={["name", "starts_at", "location", "status"]} />
      <ModuleTable title="Attendees" description="Check-in status lives on event registrations." rows={registrations} columns={["attendee_name", "attendee_email", "status", "checked_in_at"]} />
    </div>
  )
}

export function ConnectedToolsPanel() {
  const [integrations, setIntegrations] = useState<any[]>([])
  const { toast } = useToast()

  const load = async () => {
    const response = await fetch("/api/crm/integrations")
    setIntegrations((await response.json()).integrations || [])
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  const enable = async (integration: any) => {
    const response = await fetch("/api/crm/integrations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        providerKey: integration.key,
        providerType: integration.type,
        displayName: integration.name,
        status: "configured",
        config: { configuredInUi: true },
      }),
    })
    if (!response.ok) {
      toast({ title: "Tool not saved", variant: "destructive" })
      return
    }
    await load()
  }

  const test = async (integration: any) => {
    if (!integration.config?.id) return
    const response = await fetch(`/api/crm/integrations/${integration.config.id}/test`, { method: "POST" })
    const result = await response.json()
    toast({ title: result.result?.status || "Test complete", description: result.result?.message || result.error })
    await load()
  }

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {integrations.map((integration) => (
        <Card key={integration.key}>
          <CardHeader>
            <div className="flex items-start justify-between gap-4">
              <div>
                <CardTitle>{integration.name}</CardTitle>
                <CardDescription>{integration.notes}</CardDescription>
              </div>
              <Badge variant={integration.config ? "default" : "outline"}>
                {integration.config?.status === "configured" || integration.config?.status === "enabled"
                  ? "Ready"
                  : "Setup needed"}
              </Badge>
            </div>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-wrap gap-2">
              {integration.capabilities.map((capability: string) => (
                <Badge key={capability} variant="secondary">{humanize(capability)}</Badge>
              ))}
            </div>
            {integration.agentActions?.length > 0 && (
              <div className="space-y-2 text-sm text-muted-foreground">
                <p className="font-medium text-foreground">Agent can prepare:</p>
                <ul className="list-disc space-y-1 pl-5">
                  {integration.agentActions.slice(0, 3).map((action: string) => (
                    <li key={action}>{action}</li>
                  ))}
                </ul>
              </div>
            )}
            {integration.sourceUrl && (
              <Link href={integration.sourceUrl} target="_blank" rel="noreferrer" className="text-sm text-primary hover:underline">
                Learn about setup
              </Link>
            )}
            <div className="flex gap-2">
              <Button size="sm" variant="outline" onClick={() => enable(integration)}>
                <Settings2 className="mr-2 h-4 w-4" />
                Mark for setup
              </Button>
              <Button size="sm" variant="ghost" disabled={!integration.config?.id} onClick={() => test(integration)}>
                Check setup
              </Button>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  )
}

function IntegrationsModule() {
  return <ConnectedToolsPanel />
}

function AdminModule() {
  const [approvals, setApprovals] = useState<any[]>([])
  const [usage, setUsage] = useState<any[]>([])
  const [suppressions, setSuppressions] = useState<any[]>([])

  const load = async () => {
    const [approvalRes, usageRes, suppressionRes] = await Promise.all([
      fetch("/api/crm/modules/approvals"),
      fetch("/api/crm/modules/usage"),
      fetch("/api/crm/modules/suppressions"),
    ])
    setApprovals((await approvalRes.json()).rows || [])
    setUsage((await usageRes.json()).rows || [])
    setSuppressions((await suppressionRes.json()).rows || [])
  }

  useEffect(() => {
    load().catch(() => undefined)
  }, [])

  return (
    <Tabs defaultValue="governance" className="space-y-6">
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="governance">Governance</TabsTrigger>
        <TabsTrigger value="usage">Usage</TabsTrigger>
        <TabsTrigger value="compliance">Compliance</TabsTrigger>
        <TabsTrigger value="ai">AI Approvals</TabsTrigger>
      </TabsList>
      <TabsContent value="governance" className="grid gap-4 md:grid-cols-2">
        <Readiness title="Access Rules" icon={ShieldCheck} text="Roles, permissions, and user-role tables are present. Enforcement should be centralized as next hardening pass." />
        <Readiness title="Audit Logs" icon={Activity} text="Customer, CRM object, CRM record, engagement, integration, and module writes call audit logging." />
        <Readiness title="Export Logs" icon={Download} text="Export intent is covered by audit and usage primitives before CSV export routes are added." />
        <Readiness title="Record Ownership" icon={UserCheck} text="Dynamic records include owner_user_id, created_by, and updated_by." />
      </TabsContent>
      <TabsContent value="usage"><ModuleTable title="Usage Events" description="Plans, limits, storage, connected-tool activity, and feature flags can build on this feed." rows={usage} columns={["metric", "quantity", "created_at"]} /></TabsContent>
      <TabsContent value="compliance" className="space-y-6">
        <div className="grid gap-4 md:grid-cols-2">
          <Readiness title="HIPAA-readiness" icon={ShieldCheck} text="Controls can help safer handling. This does not make the deployment legally HIPAA compliant." />
          <Readiness title="FERPA-readiness" icon={ShieldCheck} text="Controls can help school-data workflows. Legal compliance depends on contracts, deployment, policy, and operations." />
        </div>
        <ModuleTable title="Suppression List" description="Email/SMS suppression entries must be checked by providers before sends." rows={suppressions} columns={["channel", "value", "reason", "created_at"]} />
      </TabsContent>
      <TabsContent value="ai"><ModuleTable title="AI Action Approvals" description="Risky actions, destructive changes, and external communications should land here before execution." rows={approvals} columns={["action_kind", "title", "status", "created_at"]} /></TabsContent>
    </Tabs>
  )
}

function Readiness({ title, text, icon: Icon }: { title: string; text: string; icon: typeof CheckCircle2 }) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-start gap-3 space-y-0">
        <Icon className="mt-1 h-5 w-5 text-muted-foreground" />
        <div>
          <CardTitle className="text-base">{title}</CardTitle>
          <CardDescription>{text}</CardDescription>
        </div>
      </CardHeader>
    </Card>
  )
}
