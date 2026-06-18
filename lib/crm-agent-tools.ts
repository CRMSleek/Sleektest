import { createHash } from "crypto"
import nodemailer from "nodemailer"
import { supabase } from "@/lib/supabase/client"
import { getEffectiveEmailCredentials } from "@/lib/email-settings"
import { fetchRelevantInboxEmailsForAnalysis, saveEmailsForAnalysis } from "@/lib/email-analysis-selection"
import type { NextRequest } from "next/server"

export type UserContext = {
  id: string
  name?: string | null
  email?: string | null
  business?: {
    id?: string | null
    name?: string | null
  } | null
}

export type ToolStatus = {
  id: string
  label: string
  status: "running" | "complete" | "cached" | "error"
  detail: string
}

export type EvidenceItem = {
  label: string
  detail: string
  recordType?: "customer" | "survey" | "survey_response" | "email" | "analysis"
  recordId?: string
}

export type AnalysisType =
  | "sentiment"
  | "themes"
  | "pain_points"
  | "trends"
  | "churn_risk"
  | "health_scores"
  | "feature_requests"
  | "opportunities"

export type CRMActionKind = "send_email" | "create_task" | "update_customer" | "create_report" | "create_survey"

export type CRMActionProposal = {
  id: string
  kind: CRMActionKind
  title: string
  status: "proposed" | "approved" | "rejected" | "completed"
  reasoning: string
  evidence: EvidenceItem[]
  payload: Record<string, any>
  draft?: string
  createdAt: string
}

export type CRMAnalysisResult = {
  id?: string
  type: AnalysisType
  description: string
  cached: boolean
  createdAt: string
  expiresAt: string
  result: Record<string, any>
  evidence: EvidenceItem[]
}

export type CRMAgentContext = {
  snapshot: {
    customerCount: number
    surveyCount: number
    activeSurveyCount: number
    responseCount: number
    emailCount: number
    latestActivityAt: string | null
  }
  customers: Array<Record<string, any>>
  surveys: Array<Record<string, any>>
  responses: Array<Record<string, any>>
  emails: Array<Record<string, any>>
  analyses: CRMAnalysisResult[]
  proposals: CRMActionProposal[]
  statuses: ToolStatus[]
}

function shouldAutoSelectRelevantEmails(prompt: string) {
  return /\b(all|every|entire|inbox)\b.*\bemails?\b|\bemails?\b.*\b(all|every|entire|inbox)\b|auto-?select.*emails?|select.*relevant.*emails?|analy[sz]e.*emails?|emails?.*analy[sz]e|customer inquiries|customer inquiry|relevant.*topics.*emails?/i.test(prompt)
}

export const DEFAULT_AGENT_SKILLS = [
  {
    id: "sales-follow-up",
    name: "Sales Follow-Up Expert",
    description: "Prioritizes high-intent accounts, next steps, and concise outreach.",
    instructions:
      "When sales follow-up is relevant, identify high-intent customers, recommend a small next step, and draft direct outreach with a concrete ask.",
  },
  {
    id: "customer-success",
    name: "Customer Success Analyst",
    description: "Focuses on health, churn risk, account coverage, and retention work.",
    instructions:
      "When customer health is relevant, score risk from real signals, separate urgent retention work from routine follow-up, and explain evidence.",
  },
  {
    id: "survey-insight",
    name: "Survey Insight Analyst",
    description: "Finds themes, pain points, and trends in custom survey answers.",
    instructions:
      "When survey responses are relevant, ground claims in named responses, quote short snippets, and cluster repeated feedback into themes.",
  },
  {
    id: "email-drafting",
    name: "Email Drafting Assistant",
    description: "Drafts plain, specific emails based on CRM evidence.",
    instructions:
      "When drafting emails, write short professional messages, include why the recipient is being contacted, and avoid unsupported claims.",
  },
]

const STOPWORDS = new Set([
  "about",
  "after",
  "again",
  "also",
  "because",
  "been",
  "being",
  "could",
  "from",
  "have",
  "into",
  "just",
  "like",
  "more",
  "much",
  "need",
  "only",
  "other",
  "over",
  "really",
  "should",
  "some",
  "than",
  "that",
  "their",
  "them",
  "then",
  "there",
  "these",
  "they",
  "this",
  "very",
  "want",
  "were",
  "what",
  "when",
  "where",
  "which",
  "with",
  "would",
  "your",
])

const POSITIVE_WORDS = new Set([
  "amazing",
  "best",
  "clear",
  "easy",
  "excellent",
  "fast",
  "good",
  "great",
  "happy",
  "helpful",
  "improved",
  "love",
  "reliable",
  "smooth",
  "useful",
])

const NEGATIVE_WORDS = new Set([
  "angry",
  "bad",
  "bug",
  "cancel",
  "confusing",
  "cost",
  "difficult",
  "expensive",
  "frustrated",
  "hard",
  "issue",
  "missing",
  "poor",
  "price",
  "pricing",
  "problem",
  "slow",
  "stuck",
  "unhappy",
])

const THEME_KEYWORDS: Record<string, string[]> = {
  pricing: ["price", "pricing", "cost", "expensive", "cheap", "plan", "billing", "invoice"],
  onboarding: ["onboard", "setup", "start", "training", "learn", "confusing", "documentation"],
  support: ["support", "help", "reply", "response", "ticket", "agent", "service"],
  performance: ["slow", "speed", "fast", "loading", "lag", "performance", "timeout"],
  usability: ["easy", "hard", "confusing", "workflow", "interface", "ui", "navigation"],
  integrations: ["integration", "api", "zapier", "slack", "hubspot", "salesforce", "sync"],
  reliability: ["bug", "broken", "error", "crash", "missing", "lost", "reliable"],
  features: ["feature", "request", "wish", "add", "need", "export", "report", "dashboard"],
}

function safeText(value: unknown) {
  if (typeof value !== "string") return ""
  return value.replace(/\s+/g, " ").trim()
}

function toDate(value: unknown) {
  const date = new Date(typeof value === "string" ? value : "")
  return Number.isNaN(date.getTime()) ? null : date
}

function hashObject(value: unknown) {
  return createHash("sha256").update(JSON.stringify(value)).digest("hex")
}

function daysAgo(days: number) {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return date
}

function addHours(date: Date, hours: number) {
  const next = new Date(date)
  next.setHours(next.getHours() + hours)
  return next
}

function answerText(answers: any): string {
  if (!answers) return ""
  if (typeof answers === "string") return answers
  if (Array.isArray(answers)) return answers.map(answerText).filter(Boolean).join(" ")
  if (typeof answers === "object") {
    return Object.values(answers)
      .map((value: any): string => {
        if (typeof value === "string") return value
        if (value?.value != null) return String(value.value)
        if (value?.answer != null) return String(value.answer)
        return answerText(value)
      })
      .filter(Boolean)
      .join(" ")
  }
  return String(answers)
}

function tokenize(text: string) {
  return text
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, " ")
    .split(/\s+/)
    .map((word) => word.trim())
    .filter((word) => word.length > 2 && !STOPWORDS.has(word))
}

function scoreSentiment(text: string) {
  const words = tokenize(text)
  let positive = 0
  let negative = 0
  for (const word of words) {
    if (POSITIVE_WORDS.has(word)) positive += 1
    if (NEGATIVE_WORDS.has(word)) negative += 1
  }
  const score = positive - negative
  const label = score > 0 ? "positive" : score < 0 ? "negative" : "neutral"
  return { score, label, positive, negative }
}

function findThemes(text: string) {
  const lower = text.toLowerCase()
  return Object.entries(THEME_KEYWORDS)
    .map(([theme, words]) => ({
      theme,
      count: words.reduce((count, word) => count + (lower.includes(word) ? 1 : 0), 0),
    }))
    .filter((item) => item.count > 0)
    .sort((a, b) => b.count - a.count)
}

function makeEvidence(label: string, detail: string, recordType?: EvidenceItem["recordType"], recordId?: string): EvidenceItem {
  return { label, detail: detail.slice(0, 260), recordType, recordId }
}

async function loadCRMData(user: UserContext) {
  const businessId = user.business?.id
  if (!businessId) {
    return { customers: [], surveys: [], responses: [], emails: [] }
  }

  const [customersResult, surveysResult, responsesResult, emailsResult] = await Promise.all([
    supabase
      .from("customers")
      .select("id, name, email, phone, location, age, notes, relationship_type, data, created_at, updated_at")
      .eq("business_id", businessId)
      .order("updated_at", { ascending: false })
      .limit(250),
    supabase
      .from("surveys")
      .select("id, title, description, questions, is_active, times_opened, created_at, updated_at")
      .eq("user_id", user.id)
      .order("updated_at", { ascending: false })
      .limit(100),
    supabase
      .from("survey_responses")
      .select("id, survey_id, customer_id, customer_email, customer_name, answers, submitted_at")
      .eq("business_id", businessId)
      .order("submitted_at", { ascending: false })
      .limit(500),
    supabase
      .from("emails")
      .select("id, gmail_message_id, thread_id, sender_name, sender_email, recipient_to, subject, date, content_text, created_at")
      .eq("user_id", user.id)
      .order("date", { ascending: false })
      .limit(250),
  ])

  return {
    customers: customersResult.data || [],
    surveys: surveysResult.data || [],
    responses: responsesResult.data || [],
    emails: emailsResult.data || [],
  }
}

function buildSourceHash(data: Awaited<ReturnType<typeof loadCRMData>>, type: AnalysisType) {
  const source = {
    type,
    customers: data.customers.map((row: any) => [row.id, row.updated_at, row.notes, row.relationship_type]),
    surveys: data.surveys.map((row: any) => [row.id, row.updated_at, row.title, row.questions]),
    responses: data.responses.map((row: any) => [row.id, row.submitted_at, row.answers]),
    emails: data.emails.map((row: any) => [row.id, row.date, row.subject, row.content_text]),
  }
  return hashObject(source)
}

async function purgeExpiredAnalyses(user: UserContext) {
  await supabase
    .from("crm_data_analyses")
    .delete()
    .eq("user_id", user.id)
    .lt("expires_at", new Date().toISOString())
}

async function getCachedAnalysis(user: UserContext, type: AnalysisType, sourceHash: string): Promise<CRMAnalysisResult | null> {
  const { data, error } = await supabase
    .from("crm_data_analyses")
    .select("id, analysis_type, description, result, evidence, created_at, expires_at")
    .eq("user_id", user.id)
    .eq("business_id", user.business?.id || null)
    .eq("analysis_type", type)
    .eq("source_hash", sourceHash)
    .gt("expires_at", new Date().toISOString())
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle()

  if (error || !data) return null
  return {
    id: data.id,
    type,
    description: data.description,
    cached: true,
    createdAt: data.created_at,
    expiresAt: data.expires_at,
    result: (data.result as Record<string, any>) || {},
    evidence: (data.evidence as EvidenceItem[]) || [],
  }
}

async function storeAnalysis(
  user: UserContext,
  type: AnalysisType,
  description: string,
  sourceHash: string,
  result: Record<string, any>,
  evidence: EvidenceItem[],
) {
  const now = new Date()
  const expiresAt = addHours(now, type === "trends" || type === "churn_risk" ? 12 : 24).toISOString()
  const { data } = await supabase
    .from("crm_data_analyses")
    .insert({
      user_id: user.id,
      business_id: user.business?.id || null,
      analysis_type: type,
      description,
      source_hash: sourceHash,
      result,
      evidence,
      created_at: now.toISOString(),
      expires_at: expiresAt,
    })
    .select("id")
    .single()

  return {
    id: data?.id,
    type,
    description,
    cached: false,
    createdAt: now.toISOString(),
    expiresAt,
    result,
    evidence,
  }
}

function responseDocs(data: Awaited<ReturnType<typeof loadCRMData>>) {
  return data.responses.map((response: any) => ({
    id: response.id,
    type: "survey_response" as const,
    customerId: response.customer_id,
    customerName: safeText(response.customer_name) || "Anonymous",
    customerEmail: safeText(response.customer_email),
    date: response.submitted_at,
    text: answerText(response.answers),
  }))
}

function emailDocs(data: Awaited<ReturnType<typeof loadCRMData>>) {
  return data.emails.map((email: any) => ({
    id: email.id,
    type: "email" as const,
    customerName: safeText(email.sender_name) || safeText(email.sender_email) || "Unknown sender",
    customerEmail: safeText(email.sender_email),
    date: email.date,
    subject: safeText(email.subject) || "(no subject)",
    text: `${safeText(email.subject)} ${safeText(email.content_text)}`,
  }))
}

function analyzeSentiment(data: Awaited<ReturnType<typeof loadCRMData>>) {
  const docs = [...responseDocs(data), ...emailDocs(data)].filter((doc) => doc.text)
  const scored = docs.map((doc) => ({ ...doc, sentiment: scoreSentiment(doc.text) }))
  const negative = scored.filter((doc) => doc.sentiment.label === "negative")
  const positive = scored.filter((doc) => doc.sentiment.label === "positive")
  const average =
    scored.length > 0 ? Math.round((scored.reduce((sum, doc) => sum + doc.sentiment.score, 0) / scored.length) * 10) / 10 : 0
  const evidence = [...negative.slice(0, 5), ...positive.slice(0, 3)].map((doc) =>
    makeEvidence(`${doc.customerName} ${doc.type}`, doc.text, doc.type, doc.id),
  )
  return {
    description: "Sentiment analysis over saved email text and survey answers.",
    result: {
      averageScore: average,
      negativeCount: negative.length,
      positiveCount: positive.length,
      neutralCount: scored.length - negative.length - positive.length,
      mostNegative: negative.slice(0, 8).map((doc) => ({
        id: doc.id,
        type: doc.type,
        customerName: doc.customerName,
        customerEmail: doc.customerEmail,
        date: doc.date,
        score: doc.sentiment.score,
        excerpt: doc.text.slice(0, 220),
      })),
    },
    evidence,
  }
}

function analyzeThemes(data: Awaited<ReturnType<typeof loadCRMData>>) {
  const docs = [...responseDocs(data), ...emailDocs(data)].filter((doc) => doc.text)
  const keywordCounts = new Map<string, number>()
  const themeCounts = new Map<string, number>()
  for (const doc of docs) {
    for (const word of tokenize(doc.text)) keywordCounts.set(word, (keywordCounts.get(word) || 0) + 1)
    for (const item of findThemes(doc.text)) themeCounts.set(item.theme, (themeCounts.get(item.theme) || 0) + item.count)
  }
  const topKeywords = [...keywordCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 18)
    .map(([keyword, count]) => ({ keyword, count }))
  const topThemes = [...themeCounts.entries()]
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([theme, count]) => ({ theme, count }))
  return {
    description: "Keyword and theme extraction over CRM text.",
    result: { topThemes, topKeywords, documentCount: docs.length },
    evidence: topThemes.slice(0, 6).map((theme) => makeEvidence("theme", `${theme.theme}: ${theme.count} mention(s)`, "analysis")),
  }
}

function analyzePainPoints(data: Awaited<ReturnType<typeof loadCRMData>>) {
  const docs = [...responseDocs(data), ...emailDocs(data)].filter((doc) => doc.text)
  const pain: Record<string, any[]> = {}
  for (const doc of docs) {
    const sentiment = scoreSentiment(doc.text)
    if (sentiment.label !== "negative" && !findThemes(doc.text).some((item) => ["pricing", "support", "performance", "reliability", "usability"].includes(item.theme))) {
      continue
    }
    for (const theme of findThemes(doc.text)) {
      if (!pain[theme.theme]) pain[theme.theme] = []
      pain[theme.theme].push({
        id: doc.id,
        type: doc.type,
        customerName: doc.customerName,
        customerEmail: doc.customerEmail,
        date: doc.date,
        excerpt: doc.text.slice(0, 220),
        sentimentScore: sentiment.score,
      })
    }
  }
  const painPoints = Object.entries(pain)
    .map(([theme, items]) => ({ theme, count: items.length, customers: items.slice(0, 8) }))
    .sort((a, b) => b.count - a.count)
  const evidence = painPoints.flatMap((point) =>
    point.customers.slice(0, 2).map((item: any) => makeEvidence(`${point.theme}: ${item.customerName}`, item.excerpt, item.type, item.id)),
  )
  return {
    description: "Customer pain-point detection from negative or friction-heavy CRM text.",
    result: { painPoints, totalPainMentions: painPoints.reduce((sum, point) => sum + point.count, 0) },
    evidence: evidence.slice(0, 10),
  }
}

function analyzeTrends(data: Awaited<ReturnType<typeof loadCRMData>>) {
  const docs = [...responseDocs(data), ...emailDocs(data)].filter((doc) => doc.text)
  const recentCutoff = daysAgo(30)
  const previousCutoff = daysAgo(60)
  const bucket = (from: Date, to: Date) =>
    docs.filter((doc) => {
      const date = toDate(doc.date)
      return date && date >= from && date < to
    })
  const current = bucket(recentCutoff, new Date())
  const previous = bucket(previousCutoff, recentCutoff)
  const countTheme = (items: typeof docs) => {
    const counts: Record<string, number> = {}
    for (const doc of items) {
      for (const theme of findThemes(doc.text)) counts[theme.theme] = (counts[theme.theme] || 0) + 1
    }
    return counts
  }
  const currentThemes = countTheme(current)
  const previousThemes = countTheme(previous)
  const deltas = Object.keys({ ...currentThemes, ...previousThemes })
    .map((theme) => ({
      theme,
      current: currentThemes[theme] || 0,
      previous: previousThemes[theme] || 0,
      delta: (currentThemes[theme] || 0) - (previousThemes[theme] || 0),
    }))
    .sort((a, b) => b.delta - a.delta)
  const currentNegative = current.filter((doc) => scoreSentiment(doc.text).label === "negative").length
  const previousNegative = previous.filter((doc) => scoreSentiment(doc.text).label === "negative").length
  return {
    description: "Trend detection comparing last 30 days with prior 30 days.",
    result: {
      currentDocumentCount: current.length,
      previousDocumentCount: previous.length,
      negativeMentionsCurrent: currentNegative,
      negativeMentionsPrevious: previousNegative,
      risingThemes: deltas.filter((item) => item.delta > 0).slice(0, 8),
      fallingThemes: deltas.filter((item) => item.delta < 0).slice(-8).reverse(),
    },
    evidence: deltas
      .filter((item) => item.delta !== 0)
      .slice(0, 8)
      .map((item) => makeEvidence("theme trend", `${item.theme}: ${item.previous} -> ${item.current}`, "analysis")),
  }
}

function analyzeChurnRisk(data: Awaited<ReturnType<typeof loadCRMData>>) {
  const docs = [...responseDocs(data), ...emailDocs(data)].filter((doc) => doc.text)
  const byEmail = new Map<string, any[]>()
  for (const doc of docs) {
    const email = doc.customerEmail?.toLowerCase()
    if (!email) continue
    if (!byEmail.has(email)) byEmail.set(email, [])
    byEmail.get(email)?.push(doc)
  }
  const risks = data.customers
    .map((customer: any) => {
      const email = safeText(customer.email).toLowerCase()
      const docsForCustomer = byEmail.get(email) || []
      const negative = docsForCustomer.filter((doc) => scoreSentiment(doc.text).label === "negative")
      const themes = docsForCustomer.flatMap((doc) => findThemes(doc.text).map((item) => item.theme))
      const staleDays = customer.updated_at ? Math.floor((Date.now() - new Date(customer.updated_at).getTime()) / 86400000) : 0
      const riskScore = Math.min(100, negative.length * 25 + (themes.includes("pricing") ? 20 : 0) + (staleDays > 60 ? 15 : 0))
      return {
        customerId: customer.id,
        name: safeText(customer.name) || "Unnamed customer",
        email,
        riskScore,
        reasons: [
          negative.length ? `${negative.length} negative signal(s)` : "",
          themes.includes("pricing") ? "pricing mentioned" : "",
          staleDays > 60 ? `record stale for ${staleDays} days` : "",
        ].filter(Boolean),
        evidence: negative.slice(0, 3).map((doc) => ({ id: doc.id, type: doc.type, excerpt: doc.text.slice(0, 180) })),
      }
    })
    .filter((item) => item.riskScore > 0)
    .sort((a, b) => b.riskScore - a.riskScore)
  return {
    description: "Churn-risk indicators from negative signals, pricing friction, and stale CRM records.",
    result: { atRiskCustomers: risks.slice(0, 15), atRiskCount: risks.length },
    evidence: risks.slice(0, 8).map((risk) => makeEvidence(risk.name, risk.reasons.join("; "), "customer", risk.customerId)),
  }
}

function analyzeHealthScores(data: Awaited<ReturnType<typeof loadCRMData>>) {
  const docs = [...responseDocs(data), ...emailDocs(data)].filter((doc) => doc.text)
  const byEmail = new Map<string, any[]>()
  for (const doc of docs) {
    const email = doc.customerEmail?.toLowerCase()
    if (!email) continue
    if (!byEmail.has(email)) byEmail.set(email, [])
    byEmail.get(email)?.push(doc)
  }
  const scores = data.customers
    .map((customer: any) => {
      const email = safeText(customer.email).toLowerCase()
      const docsForCustomer = byEmail.get(email) || []
      const sentimentSum = docsForCustomer.reduce((sum, doc) => sum + scoreSentiment(doc.text).score, 0)
      const score = Math.max(0, Math.min(100, 70 + sentimentSum * 8 + Math.min(docsForCustomer.length * 3, 12)))
      return {
        customerId: customer.id,
        name: safeText(customer.name) || "Unnamed customer",
        email,
        score,
        signalCount: docsForCustomer.length,
        status: score >= 75 ? "healthy" : score >= 50 ? "watch" : "at-risk",
      }
    })
    .sort((a, b) => a.score - b.score)
  return {
    description: "Customer health scoring from sentiment and CRM engagement signals.",
    result: {
      scores: scores.slice(0, 30),
      averageHealth: scores.length ? Math.round(scores.reduce((sum, row) => sum + row.score, 0) / scores.length) : 0,
    },
    evidence: scores.slice(0, 8).map((score) => makeEvidence(score.name, `${score.status}, score ${score.score}`, "customer", score.customerId)),
  }
}

function analyzeFeatureRequests(data: Awaited<ReturnType<typeof loadCRMData>>) {
  const docs = [...responseDocs(data), ...emailDocs(data)].filter((doc) => /feature|request|wish|add|need|integration|export|report|dashboard/i.test(doc.text))
  const clusters: Record<string, any[]> = {}
  for (const doc of docs) {
    const themes = findThemes(doc.text).filter((item) => ["features", "integrations", "usability"].includes(item.theme))
    for (const theme of themes.length ? themes : [{ theme: "features", count: 1 }]) {
      if (!clusters[theme.theme]) clusters[theme.theme] = []
      clusters[theme.theme].push({
        id: doc.id,
        type: doc.type,
        customerName: doc.customerName,
        customerEmail: doc.customerEmail,
        excerpt: doc.text.slice(0, 220),
      })
    }
  }
  const featureClusters = Object.entries(clusters)
    .map(([theme, items]) => ({ theme, count: items.length, examples: items.slice(0, 8) }))
    .sort((a, b) => b.count - a.count)
  return {
    description: "Feature request clustering from survey and email language.",
    result: { featureClusters, requestCount: docs.length },
    evidence: featureClusters.flatMap((cluster) =>
      cluster.examples.slice(0, 2).map((item: any) => makeEvidence(`${cluster.theme}: ${item.customerName}`, item.excerpt, item.type, item.id)),
    ),
  }
}

function analyzeOpportunities(data: Awaited<ReturnType<typeof loadCRMData>>) {
  const docs = [...responseDocs(data), ...emailDocs(data)].filter((doc) => /upgrade|expand|more seats|team|budget|renew|contract|recommend|love|great|useful/i.test(doc.text))
  const opportunities = docs
    .map((doc) => ({
      id: doc.id,
      type: doc.type,
      customerName: doc.customerName,
      customerEmail: doc.customerEmail,
      score: scoreSentiment(doc.text).score + (/(upgrade|expand|more seats|renew|contract)/i.test(doc.text) ? 3 : 0),
      excerpt: doc.text.slice(0, 220),
    }))
    .sort((a, b) => b.score - a.score)
  return {
    description: "Opportunity detection from positive intent and expansion language.",
    result: { opportunities: opportunities.slice(0, 15), opportunityCount: opportunities.length },
    evidence: opportunities.slice(0, 8).map((item) => makeEvidence(item.customerName, item.excerpt, item.type, item.id)),
  }
}

function runAnalysis(type: AnalysisType, data: Awaited<ReturnType<typeof loadCRMData>>) {
  switch (type) {
    case "sentiment":
      return analyzeSentiment(data)
    case "themes":
      return analyzeThemes(data)
    case "pain_points":
      return analyzePainPoints(data)
    case "trends":
      return analyzeTrends(data)
    case "churn_risk":
      return analyzeChurnRisk(data)
    case "health_scores":
      return analyzeHealthScores(data)
    case "feature_requests":
      return analyzeFeatureRequests(data)
    case "opportunities":
      return analyzeOpportunities(data)
  }
}

export function selectAnalysisTypes(prompt: string): AnalysisType[] {
  const text = prompt.toLowerCase()
  const selected = new Set<AnalysisType>()
  if (/sentiment|happy|unhappy|satisfaction|emotion|tone/.test(text)) selected.add("sentiment")
  if (/keyword|theme|topic|mention|cluster/.test(text)) selected.add("themes")
  if (/pain|problem|complaint|friction|issue|why.*unhappy|unhappy/.test(text)) selected.add("pain_points")
  if (/trend|increase|decrease|change|week|month|recent|outdated/.test(text)) selected.add("trends")
  if (/churn|risk|cancel|at-risk|at risk|retention/.test(text)) selected.add("churn_risk")
  if (/health|score|healthy|account/.test(text)) selected.add("health_scores")
  if (/feature|request|roadmap|product|build|integration/.test(text)) selected.add("feature_requests")
  if (/opportunity|upsell|sales|focus|pipeline|follow.?up|this week/.test(text)) selected.add("opportunities")

  if (/what should|focus|why|analy[sz]e|summary|overview|recommend/.test(text) || selected.size === 0) {
    selected.add("sentiment")
    selected.add("themes")
    selected.add("pain_points")
    selected.add("trends")
    selected.add("churn_risk")
    selected.add("health_scores")
    selected.add("feature_requests")
    selected.add("opportunities")
  }
  return [...selected]
}

export async function runCachedAnalyses(user: UserContext, types: AnalysisType[]) {
  const data = await loadCRMData(user)
  await purgeExpiredAnalyses(user)

  const statuses: ToolStatus[] = [
    {
      id: "crm.query",
      label: "CRM data query",
      status: "complete",
      detail: `${data.customers.length} customers, ${data.responses.length} survey responses, ${data.emails.length} saved emails`,
    },
  ]
  const analyses: CRMAnalysisResult[] = []

  for (const type of types) {
    const sourceHash = buildSourceHash(data, type)
    const cached = await getCachedAnalysis(user, type, sourceHash)
    if (cached) {
      statuses.push({ id: `analysis.${type}`, label: `${type} analysis`, status: "cached", detail: "Fresh cached result used" })
      analyses.push(cached)
      continue
    }

    const analysis = runAnalysis(type, data)
    const saved = await storeAnalysis(user, type, analysis.description, sourceHash, analysis.result, analysis.evidence)
    statuses.push({ id: `analysis.${type}`, label: `${type} analysis`, status: "complete", detail: "New analysis stored in Supabase cache" })
    analyses.push(saved)
  }

  return { data, analyses, statuses }
}

async function autoSelectEmailsForPrompt(user: UserContext, prompt: string, request?: NextRequest): Promise<ToolStatus[]> {
  if (!request || !shouldAutoSelectRelevantEmails(prompt)) return []

  const selected = await fetchRelevantInboxEmailsForAnalysis(request, 75)
  if (selected.error) {
    return [{
      id: "email.auto_select",
      label: "Relevant email selection",
      status: "error",
      detail: selected.error,
    }]
  }

  const saveResult = await saveEmailsForAnalysis(user, selected.emails)
  return [{
    id: "email.auto_select",
    label: "Relevant email selection",
    status: "complete",
    detail: `${selected.emails.length} relevant email(s) found, ${saveResult.saved.length} new saved for analysis, ${saveResult.skipped} already saved`,
  }]
}

export function buildSnapshot(data: Awaited<ReturnType<typeof loadCRMData>>) {
  const activityDates = [
    ...data.responses.map((row: any) => row.submitted_at),
    ...data.emails.map((row: any) => row.date),
    ...data.customers.map((row: any) => row.updated_at),
  ]
    .map(toDate)
    .filter((date): date is Date => Boolean(date))
    .sort((a, b) => b.getTime() - a.getTime())

  return {
    customerCount: data.customers.length,
    surveyCount: data.surveys.length,
    activeSurveyCount: data.surveys.filter((survey: any) => Boolean(survey.is_active)).length,
    responseCount: data.responses.length,
    emailCount: data.emails.length,
    latestActivityAt: activityDates[0]?.toISOString() || null,
  }
}

function promptIntent(prompt: string) {
  const text = prompt.toLowerCase()
  const smallTalkOnly = /^(hi|hello|hey|thanks|thank you|ok|okay)[\s!.?]*$/i.test(prompt.trim())
  const asksForAction = /what should|focus|priority|recommend|next step|todo|to do|action|follow.?up|this week|plan/i.test(text)
  const broadAnalysis = /overview|summary|analy[sz]e|all|everything|why|what should|focus|this week|recommend|priority/i.test(text)

  return {
    text,
    smallTalkOnly,
    broadAnalysis,
    asksForAction,
    wantsEmail: /\b(email|emails|draft|send|outreach|campaign|reply|follow.?up)\b/i.test(text),
    wantsPain: /\b(pain|problem|complaint|complaints|friction|issue|issues|unhappy|angry|upset|why)\b/i.test(text),
    wantsChurn: /\b(churn|risk|at-risk|at risk|cancel|retention|save|health)\b/i.test(text),
    wantsOpportunity: /\b(opportunity|opportunities|upsell|sales|pipeline|expand|upgrade|renew)\b/i.test(text),
    wantsFeature: /\b(feature|request|roadmap|product|integration|build)\b/i.test(text),
    wantsTrend: /\b(trend|increase|decrease|change|recent|week|month)\b/i.test(text),
    wantsSurvey: /\b(survey|feedback form|questionnaire|poll)\b/i.test(text),
  }
}

function analysisEvidence(analysis: CRMAnalysisResult | undefined, limit = 4) {
  return analysis?.evidence?.slice(0, limit) || []
}

function customerRecipientsFromEvidence(customers: any[], limit = 8) {
  const byEmail = new Map<string, { name: string; email: string }>()
  customers.forEach((customer: any) => {
    const email = safeText(customer.customerEmail).toLowerCase()
    if (!email || email === "no email") return
    byEmail.set(email, {
      name: safeText(customer.customerName) || email,
      email,
    })
  })
  return Array.from(byEmail.values()).slice(0, limit)
}

function addProposal(proposals: CRMActionProposal[], proposal: CRMActionProposal) {
  const signature = `${proposal.kind}:${proposal.title.toLowerCase()}`
  if (proposals.some((item) => `${item.kind}:${item.title.toLowerCase()}` === signature)) return
  proposals.push(proposal)
}

export function proposeActions(context: {
  user: UserContext
  prompt: string
  analyses: CRMAnalysisResult[]
  data: Awaited<ReturnType<typeof loadCRMData>>
}): CRMActionProposal[] {
  const now = new Date().toISOString()
  const intent = promptIntent(context.prompt)
  if (intent.smallTalkOnly) return []

  const proposals: CRMActionProposal[] = []
  const promptKey = hashObject([context.prompt, now]).slice(0, 8)
  const painAnalysis = context.analyses.find((analysis) => analysis.type === "pain_points")
  const churnAnalysis = context.analyses.find((analysis) => analysis.type === "churn_risk")
  const opportunityAnalysis = context.analyses.find((analysis) => analysis.type === "opportunities")
  const featureAnalysis = context.analyses.find((analysis) => analysis.type === "feature_requests")
  const trendAnalysis = context.analyses.find((analysis) => analysis.type === "trends")
  const healthAnalysis = context.analyses.find((analysis) => analysis.type === "health_scores")
  const pain = painAnalysis?.result.painPoints?.[0]
  const churn = churnAnalysis?.result.atRiskCustomers?.[0]
  const opportunity = opportunityAnalysis?.result.opportunities?.[0]
  const feature = featureAnalysis?.result.featureClusters?.[0]
  const risingTheme = trendAnalysis?.result.risingThemes?.[0]
  const weakHealth = healthAnalysis?.result.scores?.find((score: any) => score.status === "at-risk" || score.status === "watch")
  const broad = intent.broadAnalysis || intent.asksForAction

  if ((broad || intent.wantsChurn) && churn) {
    addProposal(proposals, {
      id: `proposal-${hashObject(["task", "churn", churn.customerId, promptKey]).slice(0, 10)}`,
      kind: "create_task",
      title: `Follow up with ${churn.name}`,
      status: "proposed",
      reasoning: `${churn.name} has churn-risk score ${churn.riskScore}. Reasons: ${churn.reasons.join(", ") || "negative CRM signals"}.`,
      evidence: churn.evidence?.map((item: any) => makeEvidence(churn.name, item.excerpt, item.type, item.id)) || [],
      payload: {
        title: `Follow up with ${churn.name}`,
        description: `Review churn-risk signals and contact ${churn.name}.`,
        priority: churn.riskScore >= 70 ? "high" : "medium",
        customerId: churn.customerId,
      },
      createdAt: now,
    })

    addProposal(proposals, {
      id: `proposal-${hashObject(["update", "at-risk", churn.customerId, promptKey]).slice(0, 10)}`,
      kind: "update_customer",
      title: `Mark ${churn.name} as at-risk`,
      status: "proposed",
      reasoning: `The CRM record should reflect current retention risk before follow-up work starts. This requires approval before updating the customer.`,
      evidence: churn.evidence?.map((item: any) => makeEvidence(churn.name, item.excerpt, item.type, item.id)) || analysisEvidence(churnAnalysis),
      payload: {
        customerId: churn.customerId,
        updates: {
          relationship_type: "at-risk",
          notes: `At-risk signal detected by SleekCRM agent on ${new Date(now).toLocaleDateString()}: ${churn.reasons.join(", ") || "negative CRM signals"}.`,
        },
      },
      createdAt: now,
    })
  }

  if ((broad || intent.wantsPain || intent.wantsEmail) && pain) {
    const evidenceCustomers = Array.isArray(pain.customers) ? pain.customers : []
    const recipients = customerRecipientsFromEvidence(evidenceCustomers)
    if (recipients.length === 0) {
      addProposal(proposals, {
        id: `proposal-${hashObject(["task", "pain", pain.theme, promptKey]).slice(0, 10)}`,
        kind: "create_task",
        title: `Identify customers affected by ${pain.theme}`,
        status: "proposed",
        reasoning: `${pain.theme} is top pain point with ${pain.count} mention(s), but no reachable affected recipients were found. Assign a task before sending email.`,
        evidence: pain.customers?.slice(0, 4).map((item: any) => makeEvidence(item.customerName, item.excerpt, item.type, item.id)) || [],
        payload: {
          title: `Identify customers affected by ${pain.theme}`,
          description: `Find affected contacts before sending follow-up about ${pain.theme}.`,
          priority: "medium",
        },
        createdAt: now,
      })
    } else {
      addProposal(proposals, {
        id: `proposal-${hashObject(["email", "pain", pain.theme, promptKey]).slice(0, 10)}`,
        kind: "send_email",
        title: `Draft follow-up about ${pain.theme}`,
        status: "proposed",
        reasoning: `${pain.theme} is a relevant pain point with ${pain.count} mention(s). This draft only targets affected customers found in evidence, not the full customer list.`,
        evidence: pain.customers?.slice(0, 4).map((item: any) => makeEvidence(item.customerName, item.excerpt, item.type, item.id)) || [],
        payload: {
          to: recipients,
          recipientScope: "affected_customers_only",
          subject: `Quick follow-up about ${pain.theme}`,
          text: `Hi there,\n\nWe noticed recent feedback about ${pain.theme}. Could you reply with the main thing that would make this better for you?\n\nThanks,\n${safeText(context.user.business?.name) || "Your team"}`,
        },
        draft: `Hi there,\n\nWe noticed recent feedback about ${pain.theme}. Could you reply with the main thing that would make this better for you?\n\nThanks,\n${safeText(context.user.business?.name) || "Your team"}`,
        createdAt: now,
      })
    }
  }

  if ((broad || intent.wantsOpportunity) && opportunity) {
    addProposal(proposals, {
      id: `proposal-${hashObject(["opportunity", opportunity.id, promptKey]).slice(0, 10)}`,
      kind: "create_task",
      title: `Qualify opportunity from ${opportunity.customerName}`,
      status: "proposed",
      reasoning: `${opportunity.customerName} showed positive or expansion intent in CRM text.`,
      evidence: [makeEvidence(opportunity.customerName, opportunity.excerpt, opportunity.type, opportunity.id)],
      payload: {
        title: `Qualify opportunity from ${opportunity.customerName}`,
        description: opportunity.excerpt,
        priority: "medium",
      },
      createdAt: now,
    })
  }

  if ((broad || intent.wantsFeature) && feature) {
    addProposal(proposals, {
      id: `proposal-${hashObject(["report", "feature", feature.theme, promptKey]).slice(0, 10)}`,
      kind: "create_report",
      title: `Generate ${feature.theme} request report`,
      status: "proposed",
      reasoning: `${feature.theme} has ${feature.count} request-like mention(s). A report can preserve examples for product review.`,
      evidence: feature.examples?.slice(0, 4).map((item: any) => makeEvidence(item.customerName, item.excerpt, item.type, item.id)) || [],
      payload: {
        title: `${feature.theme} feature request report`,
        body: JSON.stringify(feature, null, 2),
      },
      createdAt: now,
    })
  }

  if ((broad || intent.wantsTrend) && risingTheme) {
    addProposal(proposals, {
      id: `proposal-${hashObject(["task", "trend", risingTheme.theme, promptKey]).slice(0, 10)}`,
      kind: "create_task",
      title: `Review rising ${risingTheme.theme} trend`,
      status: "proposed",
      reasoning: `${risingTheme.theme} increased from ${risingTheme.previous} to ${risingTheme.current} mention(s) in the recent trend window.`,
      evidence: analysisEvidence(trendAnalysis),
      payload: {
        title: `Review rising ${risingTheme.theme} trend`,
        description: `Investigate why ${risingTheme.theme} mentions changed from ${risingTheme.previous} to ${risingTheme.current}.`,
        priority: risingTheme.delta >= 3 ? "high" : "medium",
      },
      createdAt: now,
    })
  }

  if ((broad || intent.wantsChurn) && weakHealth && !churn) {
    addProposal(proposals, {
      id: `proposal-${hashObject(["task", "health", weakHealth.customerId, promptKey]).slice(0, 10)}`,
      kind: "create_task",
      title: `Review ${weakHealth.name} health score`,
      status: "proposed",
      reasoning: `${weakHealth.name} is marked ${weakHealth.status} with health score ${weakHealth.score} from ${weakHealth.signalCount} CRM signal(s).`,
      evidence: analysisEvidence(healthAnalysis),
      payload: {
        title: `Review ${weakHealth.name} health score`,
        description: `Check recent activity and decide whether this account needs retention outreach.`,
        priority: weakHealth.status === "at-risk" ? "high" : "medium",
        customerId: weakHealth.customerId,
      },
      createdAt: now,
    })
  }

  if (intent.wantsSurvey && !proposals.some((proposal) => proposal.kind === "create_survey")) {
    addProposal(proposals, {
      id: `proposal-${hashObject(["survey", context.prompt, promptKey]).slice(0, 10)}`,
      kind: "create_survey",
      title: "Draft targeted customer feedback survey",
      status: "proposed",
      reasoning: "The prompt asks for survey/feedback work. A draft survey lets you collect fresh CRM evidence before taking broader action.",
      evidence: analysisEvidence(painAnalysis).length ? analysisEvidence(painAnalysis) : analysisEvidence(trendAnalysis),
      payload: {
        title: "Customer feedback pulse",
        description: "Short pulse survey generated from the current CRM agent request.",
        questions: [
          { id: "q1", type: "text", label: "What is the main thing we should improve right now?", required: true },
          { id: "q2", type: "rating", label: "How satisfied are you with your current experience?", required: true },
          { id: "q3", type: "text", label: "What would make you more likely to keep using us?", required: false },
        ],
      },
      createdAt: now,
    })
  }

  if (proposals.length === 0 && intent.asksForAction) {
    addProposal(proposals, {
      id: `proposal-${hashObject(["task", "question", context.prompt, promptKey]).slice(0, 10)}`,
      kind: "create_task",
      title: `Review CRM question: ${safeText(context.prompt).slice(0, 56)}`,
      status: "proposed",
      reasoning: `No narrow recipient or record was safe to update automatically. Create an internal review task tied to this CRM question instead.`,
      evidence: context.analyses.flatMap((analysis) => analysisEvidence(analysis, 1)).slice(0, 4),
      payload: {
        title: `Review CRM question: ${safeText(context.prompt).slice(0, 80)}`,
        description: `Investigate CRM data and decide next step for: ${safeText(context.prompt)}`,
        priority: "medium",
      },
      createdAt: now,
    })
  }

  return proposals.slice(0, 4)
}

function getSmtpConfigFromDomain(email: string, password: string) {
  const emailDomain = email.split("@")[1]?.toLowerCase() || ""
  const base = { auth: { user: email, pass: password } }
  if (emailDomain === "gmail.com") return { host: "smtp.gmail.com", port: 587, secure: false, ...base }
  if (["outlook.com", "hotmail.com", "live.com"].includes(emailDomain) || emailDomain.endsWith("office365.com")) {
    return { host: "smtp-mail.outlook.com", port: 587, secure: false, ...base }
  }
  if (["yahoo.com", "ymail.com"].includes(emailDomain)) return { host: "smtp.mail.yahoo.com", port: 587, secure: false, ...base }
  return { host: "smtp.gmail.com", port: 587, secure: false, ...base }
}

export async function executeCRMAction(user: UserContext, action: CRMActionProposal, request: NextRequest) {
  if (action.kind === "send_email") {
    const recipients = Array.isArray(action.payload.to) ? action.payload.to : []
    const uniqueRecipients = Array.from(
      new Map(
        recipients
          .map((recipient: { email?: string; name?: string }) => ({
            ...recipient,
            email: safeText(recipient.email).toLowerCase(),
          }))
          .filter((recipient: { email: string }) => recipient.email)
          .map((recipient: { email: string; name?: string }) => [recipient.email, recipient]),
      ).values(),
    )
    if (recipients.length === 0) return { ok: false, error: "No recipients available for email" }
    if (uniqueRecipients.length > 25 && action.payload.allowBulk !== true) {
      return { ok: false, error: "Bulk email blocked. Set allowBulk only after explicit user request for a broad campaign." }
    }
    const credentials = await getEffectiveEmailCredentials(request)
    if (!credentials) {
      return { ok: false, error: "Email not configured. Set SMTP credentials in Settings before sending.", needsCredentials: true }
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
      to: uniqueRecipients.map((recipient: { email: string }) => recipient.email),
      subject: safeText(action.payload.subject),
      text: safeText(action.payload.text || action.draft),
      html: safeText(action.payload.html) || safeText(action.payload.text || action.draft).replace(/\n/g, "<br />"),
    })
    return { ok: true, message: `Email sent to ${uniqueRecipients.length} recipient(s)` }
  }

  if (action.kind === "create_task") {
    const { error } = await supabase.from("crm_agent_tasks").insert({
      user_id: user.id,
      business_id: user.business?.id || null,
      title: safeText(action.payload.title || action.title),
      description: safeText(action.payload.description || action.reasoning),
      priority: safeText(action.payload.priority) || "medium",
      reasoning: action.reasoning,
      evidence: action.evidence,
      metadata: action.payload,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, message: "CRM task created" }
  }

  if (action.kind === "update_customer") {
    const customerId = safeText(action.payload.customerId)
    if (!customerId) return { ok: false, error: "No customerId supplied" }
    const updates = action.payload.updates || {}
    const { error } = await supabase
      .from("customers")
      .update(updates)
      .eq("id", customerId)
      .eq("business_id", user.business?.id || "")
    if (error) return { ok: false, error: error.message }
    return { ok: true, message: "Customer record updated" }
  }

  if (action.kind === "create_report") {
    const { error } = await supabase.from("crm_agent_tasks").insert({
      user_id: user.id,
      business_id: user.business?.id || null,
      title: safeText(action.payload.title || action.title),
      description: safeText(action.payload.body || action.reasoning),
      priority: "low",
      reasoning: action.reasoning,
      evidence: action.evidence,
      metadata: { ...action.payload, report: true },
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, message: "Report task created" }
  }

  if (action.kind === "create_survey") {
    const { error } = await supabase.from("surveys").insert({
      user_id: user.id,
      title: safeText(action.payload.title || "Customer feedback pulse"),
      description: safeText(action.payload.description || ""),
      questions: action.payload.questions || [],
      is_active: false,
    })
    if (error) return { ok: false, error: error.message }
    return { ok: true, message: "Survey draft created" }
  }

  return { ok: false, error: "Unsupported action kind" }
}

export async function buildCRMAgentContext(user: UserContext, prompt: string, request?: NextRequest): Promise<CRMAgentContext> {
  const analysisTypes = selectAnalysisTypes(prompt)
  const emailSelectionStatuses = await autoSelectEmailsForPrompt(user, prompt, request)
  const { data, analyses, statuses } = await runCachedAnalyses(user, analysisTypes)
  const proposals = proposeActions({ user, prompt, analyses, data })
  return {
    snapshot: buildSnapshot(data),
    customers: data.customers.slice(0, 25),
    surveys: data.surveys.slice(0, 20),
    responses: data.responses.slice(0, 30),
    emails: data.emails.slice(0, 25),
    analyses,
    proposals,
    statuses: [...emailSelectionStatuses, ...statuses],
  }
}

export function formatAgentContext(context: CRMAgentContext | null) {
  if (!context) return "No CRM context available."
  return JSON.stringify(
    {
      snapshot: context.snapshot,
      analyses: context.analyses.map((analysis) => ({
        type: analysis.type,
        cached: analysis.cached,
        description: analysis.description,
        createdAt: analysis.createdAt,
        result: analysis.result,
        evidence: analysis.evidence,
      })),
      proposedActions: context.proposals,
      recentCustomers: context.customers.map((customer: any) => ({
        id: customer.id,
        name: customer.name,
        email: customer.email,
        relationshipType: customer.relationship_type,
        notes: customer.notes,
      })),
      recentResponses: context.responses.map((response: any) => ({
        id: response.id,
        customerName: response.customer_name,
        customerEmail: response.customer_email,
        submittedAt: response.submitted_at,
        answers: response.answers,
      })),
      recentEmails: context.emails.map((email: any) => ({
        id: email.id,
        sender: email.sender_email,
        subject: email.subject,
        date: email.date,
        content: safeText(email.content_text).slice(0, 500),
      })),
    },
    null,
    2,
  )
}

export const CRM_MCP_TOOLS = [
  {
    name: "crm.query_records",
    description: "Query scoped CRM records from Supabase: customers, surveys, survey responses, and saved emails.",
    inputSchema: {
      type: "object",
      properties: {
        entity: { type: "string", enum: ["customers", "surveys", "survey_responses", "emails"] },
        limit: { type: "number" },
      },
      required: ["entity"],
    },
  },
  {
    name: "crm.run_analysis",
    description: "Run or reuse cached CRM data analysis. Results are stored in Supabase crm_data_analyses.",
    inputSchema: {
      type: "object",
      properties: {
        analysisTypes: {
          type: "array",
          items: {
            type: "string",
            enum: ["sentiment", "themes", "pain_points", "trends", "churn_risk", "health_scores", "feature_requests", "opportunities"],
          },
        },
      },
      required: ["analysisTypes"],
    },
  },
  {
    name: "crm.propose_actions",
    description: "Create approval-gated CRM action proposals from current analyses.",
    inputSchema: {
      type: "object",
      properties: { prompt: { type: "string" } },
      required: ["prompt"],
    },
  },
  {
    name: "crm.execute_action",
    description: "Execute a user-approved CRM action proposal. Use only after explicit user approval.",
    inputSchema: {
      type: "object",
      properties: { action: { type: "object" } },
      required: ["action"],
    },
  },
  {
    name: "crm.auto_select_relevant_emails",
    description: "Classify recent inbox emails and save relevant customer inquiry emails for CRM analysis.",
    inputSchema: {
      type: "object",
      properties: { maxResults: { type: "number" } },
    },
  },
]

export async function callCRMTool(user: UserContext, name: string, args: Record<string, any>, request?: NextRequest) {
  if (name === "crm.query_records") {
    const data = await loadCRMData(user)
    const entityName = args.entity === "survey_responses" ? "responses" : args.entity
    const entity = entityName as keyof typeof data
    const limit = Math.min(Math.max(Number(args.limit) || 25, 1), 100)
    return { content: [{ type: "text", text: JSON.stringify((data[entity] || []).slice(0, limit), null, 2) }] }
  }

  if (name === "crm.run_analysis") {
    const analysisTypes = (Array.isArray(args.analysisTypes) ? args.analysisTypes : selectAnalysisTypes(""))
      .filter((type: string): type is AnalysisType =>
        ["sentiment", "themes", "pain_points", "trends", "churn_risk", "health_scores", "feature_requests", "opportunities"].includes(type),
      )
    const { analyses, statuses } = await runCachedAnalyses(user, analysisTypes)
    return { content: [{ type: "text", text: JSON.stringify({ analyses, statuses }, null, 2) }] }
  }

  if (name === "crm.propose_actions") {
    const prompt = safeText(args.prompt)
    const context = await buildCRMAgentContext(user, prompt)
    return { content: [{ type: "text", text: JSON.stringify({ proposals: context.proposals, statuses: context.statuses }, null, 2) }] }
  }

  if (name === "crm.execute_action" && request) {
    return { content: [{ type: "text", text: JSON.stringify(await executeCRMAction(user, args.action, request), null, 2) }] }
  }

  if (name === "crm.auto_select_relevant_emails" && request) {
    const selected = await fetchRelevantInboxEmailsForAnalysis(request, Math.min(Math.max(Number(args.maxResults) || 75, 1), 100))
    if (selected.error) return { content: [{ type: "text", text: JSON.stringify({ error: selected.error }, null, 2) }] }
    const saveResult = await saveEmailsForAnalysis(user, selected.emails)
    return { content: [{ type: "text", text: JSON.stringify({ selected: selected.classified, ...saveResult }, null, 2) }] }
  }

  throw new Error(`Unknown CRM MCP tool: ${name}`)
}
