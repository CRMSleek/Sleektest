"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Trash2, Save, CheckCircle } from "lucide-react"
import { useRouter } from "next/navigation"

interface Question {
  id: string
  type: "text" | "email" | "number" | "select" | "textarea" | "satisfaction"
  question: string
  required: boolean
  options?: string[]
  satisfactionPrompt?: string
}

interface SurveyBuilderProps {
  initialSurvey?: {
    id?: string
    title: string
    description?: string
    questions: Question[]
  }
}

export default function SurveyBuilder({ initialSurvey }: SurveyBuilderProps) {
  const router = useRouter()
  const [title, setTitle] = useState(initialSurvey?.title || "")
  const [description, setDescription] = useState(initialSurvey?.description || "")
  const [questions, setQuestions] = useState<Question[]>(initialSurvey?.questions || [])
  const [saving, setSaving] = useState(false)

  const addQuestion = () => {
    const newQuestion: Question = {
      id: Math.random().toString(36).substr(2, 9),
      type: "text",
      question: "",
      required: false,
    }
    setQuestions([...questions, newQuestion])
  }

  const updateQuestion = (id: string, updates: Partial<Question>) => {
    setQuestions(questions.map((q) => (q.id === id ? { ...q, ...updates } : q)))
  }

  const removeQuestion = (id: string) => {
    setQuestions(questions.filter((q) => q.id !== id))
  }

  const addOption = (questionId: string) => {
    updateQuestion(questionId, {
      options: [...(questions.find((q) => q.id === questionId)?.options || []), ""],
    })
  }

  const updateOption = (questionId: string, optionIndex: number, value: string) => {
    const question = questions.find((q) => q.id === questionId)
    if (question?.options) {
      const newOptions = [...question.options]
      newOptions[optionIndex] = value
      updateQuestion(questionId, { options: newOptions })
    }
  }

  const removeOption = (questionId: string, optionIndex: number) => {
    const question = questions.find((q) => q.id === questionId)
    if (question?.options) {
      const newOptions = question.options.filter((_, i) => i !== optionIndex)
      updateQuestion(questionId, { options: newOptions })
    }
  }

  const saveSurvey = async () => {
    if (!title.trim()) {
      alert("Please enter a survey title")
      return
    }

    if (questions.length === 0) {
      alert("Please add at least one question")
      return
    }

    // Validate questions
    for (const question of questions) {
      if (!question.question.trim()) {
        alert("Please fill in all question texts")
        return
      }
      if (question.type === "select" && (!question.options || question.options.length === 0)) {
        alert("Please add options for multiple choice questions")
        return
      }
      if (question.type === "satisfaction" && !question.satisfactionPrompt?.trim()) {
        alert("Please add a satisfaction prompt for satisfaction questions")
        return
      }
    }

    setSaving(true)
    try {
      const url = initialSurvey?.id ? `/api/surveys/${initialSurvey.id}` : "/api/surveys"
      const method = initialSurvey?.id ? "PUT" : "POST"

      const response = await fetch(url, {
        method,
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          title,
          description,
          questions,
        }),
      })

      if (response.ok) {
        router.push("/dashboard/surveys")
        router.refresh()
      } else {
        const error = await response.json()
        alert(error.error || "Failed to save survey")
      }
    } catch (error) {
      console.error("Save survey error:", error)
      alert("Failed to save survey")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="max-w-4xl mx-auto p-6 space-y-6">
      <div className="flex justify-between items-center">
        <h1 className="text-3xl font-bold">{initialSurvey?.id ? "Edit Survey" : "Create Survey"}</h1>
        <Button onClick={saveSurvey} disabled={saving}>
          <Save className="h-4 w-4 mr-2" />
          {saving ? "Saving..." : "Save Survey"}
        </Button>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Survey Details</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-sm font-medium mb-2">Title *</label>
            <Input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="Enter survey title" />
          </div>
          <div>
            <label className="block text-sm font-medium mb-2">Description</label>
            <Textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Enter survey description (optional)"
            />
          </div>
        </CardContent>
      </Card>

      <div className="space-y-4">
        <div className="flex justify-between items-center">
          <h2 className="text-xl font-semibold">Questions</h2>
          <Button onClick={addQuestion}>
            <Plus className="h-4 w-4 mr-2" />
            Add Question
          </Button>
        </div>

        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardContent className="p-6 space-y-4">
              <div className="flex justify-between items-start">
                <h3 className="font-medium">Question {index + 1}</h3>
                <Button variant="outline" size="sm" onClick={() => removeQuestion(question.id)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium mb-2">Question Text *</label>
                  <Input
                    value={question.question}
                    onChange={(e) => updateQuestion(question.id, { question: e.target.value })}
                    placeholder="Enter your question"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium mb-2">Question Type</label>
                  <Select
                    value={question.type}
                    onValueChange={(value: Question["type"]) => updateQuestion(question.id, { type: value })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="text">Short Text</SelectItem>
                      <SelectItem value="textarea">Long Text</SelectItem>
                      <SelectItem value="email">Email</SelectItem>
                      <SelectItem value="number">Number</SelectItem>
                      <SelectItem value="select">Multiple Choice</SelectItem>
                      <SelectItem value="satisfaction">Satisfaction Rating</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {question.type === "satisfaction" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Satisfaction Prompt *</label>
                  <Input
                    value={question.satisfactionPrompt || ""}
                    onChange={(e) => updateQuestion(question.id, { satisfactionPrompt: e.target.value })}
                    placeholder="e.g., How satisfied are you with our service?"
                  />
                  <p className="text-sm text-muted-foreground mt-1">
                    This will be displayed above the satisfaction rating options
                  </p>
                </div>
              )}

              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={`required-${question.id}`}
                  checked={question.required}
                  onChange={(e) => updateQuestion(question.id, { required: e.target.checked })}
                />
                <label htmlFor={`required-${question.id}`} className="text-sm">
                  Required question
                </label>
              </div>

              {question.type === "select" && (
                <div>
                  <label className="block text-sm font-medium mb-2">Options</label>
                  <div className="space-y-2">
                    {question.options?.map((option, optionIndex) => (
                      <div key={optionIndex} className="flex gap-2">
                        <Input
                          value={option}
                          onChange={(e) => updateOption(question.id, optionIndex, e.target.value)}
                          placeholder={`Option ${optionIndex + 1}`}
                        />
                        <Button variant="outline" size="sm" onClick={() => removeOption(question.id, optionIndex)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    ))}
                    <Button variant="outline" size="sm" onClick={() => addOption(question.id)}>
                      <Plus className="h-4 w-4 mr-2" />
                      Add Option
                    </Button>
                  </div>
                </div>
              )}

              {question.type === "satisfaction" && (
                <div className="bg-blue-50 p-4 rounded-lg">
                  <div className="flex items-center gap-2 mb-2">
                    <CheckCircle className="h-4 w-4 text-blue-600" />
                    <span className="text-sm font-medium text-blue-800">Satisfaction Rating Preview</span>
                  </div>
                  <p className="text-sm text-blue-700">
                    Customers will see: "{question.satisfactionPrompt || "How satisfied are you?"}"
                  </p>
                  <p className="text-sm text-blue-600 mt-1">
                    Rating options: Very Dissatisfied, Dissatisfied, Neutral, Satisfied, Very Satisfied
                  </p>
                </div>
              )}
            </CardContent>
          </Card>
        ))}

        {questions.length === 0 && (
          <Card>
            <CardContent className="p-12 text-center">
              <p className="text-gray-500 mb-4">No questions added yet</p>
              <Button onClick={addQuestion}>
                <Plus className="h-4 w-4 mr-2" />
                Add Your First Question
              </Button>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
