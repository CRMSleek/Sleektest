"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ArrowLeft, Loader2, Plus, Trash2 } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { SurveyQuestionBuilder } from "@/components/dashboard/survey-question-builder"

export default function CreateSurveyPage() {
  const router = useRouter()
  const { toast } = useToast()
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [surveyData, setSurveyData] = useState({
    title: "",
    description: "",
    welcomeMessage: "Thank you for taking the time to complete this survey. Your feedback is valuable to us.",
    completionMessage: "Thank you for completing the survey! Your feedback helps us improve our services.",
    questions: [
      {
        id: "q1",
        type: "text",
        question: "What is your name?",
        required: true,
      },
      {
        id: "q2",
        type: "email",
        question: "What is your email address?",
        required: true,
      },
      {
        id: "q3",
        type: "select",
        question: "How did you hear about us?",
        options: ["Social Media", "Friend/Referral", "Search Engine", "Advertisement", "Other"],
        required: false,
      },
    ],
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsSubmitting(true)

    try {
      // This would be replaced with an actual API call
      await new Promise((resolve) => setTimeout(resolve, 1500))

      toast({
        title: "Survey created",
        description: "Your survey has been created successfully.",
      })

      router.push("/dashboard/surveys")
    } catch (error) {
      toast({
        title: "Error",
        description: "There was an error creating your survey.",
        variant: "destructive",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleAddQuestion = () => {
    const newQuestion = {
      id: `q${surveyData.questions.length + 1}`,
      type: "text",
      question: "",
      required: false,
    }

    setSurveyData({
      ...surveyData,
      questions: [...surveyData.questions, newQuestion],
    })
  }

  const handleQuestionChange = (questionId: string, updatedQuestion: any) => {
    setSurveyData({
      ...surveyData,
      questions: surveyData.questions.map((q) => (q.id === questionId ? { ...q, ...updatedQuestion } : q)),
    })
  }

  const handleRemoveQuestion = (questionId: string) => {
    setSurveyData({
      ...surveyData,
      questions: surveyData.questions.filter((q) => q.id !== questionId),
    })
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center gap-4">
        <Button variant="outline" size="icon" onClick={() => router.back()}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Create Survey</h1>
      </div>

      <Tabs defaultValue="details">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="details">Survey Details</TabsTrigger>
          <TabsTrigger value="questions">Questions</TabsTrigger>
          <TabsTrigger value="preview">Preview</TabsTrigger>
        </TabsList>

        <TabsContent value="details" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>Basic Information</CardTitle>
              <CardDescription>Set the title and description for your survey</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Survey Title</Label>
                <Input
                  id="title"
                  placeholder="Enter survey title"
                  value={surveyData.title}
                  onChange={(e) => setSurveyData({ ...surveyData, title: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  placeholder="Enter survey description"
                  rows={3}
                  value={surveyData.description}
                  onChange={(e) => setSurveyData({ ...surveyData, description: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Messages</CardTitle>
              <CardDescription>Customize the welcome and completion messages</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="welcome-message">Welcome Message</Label>
                <Textarea
                  id="welcome-message"
                  rows={3}
                  value={surveyData.welcomeMessage}
                  onChange={(e) => setSurveyData({ ...surveyData, welcomeMessage: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="completion-message">Completion Message</Label>
                <Textarea
                  id="completion-message"
                  rows={3}
                  value={surveyData.completionMessage}
                  onChange={(e) => setSurveyData({ ...surveyData, completionMessage: e.target.value })}
                />
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="questions" className="space-y-6 pt-4">
          <div className="flex justify-end">
            <Button onClick={handleAddQuestion}>
              <Plus className="mr-2 h-4 w-4" />
              Add Question
            </Button>
          </div>

          {surveyData.questions.map((question, index) => (
            <Card key={question.id}>
              <CardHeader className="flex flex-row items-start justify-between">
                <div>
                  <CardTitle className="text-lg">Question {index + 1}</CardTitle>
                  <CardDescription>Configure your survey question</CardDescription>
                </div>
                {surveyData.questions.length > 1 && (
                  <Button variant="outline" size="icon" onClick={() => handleRemoveQuestion(question.id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                )}
              </CardHeader>
              <CardContent>
                <SurveyQuestionBuilder
                  question={question}
                  onChange={(updatedQuestion) => handleQuestionChange(question.id, updatedQuestion)}
                />
              </CardContent>
            </Card>
          ))}
        </TabsContent>

        <TabsContent value="preview" className="space-y-6 pt-4">
          <Card>
            <CardHeader>
              <CardTitle>{surveyData.title || "Survey Title"}</CardTitle>
              <CardDescription>{surveyData.description || "Survey description"}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{surveyData.welcomeMessage}</p>
                </div>

                {surveyData.questions.map((question, index) => (
                  <div key={question.id} className="space-y-2">
                    <Label>
                      {index + 1}. {question.question || "Question text"}
                      {question.required && <span className="text-red-500 ml-1">*</span>}
                    </Label>
                    {question.type === "text" && <Input placeholder="Text input" disabled />}
                    {question.type === "email" && <Input type="email" placeholder="Email input" disabled />}
                    {question.type === "textarea" && <Textarea placeholder="Textarea input" disabled />}
                    {question.type === "select" && (
                      <select className="w-full p-2 border rounded-md" disabled>
                        <option>Select an option</option>
                        {question.options?.map((option, idx) => (
                          <option key={idx}>{option}</option>
                        ))}
                      </select>
                    )}
                  </div>
                ))}

                <div className="p-4 bg-muted rounded-lg">
                  <p className="text-sm">{surveyData.completionMessage}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-4">
        <Button variant="outline" onClick={() => router.back()}>
          Cancel
        </Button>
        <Button onClick={handleSubmit} disabled={isSubmitting}>
          {isSubmitting ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Creating...
            </>
          ) : (
            "Create Survey"
          )}
        </Button>
      </div>
    </div>
  )
}
