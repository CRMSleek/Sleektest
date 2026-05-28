"use client"

import Link from "next/link"
import { X } from "lucide-react"
import { AnalyticsAgentTab } from "@/components/dashboard/analytics-agent-tab"

export default function AgentPage() {
  return (
    <div className="fixed inset-0 z-50 bg-background">
      <Link
        href="/dashboard"
        aria-label="Close agent"
        className="absolute right-4 top-4 z-20 inline-flex h-9 w-9 items-center justify-center rounded-full border bg-background/80 text-foreground shadow-sm backdrop-blur transition-colors hover:bg-muted"
      >
        <X className="h-4 w-4" />
      </Link>

      <div className="h-full w-full overflow-hidden p-0">
        <AnalyticsAgentTab />
      </div>
    </div>
  )
}
