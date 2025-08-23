import type React from "react"
import type { Metadata } from "next"
import { Inter } from "next/font/google"
import { AuthProvider } from "@/components/auth-provider"
import "./globals.css"

const inter = Inter({ subsets: ["latin"] })

export const metadata: Metadata = {
  title: "SleekCRM - Customer Relationships, Simplified",
  description:
    "A minimalistic, free, and easy-to-use customer relationship management platform for businesses of all sizes.",
  icons: {
    icon: "icon.png"
  }
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en" className="dark">
      <body className={`${inter.className} bg-gray-900 text-white`}>
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}

