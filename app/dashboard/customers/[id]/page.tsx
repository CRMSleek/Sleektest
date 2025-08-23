"use client"

import { useState, useEffect } from "react"
import { useParams, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { useToast } from "@/components/ui/use-toast"
import { ArrowLeft, Edit, Save, X, Calendar, MapPin, Phone, Mail, User } from "lucide-react"
import Link from "next/link"

interface Customer {
  id: string
  name: string
  email: string
  phone?: string
  location?: string
  age?: number
  notes?: string
  createdAt: string
  responses: Array<{
    id: string
    survey: { title: string }
    submittedAt: string
    answers: any
  }>
}

export default function CustomerDetailPage() {
  const params = useParams()
  const router = useRouter()
  const { toast } = useToast()
  const [customer, setCustomer] = useState<Customer | null>(null)
  const [loading, setLoading] = useState(true)
  const [editing, setEditing] = useState(false)
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    location: "",
    age: "",
    notes: "",
  })

  useEffect(() => {
    if (params.id) {
      fetchCustomer(params.id as string)
    }
  }, [params.id])

  const fetchCustomer = async (id: string) => {
    try {
      const response = await fetch(`/api/customers/${id}`)
      if (response.ok) {
        const data = await response.json()
        setCustomer(data.customer)
        setFormData({
          name: data.customer.name || "",
          email: data.customer.email || "",
          phone: data.customer.phone || "",
          location: data.customer.location || "",
          age: data.customer.age?.toString() || "",
          notes: data.customer.notes || "",
        })
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch customer",
          variant: "destructive",
        })
        router.push("/dashboard/customers")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch customer",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const response = await fetch(`/api/customers/${customer!.id}`, {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          ...formData,
          age: formData.age ? parseInt(formData.age) : undefined,
        }),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Customer updated successfully",
        })
        setEditing(false)
        fetchCustomer(customer!.id)
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to update customer")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to update customer",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleChange = (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }

  const handleDelete = async () => {
    if (!confirm("Are you sure you want to delete this customer? This action cannot be undone.")) {
      return
    }

    try {
      const response = await fetch(`/api/customers/${customer!.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Customer deleted successfully",
        })
        router.push("/dashboard/customers")
      } else {
        throw new Error("Failed to delete customer")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete customer",
        variant: "destructive",
      })
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

  if (!customer) {
    return (
      <div className="p-6">
        <p className="text-muted-foreground">Customer not found</p>
      </div>
    )
  }

  return (
    <div className="space-y-6 p-6">
      <div className="flex items-center gap-4">
        <Link href="/dashboard/customers">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <div className="flex-1">
          <h1 className="text-3xl font-bold tracking-tight">{customer.name}</h1>
          <p className="text-muted-foreground">{customer.email}</p>
        </div>
        <div className="flex gap-2">
          {editing ? (
            <>
              <Button onClick={() => setEditing(false)} variant="outline">
                <X className="mr-2 h-4 w-4" />
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={loading}>
                {loading ? (
                  <>
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border-2 border-current border-t-transparent" />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save className="mr-2 h-4 w-4" />
                    Save
                  </>
                )}
              </Button>
            </>
          ) : (
            <>
              <Button onClick={() => setEditing(true)}>
                <Edit className="mr-2 h-4 w-4" />
                Edit
              </Button>
              <Button onClick={handleDelete} variant="destructive">
                Delete
              </Button>
            </>
          )}
        </div>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {editing ? (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="name">Name *</Label>
                  <Input
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    name="email"
                    type="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="phone">Phone</Label>
                  <Input
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="age">Age</Label>
                  <Input
                    id="age"
                    name="age"
                    type="number"
                    min="1"
                    max="120"
                    value={formData.age}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="location">Location</Label>
                  <Input
                    id="location"
                    name="location"
                    value={formData.location}
                    onChange={handleChange}
                  />
                </div>

                <div className="space-y-2">
                  <Label htmlFor="notes">Notes</Label>
                  <Textarea
                    id="notes"
                    name="notes"
                    value={formData.notes}
                    onChange={handleChange}
                    rows={3}
                  />
                </div>
              </form>
            ) : (
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <User className="h-4 w-4 text-muted-foreground" />
                  <span className="font-medium">{customer.name}</span>
                </div>
                <div className="flex items-center gap-2">
                  <Mail className="h-4 w-4 text-muted-foreground" />
                  <span>{customer.email}</span>
                </div>
                {customer.phone && (
                  <div className="flex items-center gap-2">
                    <Phone className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.phone}</span>
                  </div>
                )}
                {customer.location && (
                  <div className="flex items-center gap-2">
                    <MapPin className="h-4 w-4 text-muted-foreground" />
                    <span>{customer.location}</span>
                  </div>
                )}
                {customer.age && (
                  <div className="flex items-center gap-2">
                    <span className="font-medium">Age:</span>
                    <span>{customer.age}</span>
                  </div>
                )}
                {customer.notes && (
                  <div className="space-y-2">
                    <span className="font-medium">Notes:</span>
                    <p className="text-sm text-muted-foreground">{customer.notes}</p>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <Calendar className="h-4 w-4 text-muted-foreground" />
                  <span className="text-sm text-muted-foreground">
                    Customer since {new Date(customer.createdAt).toLocaleDateString()}
                  </span>
                </div>
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Survey Responses</CardTitle>
            <p className="text-sm text-muted-foreground">
              {customer.responses.length} response{customer.responses.length !== 1 ? 's' : ''}
            </p>
          </CardHeader>
          <CardContent>
            {customer.responses.length === 0 ? (
              <p className="text-muted-foreground text-center py-8">
                No survey responses yet
              </p>
            ) : (
              <div className="space-y-3">
                {customer.responses.map((response) => (
                  <div key={response.id} className="p-3 border rounded-lg">
                    <div className="flex items-center justify-between mb-2">
                      <h4 className="font-medium">{response.survey.title}</h4>
                      <Badge variant="secondary">
                        {new Date(response.submittedAt).toLocaleDateString()}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground">
                      {Object.keys(response.answers).length} questions answered
                    </p>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
