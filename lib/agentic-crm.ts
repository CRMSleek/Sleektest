import nodemailer from "nodemailer"
import { supabaseAdmin as supabase } from "@/lib/supabase/server"
import { getEffectiveEmailCredentials } from "@/lib/email-settings"
import type { NextRequest } from "next/server"

type UserContext = {
  id: string
  name?: string | null
  email?: string | null
  business?: {
    id?: string | null
    name?: string | null
  } | null
}

export type ActionKind = "email" | "survey" | "customer_update"

export type WorkspaceCitation = {
  label: string
  detail: string
}

export type WorkspaceAction = {
  kind: ActionKind
  title: string
  summary: string
  confidence: number
  citations: WorkspaceCitation[]
  payload: Record<string, any>
}

export type WorkspaceBrief = {
  headline: string
  whyNow: string
  nextSteps: string[]
  actionLabel: string
}

export type AnalyticsWorkspace = {
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
  brief: WorkspaceBrief
  action: WorkspaceAction
}

const DEFAULT_SURVEY_QUESTIONS = [
  {
    id: "q1",
    type: "radio",
    question: "How satisfied are you with your experience?",
    required: true,
    options: ["Very satisfied", "Satisfied", "Neutral", "Dissatisfied", "Very dissatisfied"],
  },
  {
    id: "q2",
    type: "textarea",
    question: "What is the one thing we should improve first?",
    required: true,
  },
  {
    id: "q3",
    type: "text",
    question: "What would make you recommend us to a friend?",
    required: false,
  },
]

function clampConfidence(value: number) {
  return Math.max(0.45, Math.min(0.98, Math.round(value * 100) / 100))
}

function safeText(value: unknown) {
  if (typeof value !== "string") return ""
  return value.replace(/\s+/g, " ").trim()
}

function getSmtpConfigFromDomain(email: string, password: string) {
  const emailDomain = email.split("@")[1]?.toLowerCase() || ""
  const base = { auth: { user: email, pass: password } }
  if (emailDomain === "gmail.com") {
    return { host: "smtp.gmail.com", port: 587, secure: false, ...base }
  }
  if (["outlook.com", "hotmail.com", "live.com"].includes(emailDomain) || emailDomain.endsWith("office365.com")) {
    return { host: "smtp-mail.outlook.com", port: 587, secure: false, ...base }
  }
  if (["yahoo.com", "ymail.com"].includes(emailDomain)) {
    return { host: "smtp.mail.yahoo.com", port: 587, secure: false, ...base }
  }
  return { host: "smtp.gmail.com", port: 587, secure: false, ...base }
}

async function loadWorkspaceSnapshot(user: UserContext) {
  const businessId = user.business?.id
  if (!businessId) {
    return null
  }

  const [customersResult, surveysResult, responsesResult, emailsResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, location, relationship_type, notes, created_at")
      .eq("business_id", businessId)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("surveys")
      .select("id, title, is_active, created_at")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false })
      .limit(25),
    supabase
      .from("survey_responses")
      .select("id, survey_id, customer_name, customer_email, submitted_at")
      .eq("business_id", businessId)
      .order("submitted_at", { ascending: false })
      .limit(40),
    supabase
      .from("emails")
      .select("id, sender_email, sender_name, subject, date")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(25),
  ])

  const customers = customersResult.data || []
  const surveys = surveysResult.data || []
  const responses = responsesResult.data || []
  const emails = emailsResult.data || []

  const responseCountBySurvey = responses.reduce<Record<string, number>>((acc, response) => {
    acc[response.survey_id] = (acc[response.survey_id] || 0) + 1
    return acc
  }, {})

  return {
    snapshot: {
      customerCount: customers.length,
      surveyCount: surveys.length,
      activeSurveyCount: surveys.filter((survey: any) => Boolean(survey.is_active)).length,
      responseCount: responses.length,
      emailCount: emails.length,
      recentCustomers: customers.slice(0, 8).map((customer: any) => ({
        id: customer.id,
        name: safeText(customer.name) || "Unnamed customer",
        email: safeText(customer.email) || "No email",
        location: safeText(customer.location) || "No location",
        relationshipType: safeText(customer.relationship_type) || "customer",
        notes: safeText(customer.notes) || "",
      })),
      recentSurveys: surveys.slice(0, 6).map((survey: any) => ({
        id: survey.id,
        title: safeText(survey.title) || "Untitled survey",
        isActive: Boolean(survey.is_active),
        responseCount: responseCountBySurvey[survey.id] || 0,
      })),
      recentEmails: emails.slice(0, 6).map((email: any) => ({
        id: email.id,
        senderEmail: safeText(email.sender_email) || "unknown",
        senderName: safeText(email.sender_name) || "",
        subject: safeText(email.subject) || "(no subject)",
        date: safeText(email.date) || "",
      })),
      recentResponses: responses.slice(0, 8).map((response: any) => ({
        id: response.id,
        surveyId: response.survey_id,
        customerName: safeText(response.customer_name) || "Anonymous",
        customerEmail: safeText(response.customer_email) || "No email",
        submittedAt: safeText(response.submitted_at) || "",
      })),
    },
  }
}

function buildSurveyAction(workspace: Awaited<ReturnType<typeof loadWorkspaceSnapshot>>): WorkspaceAction {
  const snapshot = workspace?.snapshot
  const customerCount = snapshot?.customerCount || 0
  const activeSurveyCount = snapshot?.activeSurveyCount || 0
  const responseCount = snapshot?.responseCount || 0
  const confidence = clampConfidence(0.86 + Math.min(customerCount / 100, 0.08) - Math.min(responseCount / 100, 0.06))

  return {
    kind: "survey",
    title: "Launch a 3-question customer feedback survey",
    summary:
      activeSurveyCount === 0
        ? `You have ${customerCount} customers and no active survey to collect fresh feedback. A short survey will surface the fastest next actions.`
        : `You have ${activeSurveyCount} active survey(s), but the recent response stream is still thin. A short survey can confirm where customers are getting stuck.`,
    confidence,
    citations: [
      { label: "customers", detail: `${customerCount} total customers` },
      { label: "surveys", detail: `${activeSurveyCount} active survey(s)` },
      { label: "responses", detail: `${responseCount} recent response(s)` },
    ],
    payload: {
      title: "Customer feedback pulse",
      description: "A short survey to capture satisfaction, friction, and one improvement idea.",
      questions: DEFAULT_SURVEY_QUESTIONS,
    },
  }
}

function buildEmailAction(workspace: Awaited<ReturnType<typeof loadWorkspaceSnapshot>>, businessName?: string | null): WorkspaceAction {
  const snapshot = workspace?.snapshot
  const customers = snapshot?.recentCustomers || []
  const recipients = customers
    .filter((customer) => customer.email && customer.email !== "No email")
    .slice(0, 8)
    .map((customer) => ({
      name: customer.name,
      email: customer.email,
    }))

  const subject = businessName
    ? `Quick check-in from ${businessName}`
    : "Quick check-in from your team"
  const html = `
    <div style="font-family: Inter, Arial, sans-serif; line-height: 1.6">
      <p>Hi there,</p>
      <p>We are checking in with a small group of customers to make sure the experience is working well.</p>
      <p>If you have 30 seconds, reply with one thing we should improve. Your feedback helps us focus on the right next step.</p>
      <p>Thank you,<br/>${safeText(businessName) || "Your team"}</p>
    </div>
  `.trim()

  return {
    kind: "email",
    title: recipients.length > 0 ? `Send a re-engagement email to ${recipients.length} customers` : "Draft a customer re-engagement email",
    summary:
      recipients.length > 0
        ? `There are ${recipients.length} reachable customers in the recent list, so a short email is the fastest way to drive another response.`
        : "There are not enough email addresses in the recent customer set, so start with a draft and route it to the right contact list.",
    confidence: clampConfidence(0.74 + Math.min(recipients.length / 20, 0.16)),
    citations: [
      { label: "customers", detail: `${snapshot?.customerCount || 0} total customers` },
      { label: "email list", detail: `${recipients.length} reachable addresses in the recent customer set` },
      { label: "emails", detail: `${snapshot?.emailCount || 0} saved email(s)` },
    ],
    payload: {
      to: recipients,
      subject,
      html,
      text:
        "Hi there, we are checking in with a small group of customers to make sure the experience is working well. Reply with one thing we should improve.",
    },
  }
}

function buildCustomerUpdateAction(workspace: Awaited<ReturnType<typeof loadWorkspaceSnapshot>>): WorkspaceAction {
  const snapshot = workspace?.snapshot
  const incomplete = (snapshot?.recentCustomers || []).filter((customer) => !customer.notes || !customer.location)
  const targetCustomers = (incomplete.length > 0 ? incomplete : snapshot?.recentCustomers || []).slice(0, 6)

  return {
    kind: "customer_update",
    title: "Tidy the customer records that need follow-up",
    summary:
      targetCustomers.length > 0
        ? `A few customer records are missing notes or location details. Updating them now will make the next outreach more precise.`
        : "There is not enough missing data to justify a bulk record cleanup, so keep the workflow focused on outreach.",
    confidence: clampConfidence(0.62 + Math.min(targetCustomers.length / 10, 0.18)),
    citations: [
      { label: "customers", detail: `${snapshot?.customerCount || 0} total customers` },
      { label: "records", detail: `${targetCustomers.length} recent customer records need cleanup` },
    ],
    payload: {
      customerIds: targetCustomers.map((customer) => customer.id),
      updates: {
        notes: "Reviewed by SleekCRM assistant: needs follow-up and a tighter outreach plan.",
      },
    },
  }
}

function chooseAction(workspace: Awaited<ReturnType<typeof loadWorkspaceSnapshot>>, businessName?: string | null): WorkspaceAction {
  const snapshot = workspace?.snapshot
  if (!snapshot) {
    return {
      kind: "customer_update",
      title: "Load your CRM data",
      summary: "There is no workspace data yet, so the first step is to sync customers, surveys, or email history.",
      confidence: 0.5,
      citations: [{ label: "data", detail: "No CRM data was returned from the database" }],
      payload: {},
    }
  }

  if (snapshot.customerCount === 0 && snapshot.surveyCount === 0 && snapshot.responseCount === 0 && snapshot.emailCount === 0) {
    return {
      kind: "customer_update",
      title: "Load your CRM data",
      summary: "There is no customer, survey, response, or email data yet. Import data or create the first record before the agent can recommend a live action.",
      confidence: 0.52,
      citations: [{ label: "data", detail: "No CRM objects were found in the current workspace" }],
      payload: {},
    }
  }

  if (snapshot.customerCount > 0 && (snapshot.activeSurveyCount === 0 || snapshot.responseCount === 0)) {
    return buildSurveyAction(workspace)
  }

  const customerEmails = snapshot.recentCustomers.filter((customer) => customer.email && customer.email !== "No email").length
  if (customerEmails >= 3) {
    return buildEmailAction(workspace, businessName)
  }

  return buildCustomerUpdateAction(workspace)
}

function buildBrief(workspace: Awaited<ReturnType<typeof loadWorkspaceSnapshot>>, action: WorkspaceAction): WorkspaceBrief {
  const snapshot = workspace?.snapshot
  const customerCount = snapshot?.customerCount || 0
  const responseCount = snapshot?.responseCount || 0
  const surveyCount = snapshot?.surveyCount || 0

  return {
    headline:
      action.kind === "survey"
        ? "Use the center panel to launch a survey"
        : action.kind === "email"
          ? "Use the center panel to send a campaign email"
          : "Use the center panel to clean up customer records",
    whyNow:
      action.kind === "survey"
        ? `You have ${customerCount} customers but only ${responseCount} recent response(s), so feedback is the cleanest next step.`
        : action.kind === "email"
          ? `Your CRM already has customer email coverage, so a targeted message is the quickest path to an actionable response.`
          : `You have ${surveyCount} survey(s) and ${customerCount} customer record(s), so cleaning up the data layer will improve follow-up quality.`,
    nextSteps:
      action.kind === "survey"
        ? ["Approve the survey draft", "Publish it to your customer list", "Review incoming responses in the responses table"]
        : action.kind === "email"
          ? ["Approve the email draft", "Send it to the listed recipients", "Watch for replies or new responses"]
          : ["Approve the record update", "Use the cleaned fields for follow-up", "Return to outreach once the data is tidy"],
    actionLabel:
      action.kind === "survey" ? "Survey workflow" : action.kind === "email" ? "Email workflow" : "Customer update workflow",
  }
}

export async function buildAnalyticsWorkspace(user: UserContext): Promise<AnalyticsWorkspace | null> {
  const workspace = await loadWorkspaceSnapshot(user)
  if (!workspace) return null

  const action = chooseAction(workspace, user.business?.name)
  const brief = buildBrief(workspace, action)

  return {
    snapshot: workspace.snapshot,
    brief,
    action,
  }
}

export function formatWorkspaceContext(workspace: AnalyticsWorkspace | null) {
  if (!workspace) return "No CRM workspace data is available."

  const { snapshot, brief, action } = workspace
  return `
Workspace brief:
- Headline: ${brief.headline}
- Why now: ${brief.whyNow}
- Action type: ${action.kind}
- Action title: ${action.title}
- Confidence: ${(action.confidence * 100).toFixed(0)}%

Data snapshot:
- Customers: ${snapshot.customerCount}
- Surveys: ${snapshot.surveyCount} total, ${snapshot.activeSurveyCount} active
- Responses: ${snapshot.responseCount}
- Emails: ${snapshot.emailCount}

Sources:
${action.citations.map((citation) => `- ${citation.label}: ${citation.detail}`).join("\n")}
`.trim()
}

export async function executeWorkspaceAction(user: UserContext, action: WorkspaceAction, request: NextRequest) {
  if (!action) {
    return { ok: false, error: "No action available" }
  }

  if (action.kind === "survey") {
    const { error } = await supabase.from("surveys").insert({
      title: action.payload.title,
      description: action.payload.description,
      questions: action.payload.questions,
      user_id: user.id,
    })

    if (error) {
      return { ok: false, error: error.message || "Failed to create survey" }
    }

    return { ok: true, message: "Survey draft created successfully" }
  }

  if (action.kind === "email") {
    const recipients = Array.isArray(action.payload.to) ? action.payload.to : []
    if (recipients.length === 0) {
      return { ok: false, error: "No recipients available for this email" }
    }

    const credentials = await getEffectiveEmailCredentials(request)
    if (!credentials) {
      return {
        ok: false,
        error: "Email not configured. Set SMTP credentials in Settings before sending.",
        needsCredentials: true,
      }
    }

    const smtpConfig =
      credentials.smtp?.host && credentials.smtp?.port != null
        ? {
            host: credentials.smtp.host,
            port: credentials.smtp.port,
            secure: credentials.smtp.secure ?? false,
            auth: { user: credentials.email, pass: credentials.password },
          }
        : getSmtpConfigFromDomain(credentials.email, credentials.password)

    const transporter = nodemailer.createTransport(smtpConfig)
    await transporter.sendMail({
      from: credentials.email,
      to: recipients.map((recipient: { email: string }) => recipient.email),
      subject: action.payload.subject,
      html: action.payload.html,
      text: action.payload.text,
    })

    return { ok: true, message: `Email sent to ${recipients.length} recipient(s)` }
  }

  if (action.kind === "customer_update") {
    const customerIds = Array.isArray(action.payload.customerIds) ? action.payload.customerIds : []
    if (customerIds.length === 0) {
      return { ok: false, error: "No customer records need updating" }
    }

    const { error } = await supabase
      .from("customers")
      .update(action.payload.updates)
      .in("id", customerIds)

    if (error) {
      return { ok: false, error: error.message || "Failed to update customers" }
    }

    return { ok: true, message: `Updated ${customerIds.length} customer record(s)` }
  }

  return { ok: false, error: "Unsupported action type" }
}
