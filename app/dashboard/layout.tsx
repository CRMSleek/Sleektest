"use client"
import type React from "react"
import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { BarChart3, Users, FileText, Settings, LogOut, Mail } from "lucide-react"
import logo from "../../public/logo.png"

interface User {
  id: string
  email: string
  name: string
  business?: {
    id: string
    name: string
  }
}

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    checkAuth()
  }, [])

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      } else {
        router.push("/login")
      }
    } catch (error) {
      console.error("Auth check error:", error)
      router.push("/login")
    } finally {
      setLoading(false)
    }
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", { method: "POST" })
      router.push("/")
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-900 text-white">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500"></div>
      </div>
    )
  }

  if (!user) {
    return null
  }

  return (
    <div className="min-h-screen bg-gray-900 text-white">
      {/* Header */}
      <header className="bg-gray-800 border-b border-gray-700">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/dashboard" className="flex items-center space-x-2">
                <Image src={logo} alt="img" className="w-10 h-10" />
                <span className="text-xl font-bold">SleekCRM</span>
              </Link>
            </div>
            <div className="flex items-center space-x-4">
              <span className="text-sm text-gray-300">Welcome, {user.name || user.email}</span>
              <Button variant="outline" size="sm" onClick={handleLogout} className="border-gray-600 bg-gray-900 text-white hover:bg-gray-700">
                <LogOut className="h-4 w-4 mr-2" />
                Logout
              </Button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <aside className="w-64 bg-gray-800 border-r border-gray-700 min-h-screen">
          <nav className="p-6 space-y-2">
            <Link
              href="/dashboard"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-white"
            >
              <BarChart3 className="h-5 w-5" />
              <span>Dashboard</span>
            </Link>
            <Link
              href="/dashboard/surveys"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-white"
            >
              <FileText className="h-5 w-5" />
              <span>Surveys</span>
            </Link>
            <Link
              href="/dashboard/email"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-white"
              >
              <Mail className="h-5 w-5" />
              <span>Email</span>
            </Link>
            <Link
              href="/dashboard/customers"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-white"
            >
              <Users className="h-5 w-5" />
              <span>Customers</span>
            </Link>
            <Link
              href="/dashboard/settings"
              className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors text-white"
            >
              <Settings className="h-5 w-5" />
              <span>Settings</span>
            </Link>
          </nav>
        </aside>

        {/* Main Content */}
        <main className="flex-1 bg-gray-900 text-white">{children}</main>
      </div>
    </div>
  )
}
