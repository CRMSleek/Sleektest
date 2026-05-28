"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { AnalyticsChart } from "@/components/dashboard/analytics-chart"
import { AnalyticsMetrics } from "@/components/dashboard/analytics-metrics"
import { motion } from "framer-motion"

export default function AnalyticsPage() {
  const fade = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.7 } },
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div initial="hidden" animate="visible" variants={fade}>
        <div className="space-y-2">
          <p className="text-sm uppercase tracking-[0.24em] text-muted-foreground">Analytics workspace</p>
          <h1 className="text-3xl font-bold tracking-tight">Analytics</h1>
          <p className="max-w-3xl text-muted-foreground">
            Browse the standard dashboards first. Open the Agent page from the sidebar when you want to start a workflow.
          </p>
        </div>
      </motion.div>

      <AnalyticsMetrics />

      <Tabs defaultValue="overview" className="space-y-6">
        <motion.div initial="hidden" animate="visible" variants={fade}>
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="overview">Overview</TabsTrigger>
            <TabsTrigger value="demographics">Demographics</TabsTrigger>
            <TabsTrigger value="satisfaction">Satisfaction</TabsTrigger>
          </TabsList>
        </motion.div>

        <TabsContent value="overview" className="space-y-6 pt-2">
          <div className="grid gap-6 xl:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Response Trends</CardTitle>
                  <CardDescription>Survey responses over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <AnalyticsChart type="responses" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Customer Growth</CardTitle>
                  <CardDescription>New customers acquired over time</CardDescription>
                </CardHeader>
                <CardContent>
                  <AnalyticsChart type="growth" />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="demographics" className="space-y-6 pt-2">
          <div className="grid gap-6 xl:grid-cols-2">
            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Age Distribution</CardTitle>
                  <CardDescription>Customer age demographics</CardDescription>
                </CardHeader>
                <CardContent>
                  <AnalyticsChart type="age" />
                </CardContent>
              </Card>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 24 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.2 }}
              transition={{ duration: 0.5 }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Location Distribution</CardTitle>
                  <CardDescription>Customer geography by location</CardDescription>
                </CardHeader>
                <CardContent>
                  <AnalyticsChart type="location" />
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </TabsContent>

        <TabsContent value="satisfaction" className="space-y-6 pt-2">
          <motion.div
            initial={{ opacity: 0, y: 24 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, amount: 0.2 }}
            transition={{ duration: 0.5 }}
          >
            <Card>
              <CardHeader>
                <CardTitle>Customer Satisfaction</CardTitle>
                <CardDescription>Satisfaction ratings over time</CardDescription>
              </CardHeader>
              <CardContent>
                <AnalyticsChart type="satisfaction" />
              </CardContent>
            </Card>
          </motion.div>
        </TabsContent>
      </Tabs>
    </div>
  )
}
