import { PrismaClient } from "@prisma/client"
import bcrypt from "bcryptjs"

const prisma = new PrismaClient()

async function main() {
  // Create a sample business
  const business = await prisma.business.create({
    data: {
      name: "Demo Business",
      email: "demo@sleekcrm.com",
      description: "A demo business for testing SleekCRM",
      website: "https://demo.sleekcrm.com",
      phone: "+1 (555) 123-4567",
      address: "123 Demo Street, Demo City, DC 12345",
    },
  })

  // Create a demo user
  const hashedPassword = await bcrypt.hash("demo123", 12)
  const user = await prisma.user.create({
    data: {
      email: "demo@sleekcrm.com",
      name: "Demo User",
      passwordHash: hashedPassword,
      businessId: business.id,
    },
  })

  // Create sample customers
  const customers = await Promise.all([
    prisma.customer.create({
      data: {
        businessId: business.id,
        name: "John Smith",
        email: "john.smith@example.com",
        phone: "+1 (555) 234-5678",
        location: "New York, NY",
        age: 34,
        preferences: {
          productInterests: ["Premium Plan", "Mobile App"],
          communicationPreference: "Email",
          frequency: "Weekly",
        },
        notes: "Interested in premium features and mobile solutions",
      },
    }),
    prisma.customer.create({
      data: {
        businessId: business.id,
        name: "Sarah Johnson",
        email: "sarah.j@example.com",
        phone: "+1 (555) 345-6789",
        location: "Los Angeles, CA",
        age: 28,
        preferences: {
          productInterests: ["Basic Plan"],
          communicationPreference: "SMS",
          frequency: "Monthly",
        },
        notes: "Price-conscious customer, prefers text communication",
      },
    }),
  ])

  // Create a sample survey
  const survey = await prisma.survey.create({
    data: {
      businessId: business.id,
      title: "Customer Satisfaction Survey",
      description: "Help us improve our services by sharing your feedback",
      status: "ACTIVE",
      welcomeMessage: "Thank you for taking the time to complete this survey. Your feedback is valuable to us.",
      completionMessage: "Thank you for completing the survey! Your feedback helps us improve our services.",
      questions: [
        {
          id: "q1",
          type: "text",
          question: "What is your full name?",
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
          question: "What is your location?",
          options: ["New York", "Los Angeles", "Chicago", "Miami", "Seattle", "Other"],
          required: false,
        },
        {
          id: "q4",
          type: "radio",
          question: "How would you rate our service overall?",
          options: ["Excellent", "Good", "Average", "Poor", "Very Poor"],
          required: true,
        },
        {
          id: "q5",
          type: "textarea",
          question: "What improvements would you like to see?",
          required: false,
        },
      ],
    },
  })

  // Create sample survey responses
  await Promise.all([
    prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        customerId: customers[0].id,
        responses: {
          q1: "John Smith",
          q2: "john.smith@example.com",
          q3: "New York",
          q4: "Excellent",
          q5: "Great service overall! Keep up the good work.",
        },
      },
    }),
    prisma.surveyResponse.create({
      data: {
        surveyId: survey.id,
        customerId: customers[1].id,
        responses: {
          q1: "Sarah Johnson",
          q2: "sarah.j@example.com",
          q3: "Los Angeles",
          q4: "Good",
          q5: "Could improve response times, but overall satisfied.",
        },
      },
    }),
  ])

  console.log("Database seeded successfully!")
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
