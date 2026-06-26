export type InteractivePromptType = "yes_no" | "single_choice" | "multi_choice"

export type InteractiveOption = {
  label: string
  value: string
}

export type InteractivePrompt = {
  type: InteractivePromptType
  title: string
  options: InteractiveOption[]
}

export const INTERACTIVE_PROMPT_SYSTEM_GUIDE = `
Interactive chat:
- Prefer guided choices over open-ended questions when the next step is clear.
- Append ONE fenced JSON block when you need a decision. Keep prose before it short.
- Schema:
\`\`\`json
{"interactive":{"type":"yes_no","title":"Should I draft a follow-up email to Dan?","options":[{"label":"Yes","value":"Yes, draft the follow-up email to Dan."},{"label":"No","value":"No, show other options first."}]}}
\`\`\`
- type must be yes_no (2 options), single_choice (2-6 options), or multi_choice (2-6 options).
- options[].value is sent verbatim as the user's reply when they click.
- Ask one decision at a time. Do not dump bullet insight lists; guide the user step by step.
- Legacy alias \`proposedAction\` with title + options is also supported.
`.trim()

function parseJsonOrNull(value: string) {
  try {
    return JSON.parse(value)
  } catch {
    return null
  }
}

function normalizeInteractivePrompt(raw: unknown): InteractivePrompt | null {
  if (!raw || typeof raw !== "object") return null
  const record = raw as Record<string, unknown>
  const source = (record.interactive || record.proposedAction) as Record<string, unknown> | undefined
  if (!source || typeof source.title !== "string" || !source.title.trim()) return null

  let type = (typeof source.type === "string" ? source.type : "single_choice") as InteractivePromptType
  if (!["yes_no", "single_choice", "multi_choice"].includes(type)) type = "single_choice"

  const optionsRaw = Array.isArray(source.options) ? source.options : []
  const options: InteractiveOption[] = optionsRaw
    .map((item) => {
      if (!item || typeof item !== "object") return null
      const option = item as Record<string, unknown>
      const label = typeof option.label === "string" ? option.label.trim() : ""
      const value = typeof option.value === "string" ? option.value.trim() : label
      if (!label || !value) return null
      return { label, value }
    })
    .filter((item): item is InteractiveOption => Boolean(item))

  if (type === "yes_no") {
    const yesValue = typeof source.yes === "string" ? source.yes.trim() : options[0]?.value
    const noValue = typeof source.no === "string" ? source.no.trim() : options[1]?.value
    if (yesValue && noValue) {
      return {
        type: "yes_no",
        title: source.title.trim(),
        options: [
          { label: "Yes", value: yesValue },
          { label: "No", value: noValue },
        ],
      }
    }
  }

  if (options.length < 2) return null
  if (type === "yes_no" && options.length >= 2) {
    return { type: "yes_no", title: source.title.trim(), options: options.slice(0, 2) }
  }

  return {
    type,
    title: source.title.trim(),
    options: options.slice(0, 6),
  }
}

export function parseInteractiveFromAssistant(content: string): { text: string; interactive: InteractivePrompt | null } {
  const blockRegex = /```json\s+([\s\S]*?)\s+```/g
  let text = content
  let interactive: InteractivePrompt | null = null
  let match: RegExpExecArray | null

  while ((match = blockRegex.exec(content))) {
    const parsed = parseJsonOrNull(match[1])
    const normalized = normalizeInteractivePrompt(parsed)
    if (normalized) {
      interactive = normalized
      text = text.replace(match[0], "").trim()
    }
  }

  return {
    text: text || (interactive ? "" : content.trim()),
    interactive,
  }
}
