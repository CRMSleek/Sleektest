'use client'

import { useEffect, useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, Star, BarChart3, Target } from "lucide-react"
import { motion } from 'framer-motion'

interface MetricWithChange {
  value: number
  change: number
}

interface Metrics {
  totalCustomers: MetricWithChange
  totalSurveys: MetricWithChange
  totalResponses: MetricWithChange
  activeCustomers: MetricWithChange
  avgSatisfaction: MetricWithChange
  completionRate: MetricWithChange
}

export function AnalyticsMetrics() {
  const [metrics, setMetrics] = useState<Metrics | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const fetchMetrics = async () => {
      try {
        const response = await fetch('/api/analytics', {
          method: "POST",
          headers: {
            "Content-type": "application/json",
          },
        })
        if (response.ok) {
          const data = await response.json()
          setMetrics(data.metrics)
        }
      } catch (error) {
        console.error('Failed to fetch metrics:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMetrics()
  }, [])

  if (loading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Card key={i}>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <div className="h-4 w-20 bg-gray-200 rounded animate-pulse" />
              <div className="h-5 w-5 bg-gray-200 rounded animate-pulse" />
            </CardHeader>
            <CardContent>
              <div className="h-8 w-16 bg-gray-200 rounded animate-pulse mb-2" />
              <div className="h-3 w-24 bg-gray-200 rounded animate-pulse" />
            </CardContent>
          </Card>
        ))}
      </div>
    )
  }

  if (!metrics) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        <Card>
          <CardContent className="p-6 text-center">
            <p className="text-muted-foreground">Failed to load metrics</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  // Prepare metrics for rendering
 const metricsData = [
    {
      title: "Total Responses",
      value: `${metrics.totalResponses.value.toLocaleString()}`,
      change: metrics.totalResponses.change.toFixed(1),
      trend: metrics.totalResponses.change >= 0 ? "up" : "down",
      icon: BarChart3,
      id: 0
    },
    {
      title: "Avg. Satisfaction",
      value: `${metrics.avgSatisfaction.value.toFixed(1)}/5`,
      change: metrics.avgSatisfaction.change.toFixed(1),
      trend: metrics.avgSatisfaction.change >= 0 ? "up" : "down",
      icon: Star,
      id: 1
    },
    {
      title: "Completion Rate",
      value: `${metrics.completionRate.value}%`,
      change: metrics.completionRate.change.toFixed(1),
      trend: metrics.completionRate.change >= 0 ? "up" : "down",
      icon: Target,
      id: 2
    },
    {
      title: "Active Customers",
      value: `${metrics.activeCustomers.value.toLocaleString()}`,
      change: metrics.activeCustomers.change.toFixed(1),
      trend: metrics.activeCustomers.change >= 0 ? "up" : "down",
      icon: Users,
      id: 3
    },
  ]

  return (
    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metricsData.map((metric) => (
        <motion.div 
          key={metric.id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ delay: metric.id * 0.12, duration: 0.6 }}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-sm font-medium">{metric.title}</CardTitle>
              <metric.icon className="h-5 w-5 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold">{metric.value}</div>
              <div className="flex items-center text-xs text-muted-foreground">
                {metric.trend === "up" ? (
                  <TrendingUp className="mr-1 h-3 w-3 text-green-500" />
                ) : (
                  <TrendingDown className="mr-1 h-3 w-3 text-red-500" />
                )}
                <span className={metric.trend === "up" ? "text-green-500" : "text-red-500"}>
                  {metric.change}%
                </span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}