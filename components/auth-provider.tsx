"use client"

import type React from "react"
import { createContext, useContext, useEffect, useState } from "react"
import { useRouter, usePathname } from "next/navigation"

type User = {
  id: string
  name: string
  email: string
  role: string
  businessId?: string
}

type AuthContextType = {
  user: User | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  signup: (name: string, email: string, password: string) => Promise<void>
  logout: () => Promise<void>
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [isLoggingOut, setIsLoggingOut] = useState(false)
  const router = useRouter()
  const pathname = usePathname()

  useEffect(() => {
    checkAuth()
  }, [])

  useEffect(() => {
    if (!loading && !isLoggingOut) {
      const publicRoutes = ["/", "/login", "/register", "/features", "/pricing", "/about"]
      const isPublicRoute = publicRoutes.includes(pathname) || pathname.startsWith("/survey/")

      if (!user && !isPublicRoute) {
        router.push("/login")
      } else if (user && (pathname === "/login" || pathname === "/signup")) {
        router.push("/dashboard")
      }
    }
  }, [user, loading, pathname, router, isLoggingOut])

  const checkAuth = async () => {
    try {
      const response = await fetch("/api/auth/me")
      if (response.ok) {
        const data = await response.json()
        setUser(data.user)
      }
    } catch (error) {
      console.error("Auth check failed:", error)
    } finally {
      setLoading(false)
    }
  }

  const login = async (email: string, password: string) => {
    const response = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Login failed")
    }

    const data = await response.json()
    setUser(data.user)
    router.push("/dashboard")
  }

  const signup = async (name: string, email: string, password: string) => {
    const response = await fetch("/api/auth/register", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name, email, password }),
    })

    if (!response.ok) {
      const error = await response.json()
      throw new Error(error.error || "Signup failed")
    }

    const data = await response.json()
    setUser(data.user)
    router.push("/dashboard")
  }

  const logout = async () => {
    setIsLoggingOut(true)
    try {
      setUser(null)
      
      await fetch("/api/auth/logout", { method: "POST" })
      
      router.push("/")
    } catch (error) {
      console.error("Logout error:", error)
      router.push("/")
    } finally {
      setTimeout(() => setIsLoggingOut(false), 1000)
    }
  }

  return <AuthContext.Provider value={{ user, loading, login, signup, logout }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
