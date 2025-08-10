"use client"

import { useParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { ArrowLeft, Mail, MapPin, Phone } from "lucide-react"
import Link from "next/link"
import { motion } from 'framer-motion'

// Mock data for a customer profile
const customerProfiles = {
  "1": {
    id: "1",
    name: "Alice Johnson",
    email: "alice.johnson@example.com",
    phone: "+1 (555) 123-4567",
    location: "New York, USA",
    age: 34,
    joinedDate: "May 10, 2025",
    preferences: {
      productInterests: ["Premium Plan", "Mobile App"],
      communicationPreference: "Email",
      frequency: "Weekly",
    },
    surveyResponses: [
      {
        id: "sr1",
        surveyName: "Customer Satisfaction",
        date: "June 15, 2025",
        rating: 4.5,
        feedback:
          "Great service overall. The mobile app could use some improvements in the user interface, but the core functionality works well.",
      },
      {
        id: "sr2",
        surveyName: "Product Feedback",
        date: "May 20, 2025",
        rating: 4.0,
        feedback:
          "I like the new features added in the latest update. Would love to see more customization options in the future.",
      },
    ],
    notes:
      "Alice is a loyal customer who has been with us since the beginning. She prefers email communication and is interested in our premium offerings.",
  },
}

export default function CustomerProfilePage() {
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  }
  const fade = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.7 } },
  }
  const { id } = useParams()
  const customerId = typeof id === "string" ? id : id[0]
  const customer = customerProfiles[customerId as keyof typeof customerProfiles]

  if (!customer) {
    return (
      <div className="flex flex-col items-center justify-center h-[50vh]">
        <h1 className="text-2xl font-bold mb-4">Customer not found</h1>
        <Button asChild>
          <Link href="/dashboard/customers">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Customers
          </Link>
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6 m-6">
        <motion.div initial="hidden" animate="visible" variants={fade} transition={{ duration: 0.6 }} className="flex items-center gap-4">
        <Button variant="outline" size="icon" asChild>
          <Link href="/dashboard/customers">
            <ArrowLeft className="h-4 w-4" />
          </Link>
        </Button>
        <h1 className="text-3xl font-bold tracking-tight">Customer Profile</h1>
      </motion.div>

      <div className="grid gap-6 md:grid-cols-7">
       <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ duration: 0.6 }} className="md:col-span-2">
        <Card className="md:col-span-2 h-full">
        
          <CardHeader>
            <div className="flex flex-col items-center space-y-4">
              <Avatar className="h-24 w-24">
                <AvatarFallback className="text-2xl">
                  {customer.name
                    .split(" ")
                    .map((n) => n[0])
                    .join("")}
                </AvatarFallback>
              </Avatar>
              <div className="space-y-1 text-center">
                <h2 className="text-2xl font-bold">{customer.name}</h2>
                <p className="text-sm text-muted-foreground">Customer since {customer.joinedDate}</p>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="flex items-center gap-3">
                <Mail className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.email}</span>
              </div>
              <div className="flex items-center gap-3">
                <Phone className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.phone}</span>
              </div>
              <div className="flex items-center gap-3">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                <span className="text-sm">{customer.location}</span>
              </div>
              <div className="pt-4">
                <Button className="w-full">Send Survey</Button>
              </div>
            </div>
          </CardContent>
        </Card>
        </motion.div>
        

        <div className="md:col-span-5 space-y-6">
          <Tabs defaultValue="overview">
            <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.12, duration: 0.6 }}>
            <TabsList className="grid w-full grid-cols-3">
              <TabsTrigger value="overview">Overview</TabsTrigger>
              <TabsTrigger value="surveys">Survey Responses</TabsTrigger>
              <TabsTrigger value="preferences">Preferences</TabsTrigger>
            </TabsList>
            </motion.div>
            <TabsContent value="overview" className="space-y-6 pt-4">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.24, duration: 0.6 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Customer Summary</CardTitle>
                  <CardDescription>Key information about {customer.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">Age</h3>
                      <p>{customer.age} years old</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Location</h3>
                      <p>{customer.location}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Notes</h3>
                      <p className="text-sm text-muted-foreground">{customer.notes}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
              <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.36, duration: 0.6 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Recent Activity</CardTitle>
                  <CardDescription>Latest interactions with {customer.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    {customer.surveyResponses.map((response) => (
                      <div key={response.id} className="border-b pb-4 last:border-0 last:pb-0">
                        <div className="flex items-center justify-between">
                          <h3 className="font-medium">{response.surveyName}</h3>
                          <span className="text-sm text-muted-foreground">{response.date}</span>
                        </div>
                        <p className="text-sm mt-1">Rating: {response.rating}/5</p>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            </TabsContent>
            

            <TabsContent value="surveys" className="space-y-6 pt-4">
              {customer.surveyResponses.map((response, i) => (
                <motion.div key={i} initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.06 * i, duration: 0.4 }}>
                  <Card key={response.id}>
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <CardTitle>{response.surveyName}</CardTitle>
                        <span className="text-sm text-muted-foreground">{response.date}</span>
                      </div>
                      <CardDescription>Rating: {response.rating}/5</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <p className="text-sm">{response.feedback}</p>
                    </CardContent>
                  </Card>
                </motion.div>
              ))}
            </TabsContent>

            <TabsContent value="preferences" className="space-y-6 pt-4">
              <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.12, duration: 0.6 }}>
              <Card>
                <CardHeader>
                  <CardTitle>Customer Preferences</CardTitle>
                  <CardDescription>Preferences and interests for {customer.name}</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-4">
                    <div>
                      <h3 className="font-medium">Product Interests</h3>
                      <div className="flex flex-wrap gap-2 mt-2">
                        {customer.preferences.productInterests.map((interest) => (
                          <div key={interest} className="rounded-full bg-secondary px-3 py-1 text-xs">
                            {interest}
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h3 className="font-medium">Communication Preference</h3>
                      <p>{customer.preferences.communicationPreference}</p>
                    </div>
                    <div>
                      <h3 className="font-medium">Contact Frequency</h3>
                      <p>{customer.preferences.frequency}</p>
                    </div>
                  </div>
                </CardContent>
              </Card>
              </motion.div>
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  )
}
