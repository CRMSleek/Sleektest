"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { MoreHorizontal, Plus, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"

interface Customer {
  id: string
  name: string
  email: string
  location?: string
  age?: number
  createdAt: string
  responses: Array<{
    survey: { title: string }
    submittedAt: string
  }>
}

export default function CustomersPage() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [searchQuery, setSearchQuery] = useState("")
  const [loading, setLoading] = useState(true)
  const { toast } = useToast()
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: ({ opacity: 1, y: 0 }),
  }
  const fade = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.7 } },
  }

  useEffect(() => {
    fetchCustomers()
  }, [searchQuery])

  const dummyData = {
    customers: [
      {
        id: "1",
        name: "Alice Johnson",
        email: "alice.johnson@example.com",
        location: "New York, NY",
        age: 34,
        createdAt: "2025-01-10T10:00:00Z",
        responses: [
          {
            survey: { title: "Customer Satisfaction" },
            submittedAt: "2025-06-15T12:00:00Z"
          }
        ]
      },
      {
        id: "2",
        name: "Bob Smith",
        email: "bob.smith@example.com",
        location: "San Francisco, CA",
        age: 35,
        createdAt: "2025-01-12T11:00:00Z",
        responses: []
      },
      {
        id: "3",
        name: "Charlie Lee",
        email: "charlie.lee@example.com",
        location: "Chicago, IL",
        age: 41,
        createdAt: "2025-01-15T09:30:00Z",
        responses: [
          {
            survey: { title: "Product Feedback" },
            submittedAt: "2025-03-01T14:30:00Z"
          }
        ]
      },
      {
        id: "4",
        name: "Diana Prince",
        email: "diana.prince@example.com",
        location: "Austin, TX",
        age: 27,
        createdAt: "2025-04-18T08:45:00Z",
        responses: []
      },
      {
        id: "5",
        name: "Ethan Brown",
        email: "ethan.brown@example.com",
        location: "Seattle, WA",
        age: 33,
        createdAt: "2025-07-20T13:20:00Z",
        responses: [
          {
            survey: { title: "Service Review" },
            submittedAt: "2025-03-10T16:00:00Z"
          }
        ]
      },
      {
        id: "6",
        name: "Fiona Green",
        email: "fiona.green@example.com",
        location: "Denver, CO",
        age: 26,
        createdAt: "2023-01-22T15:30:00Z",
        responses: []
      },
      {
        id: "7",
        name: "George Hall",
        email: "george.hall@example.com",
        location: "Miami, FL",
        age: 39,
        createdAt: "2023-01-25T10:10:00Z",
        responses: [
          {
            survey: { title: "Customer Satisfaction" },
            submittedAt: "2025-03-15T10:00:00Z"
          }
        ]
      },
      {
        id: "8",
        name: "Hannah Kim",
        email: "hannah.kim@example.com",
        location: "Boston, MA",
        age: 30,
        createdAt: "2023-01-28T12:00:00Z",
        responses: []
      },
      {
        id: "9",
        name: "Ian Miller",
        email: "ian.miller@example.com",
        location: "Phoenix, AZ",
        age: 45,
        createdAt: "2023-01-30T09:00:00Z",
        responses: []
      },
      {
        id: "10",
        name: "Jane Doe",
        email: "jane.doe@example.com",
        location: "Las Vegas, NV",
        age: 32,
        createdAt: "2023-02-01T11:11:00Z",
        responses: [
          {
            survey: { title: "User Experience" },
            submittedAt: "2025-03-05T14:00:00Z"
          }
        ]
      },
      {
        id: "11",
        name: "Kyle White",
        email: "kyle.white@example.com",
        location: "Nashville, TN",
        age: 36,
        createdAt: "2023-02-03T10:45:00Z",
        responses: []
      },
      {
        id: "12",
        name: "Laura King",
        email: "laura.king@example.com",
        location: "Charlotte, NC",
        age: 28,
        createdAt: "2023-02-05T14:10:00Z",
        responses: []
      },
      {
        id: "13",
        name: "Mark Adams",
        email: "mark.adams@example.com",
        location: "Detroit, MI",
        age: 34,
        createdAt: "2023-02-07T08:25:00Z",
        responses: [
          {
            survey: { title: "Customer Loyalty" },
            submittedAt: "2025-04-01T13:00:00Z"
          }
        ]
      },
      {
        id: "14",
        name: "Nina Baker",
        email: "nina.baker@example.com",
        location: "Cleveland, OH",
        age: 31,
        createdAt: "2023-02-09T09:15:00Z",
        responses: []
      },
      {
        id: "15",
        name: "Oscar Nelson",
        email: "oscar.nelson@example.com",
        location: "Portland, OR",
        age: 38,
        createdAt: "2023-02-11T16:40:00Z",
        responses: []
      },
      {
        id: "16",
        name: "Paula Reed",
        email: "paula.reed@example.com",
        location: "Kansas City, MO",
        age: 40,
        createdAt: "2023-02-13T13:30:00Z",
        responses: [
          {
            survey: { title: "Net Promoter Score" },
            submittedAt: "2025-04-10T15:45:00Z"
          }
        ]
      },
      {
        id: "17",
        name: "Quentin Ross",
        email: "quentin.ross@example.com",
        location: "Orlando, FL",
        age: 37,
        createdAt: "2023-02-15T11:25:00Z",
        responses: []
      },
      {
        id: "18",
        name: "Rachel Scott",
        email: "rachel.scott@example.com",
        location: "Minneapolis, MN",
        age: 29,
        createdAt: "2023-02-17T17:50:00Z",
        responses: []
      },
      {
        id: "19",
        name: "Samuel Turner",
        email: "samuel.turner@example.com",
        location: "Salt Lake City, UT",
        age: 42,
        createdAt: "2023-02-19T10:10:00Z",
        responses: []
      },
      {
        id: "20",
        name: "Tina Underwood",
        email: "tina.underwood@example.com",
        location: "Raleigh, NC",
        age: 33,
        createdAt: "2023-02-21T09:45:00Z",
        responses: []
      },
      {
        id: "21",
        name: "Umar Vance",
        email: "umar.vance@example.com",
        location: "Albuquerque, NM",
        age: 44,
        createdAt: "2023-02-23T14:20:00Z",
        responses: []
      },
      {
        id: "22",
        name: "Valerie Wilson",
        email: "valerie.wilson@example.com",
        location: "Indianapolis, IN",
        age: 31,
        createdAt: "2023-02-25T11:11:00Z",
        responses: []
      },
      {
        id: "23",
        name: "Will Xu",
        email: "will.xu@example.com",
        location: "Columbus, OH",
        age: 30,
        createdAt: "2023-02-27T13:35:00Z",
        responses: [
          {
            survey: { title: "Feature Request" },
            submittedAt: "2025-04-18T11:55:00Z"
          }
        ]
      },
      {
        id: "24",
        name: "Xena Young",
        email: "xena.young@example.com",
        location: "Milwaukee, WI",
        age: 36,
        createdAt: "2023-03-01T09:00:00Z",
        responses: []
      },
      {
        id: "25",
        name: "Yusuf Zane",
        email: "yusuf.zane@example.com",
        location: "Tampa, FL",
        age: 28,
        createdAt: "2023-03-03T10:10:00Z",
        responses: []
      },
      {
        id: "26",
        name: "Zara Abbott",
        email: "zara.abbott@example.com",
        location: "St. Louis, MO",
        age: 27,
        createdAt: "2023-03-05T08:20:00Z",
        responses: []
      },
    ]
  };
  const fetchCustomers = async () => {
    try {
      const url = searchQuery ? `/api/customers?search=${encodeURIComponent(searchQuery)}` : "/api/customers"

      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        setCustomers(dummyData.customers)
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch customers",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch customers",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteCustomer = async (customerId: string) => {
    if (!confirm("Are you sure you want to delete this customer?")) return

    try {
      const response = await fetch(`/api/customers/${customerId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setCustomers(customers.filter((c) => c.id !== customerId))
        toast({
          title: "Success",
          description: "Customer deleted successfully",
        })
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

  return (
    <div
      className="space-y-6 p-6"
      initial="hidden"
      animate="visible"
      variants={fadeUp}>
      <motion.div 
      className="flex items-center justify-between"
      initial="hidden"
      animate="visible"
      variants={fade}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Customers</h1>
          <p className="text-muted-foreground">Manage and view your customer profiles</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/customers/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Customer
          </Link>
        </Button>
      </motion.div>

      <motion.div 
        className="flex items-center gap-4"
        initial="hidden"
        animate="visible"
        variants={fadeUp}
        transition={{ delay: 0, duration: .6 }}>
        <div className="relative flex-1">
          <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
          <Input
            type="search"
            placeholder="Search customers..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>

      {customers.length === 0 ? (
        <motion.div
          className="text-center py-12"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: .12, duration: .6 }}>
          <p className="text-muted-foreground">No customers found</p>
          {searchQuery && (
            <Button variant="outline" onClick={() => setSearchQuery("")} className="mt-4">
              Clear search
            </Button>
          )}
        </motion.div>
      ) : (
        <motion.div 
          className="rounded-md border"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: .12, duration: .6 }}>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Last Survey</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {customers.map((customer) => (
                <TableRow key={customer.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {customer.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{customer.name}</div>
                        <div className="text-sm text-muted-foreground">{customer.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>{customer.location || "—"}</TableCell>
                  <TableCell>{customer.age || "—"}</TableCell>
                  <TableCell>
                    {customer.responses.length > 0
                      ? new Date(customer.responses[0].submittedAt).toLocaleDateString()
                      : "Never"}
                  </TableCell>
                  <TableCell>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button variant="ghost" size="icon">
                          <MoreHorizontal className="h-4 w-4" />
                          <span className="sr-only">Open menu</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end">
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/customers/${customer.id}`}>View Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem asChild>
                          <Link href={`/dashboard/customers/${customer.id}/edit`}>Edit Customer</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteCustomer(customer.id)} className="text-red-600">
                          Delete Customer
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </motion.div>
      )}
    </div>
  )
}
