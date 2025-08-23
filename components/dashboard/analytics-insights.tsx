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
import { Lightbulb, RefreshCw } from "lucide-react"
import { motion } from "framer-motion"

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6 },
  }),
}

type Insight = {
  title?: string
  description: string
  type?: string
  priority: string
  id?: string
}

export function AnalyticsInsights() {
  const [insights, setInsights] = useState<Insight[]>([])
  const [isGenerating, setIsGenerating] = useState(false)

  const generateNewInsights = async () => {
    setIsGenerating(true)

    try {
      const response = await fetch("/api/analytics/insights", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })

      console.log("Fetch status:", response.status)

      if (!response.ok) {
        const err = await response.text()
        console.error("Error response:", err)
        throw new Error("Failed to generate insights")
      }

      const data = await response.json()
      console.log("Insights data:", data)

      console.log(data.insights)
      setInsights(data.insights)
    } catch (error) {
      console.error("Failed to generate insights:", error)
      setInsights([])
    } finally {
      setIsGenerating(false)
    }
  }

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case "high":
        return "border-l-red-500"
      case "medium":
        return "border-l-yellow-500"
      case "low":
        return "border-l-green-500"
      default:
        return "border-l-gray-500"
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold">AI-Generated Insights</h2>
          <p className="text-muted-foreground">
            Intelligent analysis of your customer data and feedback
          </p>
        </div>
        <Button onClick={generateNewInsights} disabled={isGenerating}>
          {isGenerating ? (
            <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
          ) : (
            <Lightbulb className="mr-2 h-4 w-4" />
          )}
          {isGenerating ? "Generating..." : "Generate New Insights"}
        </Button>
      </div>

      {insights.length > 0 && (
        <motion.div
          className="grid gap-6"
          initial="hidden"
          animate="visible"
          viewport={{ once: true, amount: 0.2 }}
        >
          {insights.map((insight, i) => (
            <motion.div key={insight.id ?? i} variants={fadeUp} custom={i}>
              <Card className={`border-l-4 ${getPriorityColor(insight.priority)}`}>
                <CardHeader>
                  <div className="flex flex-col gap-2">
                    <CardTitle className="text-lg">{insight.title}</CardTitle>
                    <CardDescription className="text-base">
                      {insight.description}
                    </CardDescription>
                    <div className="text-xs text-muted-foreground capitalize">
                      {insight.priority} Priority
                    </div>
                  </div>
                </CardHeader>
              </Card>
            </motion.div>
          ))}
        </motion.div>
      )}
    </div>
  )
}