"use client"

import { CRMAgentConsole } from "@/components/dashboard/crm-agent-console"

export default function AgentPage() {
  return (
    <div className="fixed inset-0 z-50 overflow-hidden bg-background">
      <div className="h-[100dvh] w-full p-0">
        <CRMAgentConsole closeHref="/dashboard" />
      </div>
    </div>
  )
}
