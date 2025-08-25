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
  createdAt?: string
  responses?: Array<{
    survey?: { title: string }
    submittedAt?: string
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
  const fetchCustomers = async () => {
    try {
      const url = searchQuery ? `/api/customers?search=${encodeURIComponent(searchQuery)}` : "/api/customers"

      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        setCustomers(data.customers)
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
                    {customer.responses && customer.responses.length > 0
                      ? new Date(customer.responses[0].submittedAt as string).toLocaleDateString()
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
