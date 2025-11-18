"use client"

import { useState, useEffect } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Checkbox } from "@/components/ui/checkbox"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu"
import EmailSend from "@/components/ui/email-send"
import EmailView from "@/components/ui/email-view"
import { MoreHorizontal, Plus, Search, ChevronLeft, ChevronRight, Link as LinkIcon } from "lucide-react"
import { useToast } from "@/components/ui/use-toast"
import { motion, easeOut } from "framer-motion"
import { Badge } from "@/components/ui/badge"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function EmailPage() {
  const [OAuth, setOAuth] = useState(true)
  const [emails, setEmails] = useState<any[]>([])
  const [allEmails, setAllEmails] = useState<any[]>([]) // Store all emails for search filtering
  const [search, setSearch] = useState("")
  const [showEmailComponent, setShowEmailComponent] = useState(false)
  const [showEmailViewComponent, setShowEmailViewComponent] = useState<any>(null)
  const [emailSendMode, setEmailSendMode] = useState<'compose' | 'reply' | 'forward'>('compose')
  const [originalEmail, setOriginalEmail] = useState<any>(null)
  const [placeholderText, setPlaceholderText] = useState("No emails found.")
  const [nextPageToken, setNextPageToken] = useState<string | null>(null)
  const [currentPageToken, setCurrentPageToken] = useState<string | null>(null)
  const [pageHistory, setPageHistory] = useState<string[]>([]) // Stack for previous pages
  const [isLoading, setIsLoading] = useState(false)
  const [savedEmailIds, setSavedEmailIds] = useState<Set<string>>(new Set())
  const [checkedEmails, setCheckedEmails] = useState<Set<string>>(new Set())
  const [isSaving, setIsSaving] = useState(false)
  const [emailRelationships, setEmailRelationships] = useState<Map<string, any>>(new Map())
  const [relationships, setRelationships] = useState<any[]>([])
  const [selectedEmailForAttachment, setSelectedEmailForAttachment] = useState<any>(null)
  const [selectedRelationshipId, setSelectedRelationshipId] = useState<string>("")
  const [isAttachingEmail, setIsAttachingEmail] = useState(false)
  const { toast } = useToast()

  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: { opacity: 1, y: 0, transition: { duration: 1, ease: easeOut, when: "beforeChildren", staggerChildren: 0.15 } },
  }
  const fade = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.8, ease: easeOut } },
  }

  const getOauth = async () => {
    try {
      const response = await fetch("/api/email")
      const data = await response.json()
      console.log(data.OAuth)
      if (response.ok) setOAuth(data.OAuth)
    } catch (err) {
      console.error("Fetch OAuth error:", err)
    }
  }

  const fetchEmails = async (pageToken?: string | null, append: boolean = false) => {
    setIsLoading(true)
    try {
      const response = await fetch("/api/email", { 
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          pageToken: pageToken || undefined,
          maxResults: 10
        }),
      })
      const data = await response.json()
      if (response.ok) {
        const newEmails = data.emails || []
        if (append) {
          setAllEmails(prev => [...prev, ...newEmails])
          setEmails(prev => [...prev, ...newEmails])
        } else {
          setAllEmails(newEmails)
          setEmails(newEmails)
        }
        setNextPageToken(data.nextPageToken || null)
        setCurrentPageToken(pageToken || null)
        console.log("Fetched emails:", newEmails.length, "Next page token:", data.nextPageToken)
      }
    } catch (err) {
      console.error("Failed to fetch emails:", err)
    } finally {
      setIsLoading(false)
    }
  }

  const loadNextPage = () => {
    if (nextPageToken && !isLoading) {
      fetchEmails(nextPageToken, true)
    }
  }

  const loadPreviousPage = () => {
    // Gmail API doesn't support backwards pagination easily
    // So we'll reset to the first page
    if (!isLoading) {
      setAllEmails([])
      setEmails([])
      setNextPageToken(null)
      setCurrentPageToken(null)
      setPageHistory([])
      fetchEmails(null, false)
    }
  }

  // Fetch saved email IDs and their relationships on component mount
  const fetchSavedEmailIds = async () => {
    try {
      const response = await fetch("/api/email/saved")
      if (response.ok) {
        const data = await response.json()
        const savedIds = new Set<string>(data.savedEmailIds || [])
        setSavedEmailIds(savedIds)
        setCheckedEmails(savedIds) // Initialize checked emails with saved ones
        
        // Fetch relationships for saved emails
        if (savedIds.size > 0) {
          fetchEmailRelationships(Array.from<string>(savedIds))
        }
      }
    } catch (err) {
      console.error("Failed to fetch saved email IDs:", err)
    }
  }

  // Fetch relationships for emails
  const fetchEmailRelationships = async (emailIds: string[]) => {
    try {
      const relationshipsMap = new Map<string, any>()
      await Promise.all(
        emailIds.map(async (emailId) => {
          try {
            const response = await fetch(`/api/email/relationships?emailId=${emailId}`)
            if (response.ok) {
              const data = await response.json()
              if (data.relationship) {
                relationshipsMap.set(emailId, data.relationship)
              }
            }
          } catch (err) {
            // Silently handle individual failures
          }
        })
      )
      setEmailRelationships(relationshipsMap)
    } catch (err) {
      console.error("Failed to fetch email relationships:", err)
    }
  }

  // Update relationships when emails are saved
  useEffect(() => {
    if (allEmails.length > 0 && savedEmailIds.size > 0) {
      fetchEmailRelationships(Array.from(savedEmailIds))
    }
  }, [savedEmailIds, allEmails])

  // Fetch all relationships for dropdown
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

  // Save/delete emails when checkboxes change
  const handleEmailToggle = async (emailId: string, email: any, isChecked: boolean) => {
    const newChecked = new Set(checkedEmails)
    
    if (isChecked) {
      newChecked.add(emailId)
    } else {
      newChecked.delete(emailId)
    }
    
    setCheckedEmails(newChecked)
    setIsSaving(true)

    try {
      const emailsToSave: any[] = []
      const emailIdsToDelete: string[] = []

      // Determine what needs to be saved or deleted
      if (isChecked) {
        // Email is being checked - save it
        emailsToSave.push(email)
      } else {
        // Email is being unchecked - delete it if it was previously saved
        if (savedEmailIds.has(emailId)) {
          emailIdsToDelete.push(emailId)
        }
      }

      const response = await fetch("/api/email/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailsToSave: emailsToSave.length > 0 ? emailsToSave : undefined,
          emailIdsToDelete: emailIdsToDelete.length > 0 ? emailIdsToDelete : undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update saved email IDs set
        const updatedSavedIds = new Set(savedEmailIds)
        data.saved?.forEach((id: string) => updatedSavedIds.add(id))
        data.deleted?.forEach((id: string) => updatedSavedIds.delete(id))
        setSavedEmailIds(updatedSavedIds)

        if (isChecked) {
          toast({
            title: "Email saved",
            description: "Email has been saved to the database.",
          })
        } else {
          toast({
            title: "Email removed",
            description: "Email has been removed from the database.",
          })
        }
      } else {
        // Revert checkbox state on error
        setCheckedEmails(checkedEmails)
        toast({
          title: "Error",
          description: "Failed to save/delete email. Please try again.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Failed to save/delete email:", err)
      // Revert checkbox state on error
      setCheckedEmails(checkedEmails)
      toast({
        title: "Error",
        description: "Failed to save/delete email. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  // Sync checked emails when emails are loaded
  useEffect(() => {
    if (allEmails.length > 0 && savedEmailIds.size > 0) {
      const newChecked = new Set<string>()
      allEmails.forEach((email) => {
        if (savedEmailIds.has(email.id)) {
          newChecked.add(email.id)
        }
      })
      setCheckedEmails(newChecked)
    } else if (allEmails.length > 0 && savedEmailIds.size === 0) {
      // Clear checked emails if no saved emails
      setCheckedEmails(new Set())
    }
  }, [allEmails, savedEmailIds])

  // Batch save/delete for select all
  const handleSelectAll = async (checked: boolean) => {
    if (isSaving) return

    const visibleEmailIds = new Set(emails.map(e => e.id))
    const emailsToSave: any[] = []
    const emailIdsToDelete: string[] = []

    if (checked) {
      // Check all - save emails that aren't already saved
      emails.forEach((email) => {
        if (!savedEmailIds.has(email.id)) {
          emailsToSave.push(email)
        }
      })
    } else {
      // Uncheck all - delete emails that are saved
      emails.forEach((email) => {
        if (savedEmailIds.has(email.id)) {
          emailIdsToDelete.push(email.id)
        }
      })
    }

    if (emailsToSave.length === 0 && emailIdsToDelete.length === 0) {
      // Just update UI state if nothing to save/delete
      const newChecked = new Set(checkedEmails)
      if (checked) {
        visibleEmailIds.forEach(id => newChecked.add(id))
      } else {
        visibleEmailIds.forEach(id => newChecked.delete(id))
      }
      setCheckedEmails(newChecked)
      return
    }

    setIsSaving(true)
    
    // Optimistically update UI
    const newChecked = new Set(checkedEmails)
    if (checked) {
      visibleEmailIds.forEach(id => newChecked.add(id))
    } else {
      visibleEmailIds.forEach(id => newChecked.delete(id))
    }
    setCheckedEmails(newChecked)

    try {
      const response = await fetch("/api/email/saved", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailsToSave: emailsToSave.length > 0 ? emailsToSave : undefined,
          emailIdsToDelete: emailIdsToDelete.length > 0 ? emailIdsToDelete : undefined,
        }),
      })

      if (response.ok) {
        const data = await response.json()
        
        // Update saved email IDs set
        const updatedSavedIds = new Set(savedEmailIds)
        data.saved?.forEach((id: string) => updatedSavedIds.add(id))
        data.deleted?.forEach((id: string) => updatedSavedIds.delete(id))
        setSavedEmailIds(updatedSavedIds)

        toast({
          title: checked ? "Emails saved" : "Emails removed",
          description: `${checked ? emailsToSave.length : emailIdsToDelete.length} email(s) ${checked ? 'saved' : 'removed'} from database.`,
        })
      } else {
        // Revert on error
        setCheckedEmails(checkedEmails)
        toast({
          title: "Error",
          description: "Failed to save/delete emails. Please try again.",
          variant: "destructive",
        })
      }
    } catch (err) {
      console.error("Failed to save/delete emails:", err)
      // Revert on error
      setCheckedEmails(checkedEmails)
      toast({
        title: "Error",
        description: "Failed to save/delete emails. Please try again.",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  useEffect(() => {
    getOauth()
    fetchEmails()
    fetchSavedEmailIds()
    fetchRelationships()
  }, [])

  // Handle manual email attachment to relationship
  const handleAttachEmailToRelationship = async () => {
    if (!selectedEmailForAttachment || !selectedRelationshipId) return

    setIsAttachingEmail(true)
    try {
      const response = await fetch("/api/email/relationships", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          emailId: selectedEmailForAttachment.id,
          relationshipId: selectedRelationshipId,
        }),
      })

      if (response.ok) {
        const relationship = relationships.find((r) => r.id === selectedRelationshipId)
        const newMap = new Map(emailRelationships)
        newMap.set(selectedEmailForAttachment.id, relationship)
        setEmailRelationships(newMap)

        toast({
          title: "Email attached",
          description: `Email attached to ${relationship?.name || "relationship"}`,
        })
        setSelectedEmailForAttachment(null)
        setSelectedRelationshipId("")
      } else {
        throw new Error("Failed to attach email")
      }
    } catch (err) {
      toast({
        title: "Error",
        description: "Failed to attach email to relationship",
        variant: "destructive",
      })
    } finally {
      setIsAttachingEmail(false)
    }
  }

  useEffect(() => {
    if (!OAuth) {
      setPlaceholderText("Please sign into SleekCRM using OAuth to use the email feature")
    } else {
      setPlaceholderText("No emails found.")
    }
  }, [OAuth])

  // Filter emails based on search query
  useEffect(() => {
    if (!search.trim()) {
      // If search is empty, show current page emails
      setEmails(allEmails)
    } else {
      // Filter emails based on search query (search in sender, subject, and content)
      const searchLower = search.toLowerCase()
      const filtered = allEmails.filter((email) => {
        const fromMatch = email.from?.toLowerCase().includes(searchLower)
        const subjectMatch = email.subject?.toLowerCase().includes(searchLower)
        const contentMatch = email.content?.toLowerCase().includes(searchLower) || 
                           email.html?.toLowerCase().includes(searchLower)
        return fromMatch || subjectMatch || contentMatch
      })
      setEmails(filtered)
    }
  }, [search, allEmails])

  return (
    <motion.div className="space-y-6 p-6" initial="hidden" animate="visible" variants={fadeUp}>
      <motion.div className="flex items-center justify-between" variants={fade}>
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Email</h1>
          <p className="text-muted-foreground">Send, receive, and track emails</p>
        </div>
        <Button className="gap-2" variant="default" disabled={!OAuth} onClick={() => {
          setEmailSendMode('compose')
          setOriginalEmail(null)
          setShowEmailComponent(true)
        }}>
          <Plus className="w-4 h-4" /> Compose
        </Button>
        {showEmailComponent && (
          <EmailSend 
            isOpen={showEmailComponent} 
            onClose={() => {
              setShowEmailComponent(false)
              setOriginalEmail(null)
              setEmailSendMode('compose')
            }}
            mode={emailSendMode}
            originalEmail={originalEmail}
          />
        )}
        {showEmailViewComponent && (
          <EmailView 
            isOpen={!!showEmailViewComponent} 
            onClose={() => setShowEmailViewComponent(null)} 
            emailId={showEmailViewComponent}
            onReply={(email) => {
              setEmailSendMode('reply')
              setOriginalEmail(email)
              setShowEmailComponent(true)
            }}
            onForward={(email) => {
              setEmailSendMode('forward')
              setOriginalEmail(email)
              setShowEmailComponent(true)
            }}
          />
        )}
      </motion.div>

      <motion.div className="flex items-center gap-4" variants={fade}>
        <div className="relative w-full max-w-md">
          <Input placeholder="Search emails..." value={search} onChange={(e) => setSearch(e.target.value)} className="pl-10" />
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        </div>
      </motion.div>

      <motion.div className="overflow-x-auto rounded-lg border bg-background shadow-sm" variants={fade}>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-12">
              </TableHead>
              <TableHead>Sender</TableHead>
              <TableHead>Subject</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="text-right">Actions</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Loading emails...
                </TableCell>
              </TableRow>
            ) : emails.length === 0 ? (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  {search ? "No emails match your search." : placeholderText}
                </TableCell>
              </TableRow>
            ) : (
              emails.map((email) => {
                const attachedRelationship = emailRelationships.get(email.id)
                return (
                  <TableRow key={email.id}>
                    <TableCell>
                      <Checkbox
                        checked={checkedEmails.has(email.id)}
                        onCheckedChange={(checked) => {
                          handleEmailToggle(email.id, email, checked as boolean)
                        }}
                        disabled={isSaving}
                      />
                    </TableCell>
                    <TableCell>{email.from}</TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        <span>{email.subject}</span>
                        {attachedRelationship && (
                          <Badge variant="secondary" className="text-xs">
                            {attachedRelationship.name}
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{email.date}</TableCell>
                    <TableCell className="text-right">
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="icon">
                            <MoreHorizontal className="w-4 h-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuItem onClick={() => setShowEmailViewComponent(email)}>
                            View
                          </DropdownMenuItem>
                          <Dialog>
                            <DialogTrigger asChild>
                              <DropdownMenuItem onSelect={(e) => {
                                e.preventDefault()
                                setSelectedEmailForAttachment(email)
                                setSelectedRelationshipId(attachedRelationship?.id || "")
                              }}>
                                <LinkIcon className="mr-2 h-4 w-4" />
                                {attachedRelationship ? "Change Relationship" : "Attach to Relationship"}
                              </DropdownMenuItem>
                            </DialogTrigger>
                            <DialogContent>
                              <DialogHeader>
                                <DialogTitle>Attach Email to Relationship</DialogTitle>
                                <DialogDescription>
                                  Select a relationship to attach this email to. The email will be associated with the selected relationship.
                                </DialogDescription>
                              </DialogHeader>
                              <div className="space-y-4 py-4">
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Email</label>
                                  <div className="text-sm text-muted-foreground">
                                    From: {email.from} <br />
                                    Subject: {email.subject}
                                  </div>
                                </div>
                                <div className="space-y-2">
                                  <label className="text-sm font-medium">Relationship</label>
                                  <Select value={selectedRelationshipId} onValueChange={setSelectedRelationshipId}>
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
                                <Button
                                  variant="outline"
                                  onClick={() => {
                                    setSelectedEmailForAttachment(null)
                                    setSelectedRelationshipId("")
                                  }}
                                >
                                  Cancel
                                </Button>
                                <Button onClick={handleAttachEmailToRelationship} disabled={!selectedRelationshipId || isAttachingEmail}>
                                  {isAttachingEmail ? "Attaching..." : "Attach"}
                                </Button>
                              </DialogFooter>
                            </DialogContent>
                          </Dialog>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                )
              })
            )}
          </TableBody>
        </Table>
        
        {!search && OAuth && (
          <div className="flex items-center justify-between p-4 border-t">
            <Button
              variant="outline"
              onClick={loadPreviousPage}
              disabled={isLoading || allEmails.length <= 10}
              className="flex items-center gap-2"
            >
              Reset to First Page
            </Button>
            <span className="text-sm text-muted-foreground">
              {allEmails.length} email{allEmails.length !== 1 ? 's' : ''} loaded
              {nextPageToken && ' • More available'}
            </span>
            <Button
              variant="outline"
              onClick={loadNextPage}
              disabled={isLoading || !nextPageToken}
              className="flex items-center gap-2"
            >
              Load More
            </Button>
          </div>
        )}
      </motion.div>
    </motion.div>
  )
}