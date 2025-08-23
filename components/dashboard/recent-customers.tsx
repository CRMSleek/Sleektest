"use client"

import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useEffect, useState } from "react"

interface Customer {
  id: string
  name: string
  email: string
  createdAt: string
}

export function DashboardRecentCustomers() {
  const [customers, setCustomers] = useState<Customer[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    fetchRecentCustomers()
  }, [])

  const fetchRecentCustomers = async () => {
    try {
      const response = await fetch("/api/customers")
      if (response.ok) {
        const data = await response.json()
        // Sort by creation date and take the 5 most recent
        const recentCustomers = data.customers
          .sort((a: Customer, b: Customer) => new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime())
          .slice(0, 5)
        setCustomers(recentCustomers)
      }
    } catch (error) {
      console.error("Failed to fetch recent customers:", error)
    } finally {
      setLoading(false)
    }
  }

  if (loading) {
    return <div className="text-center text-muted-foreground">Loading customers...</div>
  }

  if (customers.length === 0) {
    return <div className="text-center text-muted-foreground">No customers yet</div>
  }

  return (
    <div className="space-y-4">
      {customers.map((customer) => (
        <div key={customer.id} className="flex items-center gap-4">
          <Avatar>
            <AvatarFallback>
              {customer.name
                .split(" ")
                .map((n) => n[0])
                .join("")}
            </AvatarFallback>
          </Avatar>
          <div className="flex-1 space-y-1">
            <p className="text-sm font-medium leading-none">{customer.name}</p>
            <p className="text-xs text-muted-foreground">{customer.email}</p>
          </div>
          <div className="text-xs text-muted-foreground">{new Date(customer.createdAt).toLocaleDateString()}</div>
        </div>
      ))}
    </div>
  )
}
