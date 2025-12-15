"use client"

import { useState } from "react"
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

// Fardin and madman send 6-7 nucear powered icebreakers to the arctic 12/15

type ChatMessage = {
  id: string
  role: "user" | "assistant"
  content: string
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
  const [messages, setMessages] = useState<ChatMessage[]>([
    {
      id: "welcome",
      role: "assistant",
      content:
        "Hi! I’m the SleekCRM assistant. Ask me about your customer analytics, survey results, or ideas for improving engagement.",
    },
  ])
  const [input, setInput] = useState("")
  const [isSending, setIsSending] = useState(false)

  const handleSend = async () => {
    const trimmed = input.trim()
    if (!trimmed || isSending) return

    const userMessage: ChatMessage = {
      id: crypto.randomUUID(),
      role: "user",
      content: trimmed,
    }

    const optimisticMessages = [...messages, userMessage]
    setMessages(optimisticMessages)
    setInput("")
    setIsSending(true)

    try {
      const response = await fetch("/api/analytics/assistant", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          messages: optimisticMessages.map(({ role, content }) => ({
            role,
            content,
          })),
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get assistant response")
      }

      const data = (await response.json()) as { reply: string }
      const assistantMessage: ChatMessage = {
        id: crypto.randomUUID(),
        role: "assistant",
        content: data.reply.trim(),
      }

      setMessages((prev) => [...prev, assistantMessage])
    } catch (error) {
      console.error("Assistant chat error:", error)
      setMessages((prev) => [
        ...prev,
        {
          id: "error",
          role: "assistant",
          content:
            "Sorry, I couldn’t reach the SleekCRM assistant just now. Please try again in a moment.",
        },
      ])
    } finally {
      setIsSending(false)
    }
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
            Chat with an AI assistant about your analytics and customer insights.
          </CardDescription>
        </div>
      </CardHeader>
      <CardContent className="flex flex-1 flex-col gap-4">
        <ScrollArea className="flex-1 rounded-md border bg-muted/30 p-3">
          <div className="space-y-3">
            {messages.map((message, index) => (
              <motion.div
                key={message.id}
                variants={fadeUp}
                initial="hidden"
                animate="visible"
                custom={index}
                className={`flex ${
                  message.role === "user" ? "justify-end" : "justify-start"
                }`}
              >
                <div
                  className={`max-w-[80%] rounded-lg px-3 py-2 text-sm ${
                    message.role === "user"
                      ? "bg-primary text-primary-foreground"
                      : "bg-muted text-foreground"
                  }`}
                >
                  {message.content}
                </div>
              </motion.div>
            ))}
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
            disabled={isSending}
          />
          <Button type="submit" disabled={isSending || !input.trim()}>
            <Send className="mr-1 h-4 w-4" />
            {isSending ? "Sending..." : "Send"}
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}


