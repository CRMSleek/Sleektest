"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/components/ui/use-toast"
import { Plus, Trash2, Save } from "lucide-react"
import { motion } from "framer-motion"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

interface AutoAssignmentRule {
  id: string
  sender_email: string
  relationship_id: string
  relationship?: {
    id: string
    name: string
    email: string
    relationship_type: string
  }
  is_active: boolean
  created_at: string
}

export default function EmailSettingsPage() {
  const { toast } = useToast()
  const [rules, setRules] = useState<AutoAssignmentRule[]>([])
  const [relationships, setRelationships] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [formData, setFormData] = useState({
    sender_email: "",
    relationship_id: "",
    is_active: true,
  })

  useEffect(() => {
    fetchRules()
    fetchRelationships()
  }, [])

  const fetchRules = async () => {
    try {
      const response = await fetch("/api/email/auto-assignment")
      if (response.ok) {
        const data = await response.json()
        setRules(data.rules || [])
      }
    } catch (err) {
      console.error("Failed to fetch rules:", err)
    } finally {
      setLoading(false)
    }
  }

  const fetchRelationships = async () => {
    try {
      const response = await fetch("/api/email/relationships")
      if (response.ok) {
        const data = await response.json()
        setRelationships(data.relationships || [])
      }
    } catch (err) {
      console.error("Failed to fetch relationships:", err)
    }
  }

  const handleSaveRule = async () => {
    if (!formData.sender_email || !formData.relationship_id) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive",
      })
      return
    }

    try {
      const response = await fetch("/api/email/auto-assignment", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Auto-assignment rule saved successfully",
        })
        setIsDialogOpen(false)
        setFormData({ sender_email: "", relationship_id: "", is_active: true })
        fetchRules()
      } else {
        const error = await response.json()
        throw new Error(error.error || "Failed to save rule")
      }
    } catch (err: any) {
      toast({
        title: "Error",
        description: err.message || "Failed to save rule",
        variant: "destructive",
      })
    }
  }

  const handleDeleteRule = async (ruleId: string) => {
    if (!confirm("Are you sure you want to delete this rule?")) return

    try {
      const response = await fetch(`/api/email/auto-assignment?ruleId=${ruleId}`, {
        method: "DELETE",
      })

      if (response.ok) {
        toast({
          title: "Success",
          description: "Rule deleted successfully",
        })
        fetchRules()
      } else {
        throw new Error("Failed to delete rule")
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to delete rule",
        variant: "destructive",
      })
    }
  }

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0 },
  }

  return (
    <div className="space-y-6 p-6">
      <motion.div initial="hidden" animate="visible" variants={fadeUp}>
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Email Auto-Assignment Settings</h1>
            <p className="text-muted-foreground">
              Configure automatic assignment of emails to relationships based on sender email
            </p>
          </div>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Add Rule
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Add Auto-Assignment Rule</DialogTitle>
                <DialogDescription>
                  Emails from the specified sender email will automatically be attached to the selected relationship when saved.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label htmlFor="sender_email">Sender Email *</Label>
                  <Input
                    id="sender_email"
                    type="email"
                    placeholder="sender@example.com"
                    value={formData.sender_email}
                    onChange={(e) => setFormData({ ...formData, sender_email: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="relationship_id">Relationship *</Label>
                  <Select value={formData.relationship_id} onValueChange={(value) => setFormData({ ...formData, relationship_id: value })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a relationship" />
                    </SelectTrigger>
                    <SelectContent>
                      {relationships.map((rel) => (
                        <SelectItem key={rel.id} value={rel.id}>
                          {rel.name} ({rel.email}) - {rel.relationship_type || "customer"}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>
              <DialogFooter>
                <Button variant="outline" onClick={() => setIsDialogOpen(false)}>
                  Cancel
                </Button>
                <Button onClick={handleSaveRule}>
                  <Save className="mr-2 h-4 w-4" />
                  Save Rule
                </Button>
              </DialogFooter>
            </DialogContent>
          </Dialog>
        </div>
      </motion.div>

      <motion.div initial="hidden" animate="visible" variants={fadeUp} transition={{ delay: 0.1 }}>
        <Card>
          <CardHeader>
            <CardTitle>Auto-Assignment Rules</CardTitle>
            <CardDescription>
              Emails from these addresses will be automatically attached to their corresponding relationships when saved.
            </CardDescription>
          </CardHeader>
          <CardContent>
            {loading ? (
              <div className="text-center py-8 text-muted-foreground">Loading rules...</div>
            ) : rules.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">No auto-assignment rules configured</div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Sender Email</TableHead>
                    <TableHead>Relationship</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {rules.map((rule) => (
                    <TableRow key={rule.id}>
                      <TableCell className="font-medium">{rule.sender_email}</TableCell>
                      <TableCell>
                        {rule.relationship ? (
                          <div>
                            <div>{rule.relationship.name}</div>
                            <Badge variant="secondary" className="mt-1">
                              {rule.relationship.relationship_type || "customer"}
                            </Badge>
                          </div>
                        ) : (
                          "Unknown"
                        )}
                      </TableCell>
                      <TableCell>
                        <Badge variant={rule.is_active ? "default" : "secondary"}>
                          {rule.is_active ? "Active" : "Inactive"}
                        </Badge>
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteRule(rule.id)}
                          className="text-red-600 hover:text-red-700"
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>
      </motion.div>
    </div>
  )
}

