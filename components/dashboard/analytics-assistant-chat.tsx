"use client"

import { useState, useEffect } from "react"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, Sparkles } from "lucide-react"
import { motion } from "framer-motion"
import { InteractivePromptBlock } from "@/components/dashboard/agent-interactive-prompt"
import { parseInteractiveFromAssistant } from "@/lib/agent-interactive-prompts"

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
}

const WELCOME: ChatMessage = {
  id: "welcome",
  role: "assistant",
  content:
    "Hi! I'm the SleekCRM assistant. Ask me about your customer analytics, survey results, or ideas for improving engagement.",
}

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.06, duration: 0.4 },
  }),
}

export function AnalyticsAssistantChat() {
  const [messages, setMessages] = useState<ChatMessage[]>([WELCOME])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)
  const [historyLoaded, setHistoryLoaded] = useState(false)
  const [answeredInteractions, setAnsweredInteractions] = useState<Record<string, string>>({})

  useEffect(() => {
    const load = async () => {
      try {
        const res = await fetch("/api/analytics/assistant")
        if (!res.ok) return
        const data = (await res.json()) as {
          messages?: Array<{ id: string; role: string; content: string }>
        }
        const rows = data.messages || []
        if (rows.length === 0) {
          setMessages([WELCOME])
        } else {
          setMessages(
            rows.map((m) => ({
              id: m.id,
              role: m.role as "user" | "assistant",
              content: m.content,
            }))
          )
        }
      } catch {
        setMessages([WELCOME])
      } finally {
        setHistoryLoaded(true)
      }
    }
    void load()
  }, [])

  const sendMessage = async (content: string) => {
    const trimmed = content.trim()
    if (!trimmed || isSending) return

    const optimisticUser: ChatMessage = {
      id: `temp-${crypto.randomUUID()}`,
      role: "user",
      content: trimmed,
    }
    setMessages((prev) => [...prev.filter((m) => m.id !== "welcome"), optimisticUser])
    setInput("")
    setIsSending(true)

    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: trimmed }),
      })

      if (!response.ok) {
        throw new Error("Failed to get assistant response")
      }

      const data = (await response.json()) as {
        reply: string
        messages?: Array<{ id: string; role: string; content: string }>
      }

      if (data.messages?.length) {
        setMessages(
          data.messages.map((m) => ({
            id: m.id,
            role: m.role as "user" | "assistant",
            content: m.content,
          }))
        )
      } else {
        setMessages((prev) => [
          ...prev,
          { id: crypto.randomUUID(), role: "assistant", content: data.reply.trim() },
        ])
      }
    } catch (error) {
      console.error("Assistant chat error:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: "error",
          role: "assistant",
          content:
            "Sorry, I couldn't reach the SleekCRM assistant just now. Please try again in a moment.",
        },
      ])
    } finally {
      setIsSending(false)
    }
  }

  const handleSend = async () => {
    await sendMessage(input)
  }

  const handleKeyDown = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === "Enter" && !event.shiftKey) {
      event.preventDefault()
      void handleSend()
    }
  }

  return (
    <Card className="flex h-[960px] flex-col">
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <div>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Sparkles className="h-4 w-4 text-primary" />
            SleekCRM Assistant
          </CardTitle>
          <CardDescription>
            Chat with an AI assistant about your analytics, customers, and next CRM actions. History is saved to your account.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <ScrollArea className="flex-1 rounded-md border bg-muted/30 p-3">
          <div className="space-y-3">
            {!historyLoaded && (
              <p className="text-sm text-muted-foreground">Loading conversation…</p>
            )}
            {messages.map((message, index) => {
              const parsed =
                message.role === "assistant"
                  ? parseInteractiveFromAssistant(message.content)
                  : { text: message.content, interactive: null }
              const textContent = parsed.text || (parsed.interactive ? "" : message.content)
              const answeredLabel = answeredInteractions[message.id]

              return (
                <motion.div
                  key={message.id}
                  variants={fadeUp}
                  initial="hidden"
                  animate="visible"
                  custom={index}
                  className={`flex flex-col gap-2 ${
                    message.role === "user" ? "items-end" : "items-start"
                  }`}
                >
                  {textContent && (
                    <div
                      className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                        message.role === "user"
                          ? "bg-primary text-primary-foreground"
                          : "bg-muted text-foreground"
                      }`}
                    >
                      {textContent}
                    </div>
                  )}
                  {parsed.interactive ? (
                    <InteractivePromptBlock
                      prompt={parsed.interactive}
                      disabled={isSending || Boolean(answeredLabel)}
                      answeredLabel={answeredLabel}
                      onSelect={(value, label) => {
                        setAnsweredInteractions((current) => ({ ...current, [message.id]: label }))
                        void sendMessage(value)
                      }}
                    />
                  ) : null}
                </motion.div>
              )
            })}
          </div>
        </ScrollArea>

        <form
          className="flex gap-2"
          onSubmit={(event) => {
            event.preventDefault()
            void handleSend()
          }}
        >
          <Input
            placeholder="Ask about your analytics, customers, or surveys..."
            value={input}
            onChange={(event) => setInput(event.target.value)}
            onKeyDown={handleKeyDown}
            disabled={isSending || !historyLoaded}
            className="flex-1"
          />
          <Button type="submit" disabled={isSending || !input.trim() || !historyLoaded}>
            <Send className="mr-1 h-4 w-4" />
            {isSending ? "Sending..." : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
