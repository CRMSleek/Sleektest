"use client"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Plus, Trash2 } from "lucide-react"

interface Question {
  id: string
  type: string
  question: string
  required: boolean
  options?: string[]
}

interface SurveyQuestionBuilderProps {
  question: Question
  onChange: (updatedQuestion: Partial<Question>) => void
}

export function SurveyQuestionBuilder({ question, onChange }: SurveyQuestionBuilderProps) {
  const handleAddOption = () => {
    const newOptions = [...(question.options || []), ""]
    onChange({ options: newOptions })
  }

  const handleOptionChange = (index: number, value: string) => {
    const newOptions = [...(question.options || [])]
    newOptions[index] = value
    onChange({ options: newOptions })
  }

  const handleRemoveOption = (index: number) => {
    const newOptions = question.options?.filter((_, i) => i !== index) || []
    onChange({ options: newOptions })
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor={`question-${question.id}`}>Question Text</Label>
        <Input
          id={`question-${question.id}`}
          placeholder="Enter your question"
          value={question.question}
          onChange={(e) => onChange({ question: e.target.value })}
        />
      </div>

      <div className="space-y-2">
        <Label htmlFor={`type-${question.id}`}>Question Type</Label>
        <Select value={question.type} onValueChange={(value) => onChange({ type: value })}>
          <SelectTrigger>
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="text">Text Input</SelectItem>
            <SelectItem value="email">Email Input</SelectItem>
            <SelectItem value="textarea">Long Text</SelectItem>
            <SelectItem value="select">Multiple Choice</SelectItem>
            <SelectItem value="radio">Radio Buttons</SelectItem>
            <SelectItem value="checkbox">Checkboxes</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {(question.type === "select" || question.type === "radio" || question.type === "checkbox") && (
        <div className="space-y-2">
          <Label>Options</Label>
          <div className="space-y-2">
            {question.options?.map((option, index) => (
              <div key={index} className="flex gap-2">
                <Input
                  placeholder={`Option ${index + 1}`}
                  value={option}
                  onChange={(e) => handleOptionChange(index, e.target.value)}
                />
                <Button type="button" variant="outline" size="icon" onClick={() => handleRemoveOption(index)}>
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            ))}
            <Button type="button" variant="outline" onClick={handleAddOption} className="w-full">
              <Plus className="mr-2 h-4 w-4" />
              Add Option
            </Button>
          </div>
        </div>
      )}

      <div className="flex items-center space-x-2">
        <Switch
          id={`required-${question.id}`}
          checked={question.required}
          onCheckedChange={(checked) => onChange({ required: checked })}
        />
        <Label htmlFor={`required-${question.id}`}>Required question</Label>
      </div>
    </div>
  )
}
