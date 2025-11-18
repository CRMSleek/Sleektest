"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { MoreHorizontal, Plus, Search } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { motion } from "framer-motion"
import { relationshipTypes } from "@/lib/validations"

interface Relationship {
  id: string
  name: string
  email: string
  location?: string
  age?: number
  relationship_type?: string
  createdAt?: string
  responses?: Array<{
    survey?: { title: string }
    submittedAt?: string
  }>
}

const relationshipTypeColors: Record<string, string> = {
  customer: "bg-blue-500",
  lead: "bg-yellow-500",
  partner: "bg-purple-500",
  vendor: "bg-green-500",
  supplier: "bg-orange-500",
  contractor: "bg-pink-500",
  affiliate: "bg-cyan-500",
  other: "bg-gray-500",
}

export default function RelationshipsPage() {
  const [relationships, setRelationships] = useState<Relationship[]>([])
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
    fetchRelationships()
  }, [searchQuery])
  const fetchRelationships = async () => {
    try {
      const url = searchQuery ? `/api/customers?search=${encodeURIComponent(searchQuery)}` : "/api/customers"

      const response = await fetch(url)

      if (response.ok) {
        const data = await response.json()
        setRelationships(data.customers || [])
      } else {
        toast({
          title: "Error",
          description: "Failed to fetch relationships",
          variant: "destructive",
        })
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to fetch relationships",
        variant: "destructive",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteRelationship = async (relationshipId: string) => {
    if (!confirm("Are you sure you want to delete this relationship?")) return

    try {
      const response = await fetch(`/api/customers/${relationshipId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        setRelationships(relationships.filter((r) => r.id !== relationshipId))
        toast({
          title: "Success",
          description: "Relationship deleted successfully",
        })
      } else {
        throw new Error("Failed to delete relationship")
      }
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete relationship",
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
          <h1 className="text-3xl font-bold tracking-tight">Relationships</h1>
          <p className="text-muted-foreground">Manage and view your business relationships</p>
        </div>
        <Button asChild>
          <Link href="/dashboard/customers/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Relationship
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
            placeholder="Search relationships..."
            className="pl-8"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </motion.div>

      {relationships.length === 0 ? (
        <motion.div
          className="text-center py-12"
          initial="hidden"
          animate="visible"
          variants={fadeUp}
          transition={{ delay: .12, duration: .6 }}>
          <p className="text-muted-foreground">No relationships found</p>
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
                <TableHead>Type</TableHead>
                <TableHead>Location</TableHead>
                <TableHead>Age</TableHead>
                <TableHead>Last Survey</TableHead>
                <TableHead className="w-[50px]"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {relationships.map((relationship) => (
                <TableRow key={relationship.id}>
                  <TableCell>
                    <div className="flex items-center gap-3">
                      <Avatar className="h-8 w-8">
                        <AvatarFallback>
                          {relationship.name
                            .split(" ")
                            .map((n) => n[0])
                            .join("")}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-medium">{relationship.name}</div>
                        <div className="text-sm text-muted-foreground">{relationship.email}</div>
                      </div>
                    </div>
                  </TableCell>
                  <TableCell>
                    <Badge 
                      variant="secondary" 
                      className={relationshipTypeColors[relationship.relationship_type || "other"] || "bg-gray-500"}
                    >
                      {(relationship.relationship_type || "customer").charAt(0).toUpperCase() + (relationship.relationship_type || "customer").slice(1)}
                    </Badge>
                  </TableCell>
                  <TableCell>{relationship.location || "—"}</TableCell>
                  <TableCell>{relationship.age || "—"}</TableCell>
                  <TableCell>
                    {relationship.responses && relationship.responses.length > 0
                      ? new Date(relationship.responses[0].submittedAt as string).toLocaleDateString()
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
                          <Link href={`/dashboard/customers/${relationship.id}`}>View Profile</Link>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => handleDeleteRelationship(relationship.id)} className="text-red-600">
                          Delete Relationship
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
