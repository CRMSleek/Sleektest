"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { CheckCircle, Star } from "lucide-react"

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

interface Answer {
  id: string
  name: string
  type: string
  value: string
}

export default function PublicSurveyPage({ params }: { params: Promise<{ id: string }> }) {
  const [id, setId] = useState<string>("")
  const [survey, setSurvey] = useState<Survey | null>(null)
  const [answers, setAnswers] = useState<Record<string, Answer>>({})
  const [customerInfo, setCustomerInfo] = useState({ name: "", email: "", phone: "" })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [error, setError] = useState("")

  useEffect(() => {
    const unwrapParams = async () => {
      const resolved = await params
      setId(resolved.id)
    }
    unwrapParams()
  }, [params])

  useEffect(() => {
    if (!id) return

    const fetchSurvey = async () => {
      try {
        const response = await fetch(`/api/surveys/public/${id}`)
        if (response.ok) {
          const data = await response.json()
          setSurvey(data.survey)

          // Track survey open
          try {
            await fetch(`/api/surveys/${id}/open`, { method: 'POST' })
          } catch (err) {
            console.error("Failed to track survey open:", err)
          }
        } else {
          setError("Survey not found")
        }
      } catch (err) {
        console.error("Fetch survey error:", err)
        setError("Failed to load survey")
      } finally {
        setLoading(false)
      }
    }

    fetchSurvey()
  }, [id])

  const handleAnswerChange = (question: Question, value: string) => {
    setAnswers(prev => ({
      ...prev,
      [question.id]: { id: question.id, name: question.question, type: question.type, value }
    }))
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!survey) return

    const missingAnswers = survey.questions
      .filter(q => q.required && !answers[q.id]?.value?.trim())
      .map(q => q.question)

    if (missingAnswers.length > 0) {
      alert(`Please answer the following required questions:\n${missingAnswers.join("\n")}`)
      return
    }

    setSubmitting(true)
    try {
      const response = await fetch(`/api/surveys/${id}/responses`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ answers, customerInfo: customerInfo.email ? customerInfo : null }),
      })

      if (response.ok) {
        setSubmitted(true)
      } else {
        const errorData = await response.json()
        alert(errorData.error || "Failed to submit survey")
      }
    } catch (err) {
      console.error("Submit survey error:", err)
      alert("Failed to submit survey")
    } finally {
      setSubmitting(false)
    }
  }

  const renderQuestion = (question: Question) => {
    const value = answers[question.id]?.value || ""
    const commonProps = {
      id: question.id,
      value,
      onChange: (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
        handleAnswerChange(question, e.target.value),
      required: question.required,
      className: "w-full",
    }

    switch (question.type) {
      case "text":
        return <Input {...commonProps} placeholder="Enter your answer" />
      case "email":
        return <Input {...commonProps} type="email" placeholder="Enter your email" />
      case "number":
        return <Input {...commonProps} type="number" placeholder="Enter a number" />
      case "textarea":
        return <Textarea {...commonProps} rows={4} placeholder="Enter your answer" />
      case "select":
        return (
          <Select value={value} onValueChange={(val) => handleAnswerChange(question, val)}>
            <SelectTrigger>
              <SelectValue placeholder="Select an option" />
            </SelectTrigger>
            <SelectContent>
              {question.options?.map((opt, i) => (
                <SelectItem key={i} value={opt}>{opt}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        )
      case "satisfaction":
        return (
          <div className="space-y-3">
            {question.satisfactionPrompt && <p className="text-sm text-muted-foreground">{question.satisfactionPrompt}</p>}
            <div className="flex gap-2">
              {["1","2","3","4","5"].map(rating => (
                <Button
                  key={rating}
                  type="button"
                  variant={value === rating ? "default" : "outline"}
                  size="sm"
                  onClick={() => handleAnswerChange(question, rating)}
                  className="flex flex-col items-center gap-1 h-auto py-2 px-3"
                >
                  <Star className={`h-4 w-4 ${value === rating ? "text-yellow-400" : "text-gray-400"}`} />
                  <span className="text-xs">{rating}</span>
                </Button>
              ))}
            </div>
          </div>
        )
      default:
        return <Input {...commonProps} placeholder="Enter your answer" />
    }
  }

  if (loading) return (
    <div className="min-h-screen flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mx-auto mb-4"></div>
        <p>Loading survey...</p>
      </div>
    </div>
  )

  if (error) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <p className="text-red-500 mb-4">{error}</p>
          <Button onClick={() => window.location.reload()}>Try Again</Button>
        </CardContent>
      </Card>
    </div>
  )

  if (submitted) return (
    <div className="min-h-screen flex items-center justify-center">
      <Card className="w-full max-w-md">
        <CardContent className="p-6 text-center">
          <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold mb-2">Thank You!</h2>
          <p className="text-muted-foreground mb-4">Your survey response has been submitted successfully.</p>
          <Button onClick={() => window.close()}>Close</Button>
        </CardContent>
      </Card>
    </div>
  )

  if (!survey) return null

  return (
    <div className="min-h-screen py-8">
      <div className="max-w-2xl mx-auto px-4">
        <Card>
          <CardHeader className="text-center">
            <CardTitle className="text-2xl">{survey.title}</CardTitle>
            {survey.description && <p className="text-muted-foreground">{survey.description}</p>}
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-6">
              {survey.questions.map((question, index) => (
                <div key={question.id} className="space-y-3">
                  <div className="flex items-start gap-2">
                    <span className="text-sm font-medium text-muted-foreground">{index + 1}.</span>
                    <div className="flex-1">
                      <label htmlFor={question.id} className="block text-sm font-medium mb-2">
                        {question.question}
                        {question.required && <span className="text-red-500 ml-1">*</span>}
                      </label>
                      {renderQuestion(question)}
                    </div>
                  </div>
                </div>
              ))}

              <div className="border-t pt-6">
                <h3 className="text-lg font-medium mb-4">Your Information (Optional)</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium mb-2">Name</label>
                    <Input
                      value={customerInfo.name}
                      onChange={e => setCustomerInfo(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Your name"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium mb-2">Email</label>
                    <Input
                      type="email"
                      value={customerInfo.email}
                      onChange={e => setCustomerInfo(prev => ({ ...prev, email: e.target.value }))}
                      placeholder="your.email@example.com"
                    />
                  </div>
                </div>
                <div className="mt-4">
                  <label className="block text-sm font-medium mb-2">Phone</label>
                  <Input
                    value={customerInfo.phone}
                    onChange={e => setCustomerInfo(prev => ({ ...prev, phone: e.target.value }))}
                    placeholder="Your phone number"
                  />
                </div>
              </div>

              <Button type="submit" disabled={submitting} className="w-full" size="lg">
                {submitting ? "Submitting..." : "Submit Survey"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}