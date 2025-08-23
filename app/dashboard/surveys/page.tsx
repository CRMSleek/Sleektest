"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Eye, Edit, Trash2, FileText, PencilLine } from "lucide-react"
import { motion } from "framer-motion"

interface Survey {
  id: string
  title: string
  description?: string
  isActive: boolean
  createdAt: string
  _count: {
    responses: number
  }
}

export default function SurveysPage() {
  const [surveys, setSurveys] = useState<Survey[]>([])
  const [loading, setLoading] = useState(true)
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.03, duration: 0.6 } }),
  }
  const fade = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.7 } },
  }


  useEffect(() => {
    fetchSurveys()
  }, [])

  const fetchSurveys = async () => {
    try {
      const response = await fetch("/api/surveys")
      if (response.ok) {
        const data = await response.json()
        setSurveys(data.surveys)
      }
    } catch (error) {
      console.error("Fetch surveys error:", error)
    } finally {
      setLoading(false)
    }
  }

  const deleteSurvey = async (id: string) => {
    if (!confirm("Are you sure you want to delete this survey?")) return

    try {
      const response = await fetch(`/api/surveys/${id}`, {
        method: "DELETE",
      })
      if (response.ok) {
        setSurveys(surveys.filter((s) => s.id !== id))
      }
    } catch (error) {
      console.error("Delete survey error:", error)
    }
  }
  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <motion.div
            className="flex justify-between items-center"
            initial="hidden"
            animate="visible"
            variants={fade}>
          <h1 className="text-3xl font-bold">Surveys</h1>
          <Link href="/dashboard/surveys/new">
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Create Survey
            </Button>
          </Link>
        </motion.div>
      </div>
    )
  }
  return (
    <div className="p-6 space-y-6">
      <motion.div
          className="flex justify-between items-center"
          initial="hidden"
          animate="visible"
          variants={fade}>
        <h1 className="text-3xl font-bold">Surveys</h1>
        <Link href="/dashboard/surveys/new">
          <Button>
            <Plus className="h-4 w-4 mr-2" />
            Create Survey
          </Button>
        </Link>
      </motion.div>

      {surveys.length === 0 ? (
        <motion.div
          initial="hidden"
          animate="visible"
          variants={fadeUp}>
          <Card>
            <CardContent className="p-12 text-center">
              <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No surveys yet</h3>
              <p className="text-gray-600 mb-4">Create your first survey to start collecting customer feedback.</p>
              <Link href="/dashboard/surveys/new">
                <Button>
                  <Plus className="h-4 w-4 mr-2" />
                  Create Your First Survey
                </Button>
              </Link>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {surveys.map((survey, i) => (
            <motion.div
              key={survey.id}
              initial="hidden"
              animate="visible"
              variants={fadeUp}
              custom={i}>
              <Card key={survey.id}>
                <CardHeader>
                  <CardTitle className="text-lg">{survey.title}</CardTitle>
                  {survey.description && <CardDescription>{survey.description}</CardDescription>}
                </CardHeader>
                <CardContent>
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-sm text-gray-600">{survey._count.responses} responses</span>
                    <span
                      className={`px-2 py-1 rounded-full text-xs ${
                        survey.isActive ? "bg-green-100 text-green-800" : "bg-gray-100 text-gray-800"
                      }`}
                    >
                      {survey.isActive ? "Active" : "Inactive"}
                    </span>
                  </div>
                  <div className="flex space-x-1">
                    <Link href={`/survey/${survey.id}`} target="_blank">
                      <Button variant="outline" size="sm">
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </Link>
                    <Link href={`/dashboard/surveys/${survey.id}/edit`}>
                      <Button variant="outline" size="sm">
                        <Edit className="h-4 w-4 mr-1" />
                        Edit
                      </Button>
                    </Link>
                    {/*<Link href={`/dashboard/surveys/${survey.id}/responses`}>
                      <Button variant="outline" size="sm">
                          <PencilLine className="h-4 w-4 mr-1" />
                          Responses
                      </Button>
                    </Link>*/}
                    <Button variant="outline" size="sm" onClick={() => deleteSurvey(survey.id)}>
                      <Trash2 className="h-4 w-4 mr-1" />
                      Delete
                    </Button>
                  </div>
                </CardContent>
            </Card>
            </motion.div>
          ))}
        </div>
      )}
    </div>
  )
}
