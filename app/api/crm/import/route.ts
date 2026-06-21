import { type NextRequest, NextResponse } from "next/server"
import * as XLSX from "xlsx"
import { getCurrentUser } from "@/lib/supabase/auth"
import { supabaseAdmin as supabase } from "@/lib/supabase/server"
import { saveEmailsForAnalysis, type InboxEmailForAnalysis } from "@/lib/email-analysis-selection"

export const runtime = "nodejs"

type ImportCustomer = {
  name?: string
  email?: string
  phone?: string
  location?: string
  age?: number
  notes?: string
  relationship_type?: string
}

const CUSTOMER_TYPES = new Set(["customer", "lead", "partner", "vendor", "supplier", "contractor", "affiliate", "other"])

function clean(value: unknown) {
  return typeof value === "string" ? value.replace(/\s+/g, " ").trim() : value == null ? "" : String(value).trim()
}

function pick(row: Record<string, any>, keys: string[]) {
  const normalized = Object.fromEntries(Object.entries(row).map(([key, value]) => [key.toLowerCase().replace(/[\s_-]+/g, ""), value]))
  for (const key of keys) {
    const value = normalized[key.toLowerCase().replace(/[\s_-]+/g, "")]
    if (value != null && clean(value)) return clean(value)
  }
  return ""
}

function parseCsv(text: string) {
  const rows: string[][] = []
  let row: string[] = []
  let cell = ""
  let quoted = false

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i]
    const next = text[i + 1]
    if (char === '"' && quoted && next === '"') {
      cell += '"'
      i += 1
    } else if (char === '"') {
      quoted = !quoted
    } else if (char === "," && !quoted) {
      row.push(cell)
      cell = ""
    } else if ((char === "\n" || char === "\r") && !quoted) {
      if (char === "\r" && next === "\n") i += 1
      row.push(cell)
      if (row.some((value) => value.trim())) rows.push(row)
      row = []
      cell = ""
    } else {
      cell += char
    }
  }

  row.push(cell)
  if (row.some((value) => value.trim())) rows.push(row)
  if (rows.length === 0) return []

  const headers = rows[0].map((header) => header.trim())
  return rows.slice(1).map((values) =>
    Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ""])),
  )
}

function parseXlsx(buffer: ArrayBuffer) {
  const workbook = XLSX.read(buffer, { type: "array" })
  return workbook.SheetNames.flatMap((sheetName) => {
    const sheet = workbook.Sheets[sheetName]
    return XLSX.utils.sheet_to_json<Record<string, any>>(sheet, { defval: "" }).map((row) => ({
      ...row,
      sheet: row.sheet || sheetName,
    }))
  })
}

function flattenInput(input: any): any[] {
  if (Array.isArray(input)) return input
  if (Array.isArray(input?.customers) || Array.isArray(input?.emails)) {
    return [
      ...(input.customers || []).map((row: any) => ({ ...row, type: row.type || "customer" })),
      ...(input.emails || []).map((row: any) => ({ ...row, type: row.type || "email" })),
    ]
  }
  return []
}

function rowKind(row: Record<string, any>) {
  const explicit = pick(row, ["type", "record_type", "kind"]).toLowerCase()
  if (explicit.includes("email")) return "email"
  if (explicit.includes("customer") || explicit.includes("contact") || explicit.includes("lead")) return "customer"
  if (pick(row, ["subject", "from", "from_email", "sender", "sender_email", "body", "content", "message"])) return "email"
  return "customer"
}

function toCustomer(row: Record<string, any>): ImportCustomer | null {
  const email = pick(row, ["email", "customer_email", "contact_email", "work_email"]).toLowerCase()
  const name = pick(row, ["name", "customer_name", "contact_name", "full_name", "company"])
  if (!email && !name) return null
  const relationship = pick(row, ["relationship_type", "relationship", "type", "status"]).toLowerCase()
  const age = Number(pick(row, ["age"]))
  return {
    name: name || email || "Imported customer",
    email,
    phone: pick(row, ["phone", "phone_number", "mobile"]),
    location: pick(row, ["location", "city", "address", "region"]),
    age: Number.isFinite(age) && age > 0 ? age : undefined,
    notes: pick(row, ["notes", "note", "description", "summary"]),
    relationship_type: CUSTOMER_TYPES.has(relationship) ? relationship : "customer",
  }
}

function toEmail(row: Record<string, any>): InboxEmailForAnalysis | null {
  const fromEmail = pick(row, ["from_email", "sender_email", "email", "from"])
  const subject = pick(row, ["subject", "title"])
  const body = pick(row, ["body", "content", "message", "content_text", "text", "notes"])
  if (!fromEmail && !subject && !body) return null
  return {
    id: pick(row, ["id", "message_id", "gmail_message_id"]) || `import-${Date.now()}-${Math.random().toString(36).slice(2)}`,
    threadId: pick(row, ["thread_id", "threadId"]) || null,
    from: pick(row, ["from", "sender", "from_name", "sender_name"]) || fromEmail,
    fromEmail,
    fromName: pick(row, ["from_name", "sender_name", "name"]),
    to: pick(row, ["to", "recipient", "recipient_to"]),
    cc: pick(row, ["cc", "recipient_cc"]),
    bcc: pick(row, ["bcc", "recipient_bcc"]),
    subject,
    dateFull: pick(row, ["date", "sent_at", "created_at", "timestamp"]) || new Date().toISOString(),
    contentText: body,
    html: pick(row, ["html", "content_html"]),
    content: body,
  }
}

async function upsertCustomers(user: any, customers: ImportCustomer[]) {
  const businessId = user.business?.id
  if (!businessId || customers.length === 0) return { created: 0, updated: 0, errors: [] as string[] }

  let created = 0
  let updated = 0
  const errors: string[] = []

  for (const customer of customers) {
    try {
      const email = clean(customer.email).toLowerCase()
      const query = supabase.from("customers").select("id").eq("business_id", businessId)
      const { data: existing } = email
        ? await query.eq("email", email).maybeSingle()
        : await query.eq("name", customer.name || "Imported customer").maybeSingle()

      const payload = {
        business_id: businessId,
        name: customer.name || email || "Imported customer",
        email: email || null,
        phone: customer.phone || null,
        location: customer.location || null,
        age: customer.age || null,
        notes: customer.notes || null,
        relationship_type: customer.relationship_type || "customer",
        data: customer,
        updated_at: new Date().toISOString(),
      }

      if (existing?.id) {
        const { error } = await supabase.from("customers").update(payload).eq("id", existing.id).eq("business_id", businessId)
        if (error) throw error
        updated += 1
      } else {
        const { error } = await supabase.from("customers").insert(payload)
        if (error) throw error
        created += 1
      }
    } catch (error: any) {
      errors.push(error?.message || "Customer import failed")
    }
  }

  return { created, updated, errors }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    if (!user.business?.id) return NextResponse.json({ error: "Business not found" }, { status: 400 })

    const formData = await request.formData()
    const file = formData.get("file") as File | null
    if (!file) return NextResponse.json({ error: "file is required" }, { status: 400 })

    const buffer = await file.arrayBuffer()
    const text = new TextDecoder().decode(buffer)
    const name = file.name.toLowerCase()
    let rows: any[] = []

    if (name.endsWith(".json") || file.type.includes("json")) {
      rows = flattenInput(JSON.parse(text))
    } else if (name.endsWith(".xlsx") || name.endsWith(".xls") || file.type.includes("spreadsheet")) {
      rows = parseXlsx(buffer)
    } else {
      rows = parseCsv(text)
    }

    const customers: ImportCustomer[] = []
    const emails: InboxEmailForAnalysis[] = []
    rows.forEach((row) => {
      if (rowKind(row) === "email") {
        const email = toEmail(row)
        if (email) emails.push(email)
      } else {
        const customer = toCustomer(row)
        if (customer) customers.push(customer)
      }
    })

    const customerResult = await upsertCustomers(user, customers)
    const emailResult = await saveEmailsForAnalysis(user, emails)

    return NextResponse.json({
      rows: rows.length,
      customers: customerResult,
      emails: emailResult,
    })
  } catch (error: any) {
    console.error("CRM import error:", error)
    return NextResponse.json({ error: error?.message || "Failed to import CRM data" }, { status: 500 })
  }
}
