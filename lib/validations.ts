import { z } from "zod"

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const registerSchema = z.object({
  name: z.string().min(2, "Name must be at least 2 characters"),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
})

export const surveySchema = z.object({
  title: z.string().min(1, "Title is required"),
  description: z.string().optional(),
  welcomeMessage: z.string().min(1, "Welcome message is required"),
  completionMessage: z.string().min(1, "Completion message is required"),
  questions: z
    .array(
      z.object({
        id: z.string(),
        type: z.enum(["text", "email", "textarea", "select", "radio", "checkbox"]),
        question: z.string().min(1, "Question is required"),
        required: z.boolean(),
        options: z.array(z.string()).optional(),
      }),
    )
    .min(1, "At least one question is required"),
})

export const relationshipTypes = ["customer", "lead", "partner", "vendor", "supplier", "contractor", "affiliate", "other"] as const

export const customerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  email: z.string().email("Invalid email address"),
  phone: z.string().optional(),
  location: z.string().optional(),
  age: z.number().min(1).max(120).optional(),
  notes: z.string().optional(),
  relationship_type: z.enum(relationshipTypes).optional().default("customer"),
})

export const emailAutoAssignmentRuleSchema = z.object({
  sender_email: z.string().email("Invalid email address"),
  relationship_id: z.string().min(1, "Relationship is required"),
  is_active: z.boolean().optional().default(true),
})

export const businessSettingsSchema = z.object({
  name: z.string().min(1, "Business name is required"),
  email: z.string().email("Invalid email address"),
  website: z.string().url().optional().or(z.literal("")),
  description: z.string().optional(),
  phone: z.string().optional(),
  address: z.string().optional(),
})
