"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalyticsChart } from "@/components/dashboard/analytics-chart"
import { AnalyticsInsights } from "@/components/dashboard/analytics-insights"
import { AnalyticsMetrics } from "@/components/dashboard/analytics-metrics"
import { motion } from "framer-motion"

export default function AnalyticsPage() {
  const fade = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.7 } },
  }
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.6 } },
  }

  return (
    <div className="space-y-6 m-6">
      <motion.div initial="hidden" animate="visible" variants={fade}>
        <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
        <p className="text-muted-foreground">Insights and trends from your customer data</p>
      </motion.div>

      <AnalyticsMetrics />

      <Tabs defaultValue="overview">
        <motion.div initial="hidden" animate="visible" variants={fadeUp}>
          <TabsList className="grid w-full grid-cols-4">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
            <TabsTrigger value="insights">AI Insights</TabsTrigger>
          </TabsList>
        </motion.div>

        <TabsContent value="overview" className="space-y-6 pt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {[0, 1].map((i) => (
              <motion.div
                key={i}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.12, duration: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>{i === 0 ? "Response Trends" : "Customer Growth"}</CardTitle>
                    <CardDescription>
                      {i === 0 ? "Survey responses over time" : "New customers acquired monthly"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart type={i === 0 ? "responses" : "growth"} />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6 pt-4">
          <div className="grid gap-6 md:grid-cols-2">
            {["age", "location"].map((type, i) => (
              <motion.div
                key={type}
                initial={{ opacity: 0, y: 30 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.2 }}
                transition={{ delay: i * 0.12, duration: 0.6 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>
                      {type === "age" ? "Age Distribution" : "Location Distribution"}
                    </CardTitle>
                    <CardDescription>
                      {type === "age"
                        ? "Customer age demographics"
                        : "Customer geographic distribution"}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <AnalyticsChart type={type} />
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </TabsContent>

        <TabsContent value="satisfaction" className="space-y-6 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0, duration: 0.6 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Customer Satisfaction Trends</CardTitle>
                <CardDescription>Satisfaction ratings over time</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart type="satisfaction" />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>

        <TabsContent value="insights" className="space-y-6 pt-4">
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ delay: 0, duration: 0.6 }}
          >
            <AnalyticsInsights />
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}