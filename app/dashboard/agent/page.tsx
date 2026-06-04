"use client"

import { AnalyticsAgentTab } from "@/components/dashboard/analytics-agent-tab"

export default function AgentPage() {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background">
      <div className="h-[100dvh] w-full p-0">
        <AnalyticsAgentTab closeHref="/dashboard" />
      </div>
    </div>
  )
}
