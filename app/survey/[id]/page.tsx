"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle } from "lucide-react"

interface Question {
  id: string
  type: "text" | "email" | "number" | "select" | "textarea"
  question: string
  required: boolean
  options?: string[]
}

interface Survey {
  id: string
  title: string
  description?: string
  questions: Question[]
}

export default function PublicSurveyPage({ params }: { params: { id: string } }) {
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [customerInfo, setCustomerInfo] = useState({
    name: "",
    email: "",
    phone: "",
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    fetchSurvey()
  }, [params.id])

  const fetchSurvey = async () => {
    try {
      const response = await fetch(`/api/surveys/public/${params.id}`)
      if (response.ok) {
        const data = await response.json()
        setSurvey(data.survey)
      } else {
        setError("Survey not found")
      }
    } catch (error) {
      console.error("Fetch survey error:", error)
      setError("Failed to load survey")
    } finally {
      setLoading(false)
    }
  }

  const handleAnswerChange = (questionId: string, value: string) => {
    setAnswers((prev) => ({
      ...prev,
      [questionId]: value,
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!survey) return

    // Validate required questions
    const missingAnswers = survey.questions.filter((q) => q.required && !answers[q.id]?.trim()).map((q) => q.question)

    if (missingAnswers.length > 0) {
      alert(`Please answer the following required questions:\n${missingAnswers.join("\n")}`)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/surveys/${params.id}/responses`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          answers,
          customerInfo: customerInfo.email ? customerInfo : null,
        }),
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        const error = await response.json()
        alert(error.error || "Failed to submit survey")
      }
    } catch (error) {
      console.error("Submit survey error:", error)
      alert("Failed to submit survey")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
          <p>Loading survey...</p>
        </div>
      </div>
    )
  }

  if (error) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Card className="w-full max-w-md">
          <CardContent className="p-6 text-center">
            <p className="text-red-500 mb-4">{error}</p>
            <Button onClick={() => window.location.reload()}>Try Again</Button>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (submitted) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <Card className="w-full max-w-md">
          <CardContent className="p-8 text-center">
            <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
            <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
            <p className="text-gray-600">Your response has been submitted successfully.</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  if (!survey) return null

  return (
    <div className="min-h-screen bg-gray-50 py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">{survey.title}</CardTitle>
            {survey.description && <p className="text-gray-600">{survey.description}</p>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Customer Info Section */}
              <div className="border-b pb-6">
                <h3 className="font-medium mb-4">Contact Information (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <Input
                      value={customerInfo.name}
                      onChange={(e) => setCustomerInfo((prev) => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input
                      type="email"
                      value={customerInfo.email}
                      onChange={(e) => setCustomerInfo((prev) => ({ ...prev, email: e.target.value }))}
                      placeholder="your@email.com"
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-sm font-medium mb-2">Phone</label>
                    <Input
                      value={customerInfo.phone}
                      onChange={(e) => setCustomerInfo((prev) => ({ ...prev, phone: e.target.value }))}
                      placeholder="Your phone number"
                    />
                  </div>
                </div>
              </div>

              {/* Survey Questions */}
              {survey.questions.map((question, index) => (
                <div key={question.id} className="space-y-2">
                  <label className="block text-sm font-medium">
                    {index + 1}. {question.question}
                    {question.required && <span className="text-red-500 ml-1">*</span>}
                  </label>

                  {question.type === "text" && (
                    <Input
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      required={question.required}
                    />
                  )}

                  {question.type === "email" && (
                    <Input
                      type="email"
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      required={question.required}
                    />
                  )}

                  {question.type === "number" && (
                    <Input
                      type="number"
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      required={question.required}
                    />
                  )}

                  {question.type === "textarea" && (
                    <Textarea
                      value={answers[question.id] || ""}
                      onChange={(e) => handleAnswerChange(question.id, e.target.value)}
                      required={question.required}
                      rows={4}
                    />
                  )}

                  {question.type === "select" && question.options && (
                    <Select
                      value={answers[question.id] || ""}
                      onValueChange={(value) => handleAnswerChange(question.id, value)}
                      required={question.required}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {question.options.map((option, optionIndex) => (
                          <SelectItem key={optionIndex} value={option}>
                            {option}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  )}
                </div>
              ))}

              <Button type="submit" className="w-full" disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Survey"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
