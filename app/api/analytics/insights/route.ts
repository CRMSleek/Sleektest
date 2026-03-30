import { type NextRequest, NextResponse } from "next/server"
import { supabase } from "@/lib/supabase/client"
import { getCurrentUser } from "@/lib/supabase/auth"
import OpenAI from "openai"

const client = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY || "dummy-key",
  baseURL: "https://api.groq.com/openai/v1",
})

const MAX_DIRECT_SURVEYS = 35
const MAX_DIRECT_EMAILS = 35
const MAX_DIRECT_CHARS = 18000
const HF_API_TOKEN = process.env.HF_API_TOKEN || ""
const HF_SENTIMENT_MODEL = "cardiffnlp/twitter-roberta-base-sentiment-latest"
const HF_KEYWORD_MODEL = "ml6team/keyphrase-extraction-kbir-inspec"

type Insight = {
  title: string
  description: string
  type: "trend" | "demographic" | "feedback" | "opportunity"
  priority: "high" | "medium" | "low"
}

function safeText(v: unknown) {
  if (typeof v !== "string") return ""
  return v.replace(/\s+/g, " ").trim()
}

function collectSurveyTexts(responses: Array<{ answers: Record<string, any> | null }>) {
  const out: string[] = []
  for (const response of responses) {
    const answers = response.answers ?? {}
    for (const ans of Object.values(answers)) {
      if (typeof ans === "string") {
        const txt = safeText(ans)
        if (txt) out.push(txt)
      } else if (ans && typeof ans === "object" && "value" in ans) {
        const txt = safeText((ans as any).value)
        if (txt) out.push(txt)
      }
    }
  }
  return out
}

function collectEmailTexts(emails: Array<{ subject: string | null; content_text: string | null }>) {
  return emails
    .map((e) => {
      const subject = safeText(e.subject ?? "")
      const body = safeText(e.content_text ?? "")
      if (!subject && !body) return ""
      return `${subject ? `Subject: ${subject}. ` : ""}${body}`.trim()
    })
    .filter(Boolean)
}

function clipTexts(texts: string[], maxItems: number, maxCharsPerItem: number) {
  return texts
    .map((t) => safeText(t).slice(0, maxCharsPerItem))
    .filter(Boolean)
    .slice(0, maxItems)
}

async function summarizeFeedbackViaApi(surveyTexts: string[], emailTexts: string[]) {
  if (!HF_API_TOKEN) throw new Error("HF_API_TOKEN missing")

  const callHfModel = async (model: string, inputs: any) => {
    const response = await fetch(`https://api-inference.huggingface.co/models/${model}`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${HF_API_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ inputs }),
    })
    if (!response.ok) throw new Error(`HF_ERROR_${response.status}_${model}`)
    return response.json()
  }

  const toSentimentDistribution = async (texts: string[]) => {
    const candidates = texts.map(safeText).filter(Boolean).slice(0, 120)
    if (!candidates.length) return { positive: 0, neutral: 100, negative: 0 }

    // Cap each text to keep inference stable and fast.
    const trimmed = candidates.map((t) => t.slice(0, 400))
    const outputs = await Promise.all(
      trimmed.map((t) => callHfModel(HF_SENTIMENT_MODEL, t).catch(() => null))
    )

    let pos = 0
    let neu = 0
    let neg = 0
    let counted = 0
    for (const out of outputs) {
      if (!out) continue
      const arr = Array.isArray(out) ? out[0] : null
      if (!Array.isArray(arr)) continue
      counted += 1
      const top = [...arr].sort((a: any, b: any) => (b.score ?? 0) - (a.score ?? 0))[0]
      const label = String(top?.label || "").toLowerCase()
      if (label.includes("positive")) pos += 1
      else if (label.includes("negative")) neg += 1
      else neu += 1
    }

    if (counted === 0) return { positive: 0, neutral: 100, negative: 0 }
    const pct = (n: number) => Math.round((n / counted) * 100)
    const distribution = { positive: pct(pos), neutral: pct(neu), negative: pct(neg) }
    const total = distribution.positive + distribution.neutral + distribution.negative
    if (total !== 100) {
      distribution.neutral += 100 - total
    }
    return distribution
  }

  const toKeywords = async (texts: string[]) => {
    const merged = texts.map(safeText).filter(Boolean).slice(0, 120).join(" ").slice(0, 6000)
    if (!merged) return []
    const out = await callHfModel(HF_KEYWORD_MODEL, merged).catch(() => null)
    if (!out) return []

    // Text2text models usually return [{ generated_text: "a; b; c" }]
    const generated = Array.isArray(out) ? String(out[0]?.generated_text || "") : ""
    if (!generated) return []
    return generated
      .split(/[,;\n]/g)
      .map((k) => k.trim().toLowerCase())
      .filter((k) => k.length > 2)
      .filter((k, idx, arr) => arr.indexOf(k) === idx)
      .slice(0, 12)
  }

  const [surveySentiment, emailSentiment, surveyKeywords, emailKeywords] = await Promise.all([
    toSentimentDistribution(surveyTexts),
    toSentimentDistribution(emailTexts),
    toKeywords(surveyTexts),
    toKeywords(emailTexts),
  ])

  return {
    survey: {
      sentiment: surveySentiment,
      top_keywords: surveyKeywords,
      summary: `ML digest from ${Math.min(surveyTexts.length, 120)} survey text samples.`,
    },
    emails: {
      sentiment: emailSentiment,
      top_keywords: emailKeywords,
      summary: `ML digest from ${Math.min(emailTexts.length, 120)} email text samples.`,
    },
    notable_feedback: [...surveyTexts, ...emailTexts].filter(Boolean).slice(0, 8),
  }
}

async function generateInsights(summaryPayload: unknown) {
  const response = await client.responses.create({
    model: "openai/gpt-oss-20b",
    input: `Analyze this CRM dataset and return 3-4 actionable insights as strict JSON.
Output format:
{
  "insights": [
    {
      "title": "string",
      "description": "string",
      "type": "trend|demographic|feedback|opportunity",
      "priority": "high|medium|low"
    }
  ]
}

Data:
${JSON.stringify(summaryPayload)}`,
  })

  const text = (response.output_text || "").replace(/```json/g, "").replace(/```/g, "").trim()
  const parsed = JSON.parse(text)
  return (parsed.insights ?? []) as Insight[]
}

async function generateInsightsWithRetry(basePayload: unknown, fallbackPayload: unknown) {
  try {
    return await generateInsights(basePayload)
  } catch (err: any) {
    const isTooLarge = err?.status === 413 || String(err?.code || "").includes("tokens")
    if (!isTooLarge) throw err
    return await generateInsights(fallbackPayload)
  }
}

export async function POST(request: NextRequest) {
  try {
    const user = await getCurrentUser(request)
    if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })

    const businessId = user.business?.id
    if (!businessId) return NextResponse.json({ error: "Business not found" }, { status: 404 })

    const [customersResult, surveysResult, responsesResult, emailsResult] = await Promise.all([
      supabase.from("customers").select("age, location, data, created_at").eq("business_id", businessId),
      supabase.from("surveys").select("id, title, description, is_active, created_at").eq("user_id", user.id),
      supabase.from("survey_responses").select("answers, submitted_at, survey_id").eq("business_id", businessId),
      supabase.from("emails").select("sender_name, sender_email, subject, date, content_text").eq("user_id", user.id),
    ])

    const customers = customersResult.data || []
    const surveys = surveysResult.data || []
    const responses = responsesResult.data || []
    const emails = emailsResult.data || []

    if (customers.length === 0 && surveys.length === 0 && responses.length === 0 && emails.length === 0) {
      return NextResponse.json({
        insights: [
          {
            title: "No Data Available",
            description: "No customer, survey, response, or email data to generate insights yet.",
            type: "trend",
            priority: "low",
          },
        ],
      })
    }

    const surveyTexts = collectSurveyTexts(responses as any)
    const emailTexts = collectEmailTexts(emails as any)
    const directChars = surveyTexts.join(" ").length + emailTexts.join(" ").length
    const shouldUseDigest =
      surveyTexts.length > MAX_DIRECT_SURVEYS ||
      emailTexts.length > MAX_DIRECT_EMAILS ||
      directChars > MAX_DIRECT_CHARS

    const commonPayload = {
      totalCustomers: customers.length,
      totalSurveys: surveys.length,
      totalResponses: responses.length,
      totalEmails: emails.length,
      surveyPerformance: surveys.map((s) => ({
        title: s.title,
        isActive: s.is_active,
        responseCount: responses.filter((r) => r.survey_id === s.id).length,
      })),
    }

    // If HF inference fails/rate-limits, fallback to direct LLM context (as requested).
    let summaryPayload: any
    if (shouldUseDigest) {
      try {
        summaryPayload = {
          ...commonPayload,
          mode: "digest",
          feedbackDigest: await summarizeFeedbackViaApi(surveyTexts, emailTexts),
        }
      } catch (hfError) {
        console.warn("HF digest failed, falling back to direct LLM context:", hfError)
        summaryPayload = {
          ...commonPayload,
          mode: "direct-fallback",
          surveyFeedback: clipTexts(surveyTexts, 24, 220),
          emailFeedback: clipTexts(emailTexts, 24, 220),
        }
      }
    } else {
      summaryPayload = {
        ...commonPayload,
        mode: "direct",
        surveyFeedback: clipTexts(surveyTexts, 30, 260),
        emailFeedback: clipTexts(emailTexts, 30, 260),
      }
    }

    const emergencyPayload = {
      ...commonPayload,
      mode: "minimal-fallback",
      surveyFeedback: clipTexts(surveyTexts, 10, 120),
      emailFeedback: clipTexts(emailTexts, 10, 120),
    }

    const insights = await generateInsightsWithRetry(summaryPayload, emergencyPayload)
    if (Array.isArray(insights) && insights.length) {
      return NextResponse.json({ insights })
    }

    return NextResponse.json({
      insights: [
        {
          title: "AI Analysis Complete",
          description: "Insights were generated but returned in an unexpected format.",
          type: "trend",
          priority: "medium",
        },
      ],
    })
  } catch (error) {
    console.error("Generate insights error:", error)
    return NextResponse.json({
      insights: [
        {
          title: "Insight Generation Error",
          description:
            "We could not process all analytics right now. Please try again in a moment.",
          type: "opportunity",
          priority: "medium",
        },
      ],
    })
  }
}