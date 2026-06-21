"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Bot, FileText, HeartHandshake, Home, Mail, Settings, Users } from "lucide-react"

const items = [
  {
    name: "Dashboard",
    href: "/dashboard",
    icon: Home,
  },
  {
    name: "Agent",
    href: "/dashboard/agent",
    icon: Bot,
  },
  {
    name: "Relationships",
    href: "/dashboard/customers",
    icon: Users,
  },
  {
    name: "Communications",
    href: "/dashboard/communications",
    icon: Mail,
  },
  {
    name: "Surveys and Forms",
    href: "/dashboard/surveys",
    icon: FileText,
  },
  {
    name: "Fundraising",
    href: "/dashboard/fundraising",
    icon: HeartHandshake,
  },
  {
    name: "Settings",
    href: "/dashboard/settings",
    icon: Settings,
  },
]

export function DashboardSidebar() {
  const pathname = usePathname()

  return (
    <div className="flex h-full w-[240px] flex-col border-r bg-muted/40">
      <div className="flex flex-col gap-2 p-4">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={cn(
              "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium hover:bg-muted",
              pathname === item.href ? "bg-muted" : "transparent",
            )}
          >
            <item.icon className="h-5 w-5" />
            {item.name}
          </Link>
        ))}
      </div>
    </div>
  )
}
