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
import {
  Lightbulb,
  RefreshCw,
  TrendingUp,
  Users,
  MapPin,
  Star,
} from "lucide-react"
import { motion } from "framer-motion"

const mockInsights = [
  {
    id: "1",
    type: "trend",
    title: "Customer Satisfaction Improving",
    description:
      "Your customer satisfaction scores have increased by 15% over the past 3 months. The main drivers appear to be improved response times and better product quality.",
    icon: TrendingUp,
    priority: "high",
  },
  {
    id: "2",
    type: "demographic",
    title: "Growing Younger Audience",
    description:
      "There's been a 23% increase in customers aged 25-35. Consider developing products or services that appeal to this demographic's preferences for digital-first experiences.",
    icon: Users,
    priority: "medium",
  },
  {
    id: "3",
    type: "geographic",
    title: "West Coast Expansion Opportunity",
    description:
      "Survey data shows high interest from the West Coast region, but low current customer representation. This could be a prime expansion opportunity.",
    icon: MapPin,
    priority: "medium",
  },
  {
    id: "4",
    type: "feedback",
    title: "Mobile App Feature Request",
    description:
      "42% of survey respondents mentioned wanting a mobile app. This is the most frequently requested feature across all customer segments.",
    icon: Star,
    priority: "high",
  },
]

const fadeUp = {
  hidden: { opacity: 0, y: 30 },
  visible: (i: number) => ({
    opacity: 1,
    y: 0,
    transition: { delay: i * 0.12, duration: 0.6 },
  }),
}

export function AnalyticsInsights() {
  const [insights, setInsights] = useState([])
  const [isGenerating, setIsGenerating] = useState(false)

  const generateNewInsights = async () => {
    setIsGenerating(true)

    await new Promise((resolve) => setTimeout(resolve, 2000))

    const newInsight = {
      id: Date.now().toString(),
      type: "trend",
      title: "Peak Response Times Identified",
      description:
        "Analysis shows customers are most likely to respond to surveys between 2-4 PM on weekdays. Consider timing your survey campaigns accordingly.",
      icon: TrendingUp,
      priority: "medium" as const,
    }

    setInsights([newInsight, ...mockInsights.slice(0, 3)])
    setIsGenerating(false)
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
            <motion.div key={insight.id} variants={fadeUp} custom={i}>
              <Card className={`border-l-4 ${getPriorityColor(insight.priority)}`}>
                <CardHeader>
                  <div className="flex items-start gap-4">
                    <div className="p-2 rounded-lg bg-primary/10">
                      <insight.icon className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <CardTitle className="text-lg">{insight.title}</CardTitle>
                      <CardDescription className="mt-1 text-base">
                        {insight.description}
                      </CardDescription>
                    </div>
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

      <Card className="bg-muted/50">
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Lightbulb className="h-5 w-5" />
            How AI Insights Work
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            Our AI analyzes your customer survey responses, demographic data,
            and feedback patterns to identify trends, opportunities, and
            actionable insights. These insights are automatically updated as new
            data comes in, helping you make data-driven decisions for your
            business.
          </p>
        </CardContent>
      </Card>
    </div>
  )
}