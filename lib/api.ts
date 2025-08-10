// API utilities and types
export interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  location?: string
  age?: number
  joinedDate: string
  lastSurvey?: string
  preferences?: {
    productInterests: string[]
    communicationPreference: string
    frequency: string
  }
  notes?: string
}

export interface Survey {
  id: string
  title: string
  description: string
  status: "draft" | "active" | "completed"
  responses: number
  created: string
  expires: string
  welcomeMessage: string
  completionMessage: string
  questions: SurveyQuestion[]
}

export interface SurveyQuestion {
  id: string
  type: "text" | "email" | "textarea" | "select" | "radio" | "checkbox"
  question: string
  required: boolean
  options?: string[]
}

export interface SurveyResponse {
  id: string
  surveyId: string
  customerId: string
  responses: Record<string, any>
  submittedAt: string
}

// Mock API functions
export async function getCustomers(): Promise<Customer[]> {
  // This would be replaced with actual API calls
  await new Promise((resolve) => setTimeout(resolve, 500))

  return [
    {
      id: "1",
      name: "John Smith",
      email: "john.smith@example.com",
      location: "New York, USA",
      age: 34,
      joinedDate: "May 10, 2025",
      lastSurvey: "June 15, 2025",
    },
    // Add more mock customers...
  ]
}

export async function getCustomer(id: string): Promise<Customer | null> {
  // This would be replaced with actual API calls
  await new Promise((resolve) => setTimeout(resolve, 500))

  // Return mock customer data
  return null
}

export async function getSurveys(): Promise<Survey[]> {
  // This would be replaced with actual API calls
  await new Promise((resolve) => setTimeout(resolve, 500))

  return []
}

export async function createSurvey(surveyData: Partial<Survey>): Promise<Survey> {
  // This would be replaced with actual API calls
  await new Promise((resolve) => setTimeout(resolve, 1000))

  return {
    id: Date.now().toString(),
    title: surveyData.title || "",
    description: surveyData.description || "",
    status: "draft",
    responses: 0,
    created: new Date().toLocaleDateString(),
    expires: "Not published",
    welcomeMessage: surveyData.welcomeMessage || "",
    completionMessage: surveyData.completionMessage || "",
    questions: surveyData.questions || [],
  }
}

export async function submitSurveyResponse(surveyId: string, responses: Record<string, any>): Promise<void> {
  // This would be replaced with actual API calls
  await new Promise((resolve) => setTimeout(resolve, 1000))

  // Create customer profile from survey response
  console.log("Creating customer profile from survey response:", { surveyId, responses })
}
