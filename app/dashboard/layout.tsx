"use client"
import type React from "react"
import { useEffect } from "react"
import { useAuth } from "@/components/auth-provider"
import Link from "next/link"
import Image from "next/image"
import { usePathname } from "next/navigation"
import { motion } from "framer-motion"
import { Button } from "@/components/ui/button"
import {
  BarChart3,
  Bot,
  FileText,
  HeartHandshake,
  LogOut,
  Mail,
  Settings,
  Users,
} from "lucide-react"
import { useTheme } from "next-themes"
import logo from "../../public/logo.png"

const navigationItems = [
  { href: "/dashboard", label: "Dashboard", icon: BarChart3 },
  { href: "/dashboard/agent", label: "Agent", icon: Bot },
  { href: "/dashboard/customers", label: "Relationships", icon: Users },
  { href: "/dashboard/communications", label: "Communications", icon: Mail },
  { href: "/dashboard/surveys", label: "Surveys and Forms", icon: FileText },
  { href: "/dashboard/fundraising", label: "Fundraising", icon: HeartHandshake },
  { href: "/dashboard/settings", label: "Settings", icon: Settings },
]

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const { user, loading, logout } = useAuth()
  const { setTheme } = useTheme()
  const pathname = usePathname()

  useEffect(() => {
    const hydrateThemePreference = async () => {
      try {
        const response = await fetch("/api/user/preferences")
        if (!response.ok) return
        const data = await response.json()
        if (typeof data.theme === "string" && data.theme) {
          setTheme(data.theme)
        }
      } catch {
        // ignore
      }
    }

    void hydrateThemePreference()
  }, [setTheme])

  const handleLogout = async () => {
    await logout()
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background text-foreground">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-primary"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      {/* Header */}
      <header className="bg-card border-b flex-shrink-0">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <Image src={logo} alt="img" className="w-10 h-10" />
                <span className="text-xl font-bold">SleekCRM</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-muted-foreground">Welcome, {user.name || user.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout}>
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1 min-h-0">
        {/* Sidebar */}
        <aside className="w-64 bg-card border-r flex-shrink-0">
          <nav className="p-4 space-y-1">
            {navigationItems.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="flex items-center space-x-3 rounded-md px-3 py-2 text-sm hover:bg-muted transition-colors"
              >
                <item.icon className="h-4 w-4" />
                <span>{item.label}</span>
              </Link>
            ))}
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-auto min-h-0 bg-background">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.45, ease: "easeOut" }}
            className="min-h-full"
          >
            {children}
          </motion.div>
        </main>
      </div>
    </div>
  )
}
