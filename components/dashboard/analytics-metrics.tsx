'use client'
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { TrendingUp, TrendingDown, Users, Star, BarChart3, Target } from "lucide-react"
import { motion } from 'framer-motion'

const metrics = [
  {
    title: "Total Responses",
    value: "1,234",
    change: "+12.5%",
    trend: "up",
    icon: BarChart3,
    id: 0
  },
  {
    title: "Avg. Satisfaction",
    value: "4.7/5",
    change: "+0.3",
    trend: "up",
    icon: Star,
    id: 1
  },
  {
    title: "Response Rate",
    value: "68%",
    change: "-2.1%",
    trend: "down",
    icon: Target,
    id: 2
  },
  {
    title: "Active Customers",
    value: "892",
    change: "+8.2%",
    trend: "up",
    icon: Users,
    id: 3
  },
]

export function AnalyticsMetrics() {
  return (
    <div 
      className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
      {metrics.map((metric) => (
        <motion.div 
          key={metric.id}
          initial={{ opacity: 0, y: 30 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true, amount: 0.2 }}
          transition={{ delay: metric.id * 0.12, duration: 0.6 }}>
          <Card key={metric.title}>
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
                <span className={metric.trend === "up" ? "text-green-500" : "text-red-500"}>{metric.change}</span>
                <span className="ml-1">from last month</span>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
