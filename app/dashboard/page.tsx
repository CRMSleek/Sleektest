"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Users, FileText, BarChart3 } from "lucide-react"
import Link from "next/link"
import { motion } from "framer-motion"

interface DashboardStats {
  totalSurveys: number
  totalResponses: number
  totalCustomers: number
  recentActivity: Array<{
    id: string
    type: "survey_created" | "response_received"
    message: string
    timestamp: string
  }>
}

export default function DashboardPage() {
  const [stats, setStats] = useState<DashboardStats>({
    totalSurveys: 0,
    totalResponses: 0,
    totalCustomers: 0,
    recentActivity: [],
  })
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchDashboardData()
  }, [])

  const fetchDashboardData = async () => {
    try {
      // This would be replaced with actual API calls
      // For now, we'll use mock data
      setStats({
        totalSurveys: 5,
        totalResponses: 1234,
        totalCustomers: 3793,
        recentActivity: [
          {
            id: "1",
            type: "response_received",
            message: "New response to Customer Feedback Survey",
            timestamp: "2 hours ago",
          },
          {
            id: "2",
            type: "survey_created",
            message: "Created Product Satisfaction Survey",
            timestamp: "1 day ago",
          },
        ],
      })
    } catch (error) {
      console.error("Fetch dashboard data error:", error)
    } finally {
      setLoading(false)
    }
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.12, duration: 0.6 } }),
  }
  const fade = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.7 } },
  }

  if (loading) {
    return (
      <div className="p-6 bg-gray-900 min-h-screen">
        <div className="animate-pulse space-y-6">
          <div className="h-8 bg-gray-800 rounded w-1/4"></div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {[1, 2, 3].map((i) => (
              <div key={i} className="h-32 bg-gray-800 rounded"></div>
            ))}
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="p-6 space-y-6 bg-gray-900 min-h-screen text-white">
      <motion.div
        className="flex justify-between items-center"
        initial="hidden"
        animate="visible"
        variants={fade}
      >
        <h1 className="text-3xl font-bold">Dashboard</h1>
      </motion.div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        {[{
          title: "Total Surveys",
          value: stats.totalSurveys,
          icon: <FileText className="h-4 w-4 text-blue-400" />,
          desc: "Active surveys",
        }, {
          title: "Total Responses",
          value: stats.totalResponses,
          icon: <BarChart3 className="h-4 w-4 text-green-400" />,
          desc: "Survey responses",
        }, {
          title: "Total Customers",
          value: stats.totalCustomers,
          icon: <Users className="h-4 w-4 text-purple-400" />,
          desc: "Unique customers",
        }].map((card, i) => (
          <motion.div
            key={card.title}
            custom={i}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true, amount: 0.3 }}
            variants={fadeUp}
          >
            <Card className="bg-gray-800 border-gray-700 text-white">
              <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                <CardTitle className="text-sm font-medium">{card.title}</CardTitle>
                {card.icon}
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{card.value}</div>
                <p className="text-xs text-gray-400">{card.desc}</p>
              </CardContent>
            </Card>
          </motion.div>
        ))}
      </div>

      {/* Quick Actions */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeUp}
        custom={0}
      >
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <CardTitle>Quick Actions</CardTitle>
            <CardDescription className="text-gray-400">Common tasks to get you started</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              <Link href="/dashboard/surveys/new">
                <Button variant="outline" className="w-full h-20 flex flex-col border-gray-600 bg-gray-900 text-white hover:bg-gray-700">
                  <Plus className="h-6 w-6 mb-2" />
                  Create Survey
                </Button>
              </Link>
              <Link href="/dashboard/surveys">
                <Button variant="outline" className="w-full h-20 flex flex-col border-gray-600 bg-gray-900 text-white hover:bg-gray-700">
                  <FileText className="h-6 w-6 mb-2" />
                  View Surveys
                </Button>
              </Link>
              <Link href="/dashboard/customers">
                <Button variant="outline" className="w-full h-20 flex flex-col border-gray-600 bg-gray-900 text-white hover:bg-gray-700">
                  <Users className="h-6 w-6 mb-2" />
                  Manage Customers
                </Button>
              </Link>
              <Link href="/dashboard/analytics">
                <Button variant="outline" className="w-full h-20 flex flex-col border-gray-600 bg-gray-900 text-white hover:bg-gray-700">
                  <BarChart3 className="h-6 w-6 mb-2" />
                  View Analytics
                </Button>
              </Link>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Recent Activity */}
      <motion.div
        initial="hidden"
        whileInView="visible"
        viewport={{ once: true, amount: 0.2 }}
        variants={fadeUp}
        custom={1}
      >
        <Card className="bg-gray-800 border-gray-700 text-white">
          <CardHeader>
            <CardTitle>Recent Activity</CardTitle>
          </CardHeader>
          <CardContent>
            {stats.recentActivity.length > 0 ? (
              <div className="space-y-4">
                {stats.recentActivity.map((activity, i) => (
                  <motion.div
                    key={activity.id}
                    custom={i}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={fadeUp}
                  >
                    <div className="flex items-center space-x-4">
                      <div className="w-2 h-2 bg-blue-500 rounded-full"></div>
                      <div className="flex-1">
                        <p className="text-sm">{activity.message}</p>
                        <p className="text-xs text-gray-400">{activity.timestamp}</p>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-gray-400 text-center py-8">
                No recent activity. Create your first survey to get started!
              </p>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}
