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

export default function EmailPage() {
  const { toast } = useToast()
  const fadeUp = {
    hidden: { opacity: 0, y: 30 },
    visible: ({ opacity: 1, y: 0 }),
  }
  const fade = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.7 } },
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
          <h1 className="text-3xl font-bold tracking-tight">Email</h1>
          <p className="text-muted-foreground">Send, receive, and track emails</p>
        </div>
      </motion.div>
    </div>
  )
}
