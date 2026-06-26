"use client"

import { useState } from "react"
import { Check } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { InteractivePrompt } from "@/lib/agent-interactive-prompts"

type InteractivePromptBlockProps = {
  prompt: InteractivePrompt
  disabled?: boolean
  answeredLabel?: string
  onSelect: (value: string, label: string) => void
}

export function InteractivePromptBlock({ prompt, disabled, answeredLabel, onSelect }: InteractivePromptBlockProps) {
  const [selected, setSelected] = useState<string[]>([])

  if (answeredLabel) {
    return (
      <div className="mt-3 rounded-lg border border-primary/15 bg-muted/30 px-3 py-2.5">
        <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">Your choice</p>
        <p className="mt-1 text-sm">{answeredLabel}</p>
      </div>
    )
  }

  if (prompt.type === "yes_no") {
    const [yesOption, noOption] = prompt.options
    return (
      <div className="mt-3 rounded-xl border border-primary/15 bg-background p-3 shadow-sm">
        <p className="text-sm font-medium leading-snug">{prompt.title}</p>
        <div className="mt-3 grid grid-cols-2 gap-2">
          <Button
            type="button"
            size="sm"
            disabled={disabled}
            className="h-9 rounded-lg"
            onClick={() => onSelect(yesOption.value, yesOption.label)}
          >
            {yesOption.label}
          </Button>
          <Button
            type="button"
            size="sm"
            variant="outline"
            disabled={disabled}
            className="h-9 rounded-lg"
            onClick={() => onSelect(noOption.value, noOption.label)}
          >
            {noOption.label}
          </Button>
        </div>
      </div>
    )
  }

  if (prompt.type === "multi_choice") {
    const toggle = (value: string) => {
      setSelected((current) => (current.includes(value) ? current.filter((item) => item !== value) : [...current, value]))
    }

    return (
      <div className="mt-3 rounded-xl border border-primary/15 bg-background p-3 shadow-sm">
        <p className="text-sm font-medium leading-snug">{prompt.title}</p>
        <p className="mt-1 text-xs text-muted-foreground">Select one or more, then continue.</p>
        <div className="mt-3 flex flex-wrap gap-2">
          {prompt.options.map((option) => {
            const active = selected.includes(option.value)
            return (
              <button
                key={option.label}
                type="button"
                disabled={disabled}
                onClick={() => toggle(option.value)}
                className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm transition-colors ${
                  active
                    ? "border-primary bg-primary/10 text-foreground"
                    : "border-border bg-background text-muted-foreground hover:border-primary/30 hover:text-foreground"
                }`}
              >
                {active ? <Check className="h-3.5 w-3.5 text-primary" /> : null}
                {option.label}
              </button>
            )
          })}
        </div>
        <Button
          type="button"
          size="sm"
          disabled={disabled || selected.length === 0}
          className="mt-3 h-8 rounded-lg"
          onClick={() => {
            const labels = prompt.options.filter((option) => selected.includes(option.value)).map((option) => option.label)
            onSelect(selected.join("; "), labels.join(", "))
          }}
        >
          Continue
        </Button>
      </div>
    )
  }

  return (
    <div className="mt-3 rounded-xl border border-primary/15 bg-background p-3 shadow-sm">
      <p className="text-sm font-medium leading-snug">{prompt.title}</p>
      <div className="mt-3 flex flex-col gap-2">
        {prompt.options.map((option, index) => (
          <Button
            key={option.label}
            type="button"
            size="sm"
            variant={index === 0 ? "default" : "outline"}
            disabled={disabled}
            className="h-auto min-h-9 justify-start whitespace-normal rounded-lg px-3 py-2 text-left text-sm"
            onClick={() => onSelect(option.value, option.label)}
          >
            {option.label}
          </Button>
        ))}
      </div>
    </div>
  )
}
