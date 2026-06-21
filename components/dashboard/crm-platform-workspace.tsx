"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  AlertTriangle,
  Bot,
  Building2,
  CalendarDays,
  CheckCircle2,
  FileText,
  Flag,
  GitBranch,
  HeartHandshake,
  Layers3,
  Mail,
  Plus,
  RefreshCw,
  Search,
  Settings2,
  ShieldCheck,
  Table2,
  Users,
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

type FieldDefinition = {
  id: string
  api_name: string
  label: string
  field_type: string
  is_required: boolean
  options?: string[]
  position?: number
}

type ObjectType = {
  id: string
  api_name: string
  label: string
  plural_label: string
  module: string
  description?: string
  display_field: string
  crm_field_definitions?: FieldDefinition[]
}

type CRMRecord = {
  id: string
  display_name: string
  values: Record<string, any>
  lifecycle_status: string
  updated_at: string
  crm_object_types?: {
    label: string
    api_name: string
    module: string
  }
}

type PlatformSummary = {
  objectTypes: ObjectType[]
  metrics: Record<string, number>
  integrations: Array<{
    key: string
    type: string
    name: string
    status: string
    capabilities: string[]
    notes: string
    mcpPath?: string
    config?: { status?: string } | null
  }>
  complianceReadiness: {
    label: string
    note: string
  }
}

const metricCards = [
  { key: "objectTypes", label: "Record Types", icon: Layers3 },
  { key: "records", label: "Records", icon: Table2 },
  { key: "engagementEvents", label: "Engagement History", icon: Mail },
  { key: "automations", label: "Follow-up Rules", icon: Zap },
  { key: "reports", label: "Reports", icon: FileText },
  { key: "donationVolume", label: "Donation Volume", icon: HeartHandshake },
  { key: "events", label: "Events", icon: CalendarDays },
  { key: "pendingAiApprovals", label: "Agent Approvals", icon: Bot },
]

function formatValue(value: unknown) {
  if (value == null || value === "") return "-"
  if (Array.isArray(value)) return value.join(", ")
  if (typeof value === "object") return JSON.stringify(value)
  return String(value)
}

function sortedFields(objectType?: ObjectType) {
  return [...(objectType?.crm_field_definitions || [])].sort((a, b) => (a.position || 0) - (b.position || 0))
}

export function CRMPlatformWorkspace() {
  const [summary, setSummary] = useState<PlatformSummary | null>(null)
  const [records, setRecords] = useState<CRMRecord[]>([])
  const [count, setCount] = useState(0)
  const [selectedObjectId, setSelectedObjectId] = useState<string>("all")
  const [search, setSearch] = useState("")
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [recordValues, setRecordValues] = useState<Record<string, string>>({})
  const [newObject, setNewObject] = useState({ label: "", pluralLabel: "", apiName: "", description: "" })
  const { toast } = useToast()

  const selectedObject = useMemo(
    () => summary?.objectTypes.find((objectType) => objectType.id === selectedObjectId),
    [summary?.objectTypes, selectedObjectId],
  )

  const loadPlatform = async () => {
    setLoading(true)
    try {
      const summaryResponse = await fetch("/api/crm/platform")
      if (!summaryResponse.ok) throw new Error("Failed to load platform summary")
      const nextSummary = await summaryResponse.json()
      setSummary(nextSummary)
      const firstObjectId = selectedObjectId === "all" ? "" : selectedObjectId
      await loadRecords(firstObjectId, search)
    } catch (error: any) {
      toast({ title: "CRM platform unavailable", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  const loadRecords = async (objectTypeId = selectedObjectId === "all" ? "" : selectedObjectId, searchText = search) => {
    const params = new URLSearchParams()
    if (objectTypeId) params.set("objectTypeId", objectTypeId)
    if (searchText.trim()) params.set("search", searchText.trim())
    const response = await fetch(`/api/crm/records?${params.toString()}`)
    if (!response.ok) throw new Error("Failed to load records")
    const data = await response.json()
    setRecords(data.records || [])
    setCount(data.count || 0)
  }

  useEffect(() => {
    loadPlatform()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    loadRecords().catch((error) =>
      toast({ title: "Records unavailable", description: error.message, variant: "destructive" }),
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedObjectId])

  const handleSearch = async () => {
    try {
      await loadRecords()
    } catch (error: any) {
      toast({ title: "Search failed", description: error.message, variant: "destructive" })
    }
  }

  const createRecord = async () => {
    if (!selectedObject) {
      toast({ title: "Select an object type", description: "Choose an object type before creating a record." })
      return
    }
    setCreating(true)
    try {
      const response = await fetch("/api/crm/records", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          objectTypeId: selectedObject.id,
          values: recordValues,
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create record")
      setRecordValues({})
      await loadRecords(selectedObject.id)
      toast({ title: "Record created", description: `${selectedObject.label} saved.` })
    } catch (error: any) {
      toast({ title: "Record not created", description: error.message, variant: "destructive" })
    } finally {
      setCreating(false)
    }
  }

  const createObjectType = async () => {
    const apiName =
      newObject.apiName ||
      newObject.label
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, "_")
        .replace(/^_+|_+$/g, "")
    try {
      const response = await fetch("/api/crm/object-types", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          apiName,
          label: newObject.label,
          pluralLabel: newObject.pluralLabel || `${newObject.label}s`,
          description: newObject.description,
          fields: [
            { apiName: "name", label: "Name", fieldType: "text", isRequired: true, position: 10 },
            { apiName: "notes", label: "Notes", fieldType: "long_text", position: 20 },
          ],
        }),
      })
      const data = await response.json()
      if (!response.ok) throw new Error(data.error || "Failed to create object type")
      setNewObject({ label: "", pluralLabel: "", apiName: "", description: "" })
      await loadPlatform()
      setSelectedObjectId(data.objectType.id)
      toast({ title: "Object type created", description: `${data.objectType.label} is ready for records.` })
    } catch (error: any) {
      toast({ title: "Object type not created", description: error.message, variant: "destructive" })
    }
  }

  if (loading && !summary) {
    return (
      <div className="space-y-6 p-6">
        <div className="h-8 w-64 animate-pulse rounded bg-muted" />
        <div className="grid gap-4 md:grid-cols-4">
          {[1, 2, 3, 4].map((item) => (
            <div key={item} className="h-28 animate-pulse rounded-md border bg-muted/40" />
          ))}
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-4 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div className="space-y-2">
          <h1 className="text-3xl font-bold tracking-tight">Records</h1>
          <p className="max-w-3xl text-muted-foreground">
            Manage record types, relationship history, duplicate groups, and saved fields.
          </p>
        </div>
        <Button variant="outline" onClick={loadPlatform}>
          <RefreshCw className="mr-2 h-4 w-4" />
          Refresh
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {metricCards.map((metric) => {
          const Icon = metric.icon
          const value = summary?.metrics?.[metric.key] || 0
          return (
            <Card key={metric.key}>
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{metric.label}</CardTitle>
                <Icon className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold tabular-nums">
                  {metric.key === "donationVolume" ? `$${value.toLocaleString()}` : value.toLocaleString()}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Tabs defaultValue="records" className="space-y-6">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="records">Records</TabsTrigger>
          <TabsTrigger value="objects">Objects</TabsTrigger>
          <TabsTrigger value="duplicates">Duplicates</TabsTrigger>
          <TabsTrigger value="readiness">Readiness</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-6">
          <div className="flex flex-col gap-3 lg:flex-row">
            <Select value={selectedObjectId} onValueChange={setSelectedObjectId}>
              <SelectTrigger className="lg:w-72">
                <SelectValue placeholder="Object type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All object types</SelectItem>
                {summary?.objectTypes.map((objectType) => (
                  <SelectItem key={objectType.id} value={objectType.id}>
                    {objectType.plural_label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <div className="relative flex-1">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                className="pl-8"
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                onKeyDown={(event) => {
                  if (event.key === "Enter") handleSearch()
                }}
                placeholder="Search records by display name"
              />
            </div>
            <Button onClick={handleSearch}>Search</Button>
          </div>

          <div className="grid gap-6 xl:grid-cols-[1fr_360px]">
            <Card>
              <CardHeader>
                <CardTitle>Record Table</CardTitle>
                <CardDescription>{count.toLocaleString()} record(s) in this view</CardDescription>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Name</TableHead>
                      <TableHead>Object</TableHead>
                      <TableHead>Status</TableHead>
                      <TableHead>Updated</TableHead>
                      <TableHead className="w-[120px]">Open</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {records.map((record) => (
                      <TableRow key={record.id}>
                        <TableCell className="font-medium">{record.display_name}</TableCell>
                        <TableCell>{record.crm_object_types?.label || "Record"}</TableCell>
                        <TableCell>
                          <Badge variant="outline">{record.lifecycle_status}</Badge>
                        </TableCell>
                        <TableCell>{new Date(record.updated_at).toLocaleDateString()}</TableCell>
                        <TableCell>
                          <Button asChild variant="ghost" size="sm">
                            <Link href={`/dashboard/records/${record.id}`}>View</Link>
                          </Button>
                        </TableCell>
                      </TableRow>
                    ))}
                    {records.length === 0 && (
                      <TableRow>
                        <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                          No records found.
                        </TableCell>
                      </TableRow>
                    )}
                  </TableBody>
                </Table>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Create Record</CardTitle>
                <CardDescription>
                  {selectedObject ? `Add ${selectedObject.label.toLowerCase()} using its schema.` : "Select one object type."}
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedObject ? (
                  <>
                    {sortedFields(selectedObject).slice(0, 8).map((field) => (
                      <div key={field.id} className="space-y-2">
                        <Label htmlFor={`field-${field.api_name}`}>{field.label}</Label>
                        {field.field_type === "long_text" ? (
                          <Textarea
                            id={`field-${field.api_name}`}
                            value={recordValues[field.api_name] || ""}
                            onChange={(event) => setRecordValues((current) => ({ ...current, [field.api_name]: event.target.value }))}
                          />
                        ) : (
                          <Input
                            id={`field-${field.api_name}`}
                            type={field.field_type === "number" || field.field_type === "currency" ? "number" : field.field_type === "date" ? "date" : "text"}
                            value={recordValues[field.api_name] || ""}
                            onChange={(event) => setRecordValues((current) => ({ ...current, [field.api_name]: event.target.value }))}
                          />
                        )}
                      </div>
                    ))}
                    <Button className="w-full" disabled={creating} onClick={createRecord}>
                      <Plus className="mr-2 h-4 w-4" />
                      Create Record
                    </Button>
                  </>
                ) : (
                  <p className="text-sm text-muted-foreground">Creation form appears after choosing one object type.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="objects" className="grid gap-6 xl:grid-cols-[1fr_360px]">
          <Card>
            <CardHeader>
              <CardTitle>Object Model</CardTitle>
              <CardDescription>Default objects can be extended with custom fields and records.</CardDescription>
            </CardHeader>
            <CardContent>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Object</TableHead>
                    <TableHead>API Name</TableHead>
                    <TableHead>Module</TableHead>
                    <TableHead>Fields</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {summary?.objectTypes.map((objectType) => (
                    <TableRow key={objectType.id}>
                      <TableCell>
                        <div className="font-medium">{objectType.plural_label}</div>
                        <div className="text-sm text-muted-foreground">{objectType.description}</div>
                      </TableCell>
                      <TableCell>{objectType.api_name}</TableCell>
                      <TableCell>{objectType.module}</TableCell>
                      <TableCell>{objectType.crm_field_definitions?.length || 0}</TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Create Object</CardTitle>
              <CardDescription>Starts with Name and Notes fields. Add more fields through API.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Label</Label>
                <Input value={newObject.label} onChange={(event) => setNewObject((current) => ({ ...current, label: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>Plural Label</Label>
                <Input value={newObject.pluralLabel} onChange={(event) => setNewObject((current) => ({ ...current, pluralLabel: event.target.value }))} />
              </div>
              <div className="space-y-2">
                <Label>API Name</Label>
                <Input value={newObject.apiName} onChange={(event) => setNewObject((current) => ({ ...current, apiName: event.target.value }))} placeholder="major_gifts" />
              </div>
              <div className="space-y-2">
                <Label>Description</Label>
                <Textarea value={newObject.description} onChange={(event) => setNewObject((current) => ({ ...current, description: event.target.value }))} />
              </div>
              <Button className="w-full" onClick={createObjectType} disabled={!newObject.label.trim()}>
                <Plus className="mr-2 h-4 w-4" />
                Create Object
              </Button>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="duplicates" className="grid gap-6 lg:grid-cols-3">
          <Card className="lg:col-span-2">
            <CardHeader>
              <CardTitle>Duplicate Management</CardTitle>
              <CardDescription>
                Duplicate detection is based on normalized email, phone, or name keys. Merge workflow is scaffolded for safe review.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Button asChild variant="outline">
                <Link href="/api/crm/duplicates" target="_blank">
                  Open Duplicate JSON
                </Link>
              </Button>
            </CardContent>
          </Card>
          <Card>
            <CardHeader>
              <CardTitle>{summary?.metrics.duplicateGroups || 0}</CardTitle>
              <CardDescription>Likely duplicate group(s)</CardDescription>
            </CardHeader>
            <CardContent>
              <p className="text-sm text-muted-foreground">
                Next merge step should show field-by-field conflict review before writing a primary record.
              </p>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="readiness" className="grid gap-4 md:grid-cols-2">
          <ReadinessCard icon={GitBranch} title="Connected Tool Choices" text="Email, texting, donations, surveys, calendar, accounting, webhooks, and donor research can be connected without locking SleekCRM to one vendor." />
          <ReadinessCard icon={ShieldCheck} title={summary?.complianceReadiness.label || "Compliance-readiness"} text={summary?.complianceReadiness.note || ""} />
          <ReadinessCard icon={Flag} title="Plan Foundations" text="Plan, feature, usage, record limit, user limit, and storage limit tracking are prepared for future tiers." />
          <ReadinessCard icon={AlertTriangle} title="Production Limits" text="Payment processing, text messages, donor research, calendar sync, and accounting sync are inactive until an admin finishes setup." />
        </TabsContent>
      </Tabs>
    </div>
  )
}

function ReadinessCard({
  icon: Icon,
  title,
  text,
}: {
  icon: typeof CheckCircle2
  title: string
  text: string
}) {
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

export function DynamicRecordPage({ recordId }: { recordId: string }) {
  const [data, setData] = useState<any>(null)
  const [loading, setLoading] = useState(true)
  const [eventBody, setEventBody] = useState("")
  const { toast } = useToast()

  const load = async () => {
    setLoading(true)
    try {
      const response = await fetch(`/api/crm/records/${recordId}`)
      const next = await response.json()
      if (!response.ok) throw new Error(next.error || "Record not found")
      setData(next)
    } catch (error: any) {
      toast({ title: "Record unavailable", description: error.message, variant: "destructive" })
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recordId])

  const createNote = async () => {
    if (!eventBody.trim()) return
    try {
      const response = await fetch("/api/crm/engagements", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          recordId,
          eventType: "note",
          subject: "Manual note",
          body: eventBody,
        }),
      })
      const result = await response.json()
      if (!response.ok) throw new Error(result.error || "Failed to save note")
      setEventBody("")
      await load()
    } catch (error: any) {
      toast({ title: "Note not saved", description: error.message, variant: "destructive" })
    }
  }

  if (loading) return <div className="p-6 text-muted-foreground">Loading record...</div>
  if (!data?.record) return <div className="p-6 text-muted-foreground">Record not found.</div>

  const objectType = data.record.crm_object_types
  const fields = sortedFields({
    ...objectType,
    crm_field_definitions: objectType?.crm_field_definitions || [],
  })

  return (
    <div className="space-y-6 p-6">
      <div className="flex flex-col gap-3 border-b pb-6 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Button asChild variant="ghost" className="-ml-3 mb-3">
            <Link href="/dashboard/records">Back to Records</Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight">{data.record.display_name}</h1>
          <p className="text-muted-foreground">{objectType?.label || "Record"} profile</p>
        </div>
        <Badge variant="outline">{data.record.lifecycle_status}</Badge>
      </div>

      <div className="grid gap-6 xl:grid-cols-[1fr_420px]">
        <Card>
          <CardHeader>
            <CardTitle>Fields</CardTitle>
            <CardDescription>Rendered from object schema.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Field</TableHead>
                  <TableHead>Value</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {fields.map((field) => (
                  <TableRow key={field.id}>
                    <TableCell className="font-medium">{field.label}</TableCell>
                    <TableCell>{formatValue(data.record.values?.[field.api_name])}</TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Engagement Timeline</CardTitle>
              <CardDescription>Emails, SMS, notes, calls, meetings, forms, donations, events, tasks, and AI actions share one stream.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label>Add Note</Label>
                <Textarea value={eventBody} onChange={(event) => setEventBody(event.target.value)} />
                <Button size="sm" onClick={createNote}>Save Note</Button>
              </div>
              <div className="space-y-3">
                {(data.engagements || []).map((event: any) => (
                  <div key={event.id} className="border-l pl-3">
                    <div className="flex items-center justify-between gap-3">
                      <div className="font-medium">{event.subject || event.event_type}</div>
                      <Badge variant="outline">{event.event_type}</Badge>
                    </div>
                    <div className="text-sm text-muted-foreground">{new Date(event.occurred_at).toLocaleString()}</div>
                    {event.body && <p className="mt-1 text-sm">{event.body}</p>}
                  </div>
                ))}
                {(data.engagements || []).length === 0 && (
                  <p className="text-sm text-muted-foreground">No engagement events yet.</p>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
