"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import SurveyBuilder from "@/components/survey-builder"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"

interface Question {
  id: string
  type: "text" | "email" | "number" | "select" | "textarea" | "satisfaction"
  question: string
  required: boolean
  options?: string[]
  satisfactionPrompt?: string
}

interface Survey {
  id: string
  title: string
  description?: string
  questions: Question[]
}

export default function EditSurveyPage() {
  const params = useParams()
  const router = useRouter()
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState("")

  useEffect(() => {
    if (params.id) {
      fetchSurvey(params.id as string)
    }
  }, [params.id])

  const fetchSurvey = async (id: string) => {
    try {
      const response = await fetch(`/api/surveys/${id}`)
      if (response.ok) {
        const data = await response.json()
        setSurvey(data.survey)
      } else {
        setError("Failed to fetch survey")
      }
    } catch (error) {
      console.error("Fetch survey error:", error)
      setError("Failed to fetch survey")
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <div className="h-8 w-48 bg-gray-200 rounded animate-pulse" />
        <div className="h-64 bg-gray-200 rounded animate-pulse" />
      </div>
    )
  }

  if (error || !survey) {
    return (
      <div className="p-6 space-y-6">
        <div className="flex items-center gap-4">
          <Link href="/dashboard/surveys">
            <Button variant="ghost" size="icon">
              <ArrowLeft className="h-4 w-4" />
            </Button>
          </Link>
          <div>
            <h1 className="text-3xl font-bold">Edit Survey</h1>
            <p className="text-muted-foreground">Edit your survey questions and settings</p>
          </div>
        </div>
        
        <Card>
          <CardContent className="p-12 text-center">
            <p className="text-red-500 mb-4">{error || "Survey not found"}</p>
            <Button onClick={() => router.push("/dashboard/surveys")}>
              Back to Surveys
            </Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4 px-6 pt-6">
        <Link href="/dashboard/surveys">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-3xl font-bold">Edit Survey</h1>
          <p className="text-muted-foreground">Edit your survey questions and settings</p>
        </div>
      </div>
      
      <SurveyBuilder initialSurvey={survey} />
    </div>
  )
} 