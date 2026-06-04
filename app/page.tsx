"use client"

import Image from "next/image"
import Link from "next/link"
import { type FormEvent, useState } from "react"
import { motion } from "framer-motion"
import {
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Loader2,
  Mail,
  Send,
  Sparkles,
  Users,
} from "lucide-react"
import { MeshGradient } from "@paper-design/shaders-react"
import logo from "../public/logo.png"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type ContactFormState = {
  name: string
  email: string
  company: string
  subject: string
  message: string
}

const features = [
  {
    icon: Bot,
    title: "Agent",
    text: "One click from insight to action.",
  },
  {
    icon: Users,
    title: "Relationships",
    text: "Customers, notes, and next steps.",
  },
  {
    icon: Mail,
    title: "Email",
    text: "Draft, review, and send.",
  },
  {
    icon: BarChart3,
    title: "Dashboards",
    text: "Overview, demographic, satisfaction.",
  },
]

export default function HomePage() {
  const [sending, setSending] = useState(false)
  const [notice, setNotice] = useState("")
  const [status, setStatus] = useState<"idle" | "sending" | "success" | "error">("idle")
  const [form, setForm] = useState<ContactFormState>({
    name: "",
    email: "",
    company: "",
    subject: "",
    message: "",
  })

  const handleSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setSending(true)
    setStatus("sending")
    setNotice("")

    try {
      const response = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      })

      const json = (await response.json()) as { error?: string; message?: string }
      if (!response.ok) throw new Error(json.error || "Unable to send message")

      setStatus("success")
      setNotice(json.message || "Sent.")
      setForm({ name: "", email: "", company: "", subject: "", message: "" })
    } catch (error) {
      setStatus("error")
      setNotice(error instanceof Error ? error.message : "Unable to send message.")
    } finally {
      setSending(false)
    }
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-slate-950 text-white">
      <div className="pointer-events-none absolute inset-0">
        <MeshGradient
          className="absolute inset-0 h-full w-full"
          colors={["#020617", "#0f172a", "#06b6d4", "#0ea5e9", "#f97316"]}
          speed={0.18}
          distortion={0.4}
          swirl={0.24}
          grainMixer={0.12}
          grainOverlay={0.08}
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.22),transparent_28%),radial-gradient(circle_at_bottom_right,rgba(249,115,22,0.14),transparent_26%),linear-gradient(180deg,rgba(2,6,23,0.18),rgba(2,6,23,0.92))]" />
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:88px_88px] opacity-12" />
      </div>

      <header className="fixed inset-x-0 top-0 z-50 border-b border-white/8 bg-slate-950/80 px-4 py-3 backdrop-blur-xl">
        <div className="mx-auto flex max-w-7xl items-center gap-4">
          <Link href="/" className="flex items-center gap-3">
            <Image src={logo} alt="SleekCRM" className="h-9 w-9 rounded-xl" />
            <span className="text-sm font-medium tracking-wide">SleekCRM</span>
          </Link>

          <nav className="ml-auto hidden items-center gap-2 md:flex">
            <Link href="#features" className="rounded-full px-3 py-2 text-sm text-white/70 hover:text-white">
              Features
            </Link>
            <Link href="#contact" className="rounded-full px-3 py-2 text-sm text-white/70 hover:text-white">
              Contact
            </Link>
            <Link href="/login" className="rounded-full px-3 py-2 text-sm text-white/70 hover:text-white">
              Login
            </Link>
          </nav>

          <Button asChild className="rounded-full bg-white text-slate-950 hover:bg-white/90">
            <Link href="/register">
              Get started
              <ArrowRight className="ml-2 h-4 w-4" />
            </Link>
          </Button>
        </div>
      </header>

      <main className="relative mx-auto w-full max-w-7xl px-4 pb-24 pt-32 sm:px-6 lg:px-8">
        <section className="grid gap-16 lg:grid-cols-[1.08fr_0.92fr]">
          <div className="space-y-8 py-6 lg:py-10">
            <motion.div
              initial={{ opacity: 0, y: 14 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
              className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-100"
            >
              <Sparkles className="h-4 w-4 text-cyan-300" />
              Cursor for CRM
            </motion.div>

            <motion.h1
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.05 }}
              className="max-w-3xl text-5xl font-semibold tracking-tight sm:text-6xl lg:text-7xl"
            >
              SleekCRM
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="max-w-xl text-base leading-8 text-white/70 sm:text-lg"
            >
              A minimalistic, free, and easy-to-use customer relationship management platform for businesses and nonprofits of all sizes.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.15 }}
              className="flex flex-wrap gap-3"
            >
              <Button asChild className="rounded-full bg-white px-6 text-slate-950 hover:bg-white/90">
                <Link href="/register">
                  Get started
                  <ArrowRight className="ml-2 h-4 w-4" />
                </Link>
              </Button>
              <Button asChild variant="outline" className="rounded-full border-white/15 bg-white/5 px-6">
                <Link href="#features">See features</Link>
              </Button>
            </motion.div>
          </div>

        </section>

        <section id="features" className="mt-20 grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {features.map((feature, index) => {
            const Icon = feature.icon
            return (
              <motion.div
                key={feature.title}
                initial={{ opacity: 0, y: 18 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true, amount: 0.3 }}
                transition={{ duration: 0.45, delay: index * 0.05 }}
                whileHover={{ y: -4 }}
              >
                <Card className="h-full border-white/10 bg-slate-950/60 shadow-lg shadow-black/10 backdrop-blur">
                  <CardHeader className="space-y-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-2xl border border-white/10 bg-white/5 text-cyan-300">
                      <Icon className="h-5 w-5" />
                    </div>
                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                    <CardDescription className="text-white/60">{feature.text}</CardDescription>
                  </CardHeader>
                </Card>
              </motion.div>
            )
          })}
        </section>

        <section id="contact" className="mt-20">
          <Card className="border-white/10 bg-slate-950/70 backdrop-blur">
            <CardHeader className="space-y-4">
              <div className="inline-flex w-fit items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs uppercase tracking-[0.24em] text-white/50">
                <Building2 className="h-3.5 w-3.5 text-cyan-300" />
                Contact
              </div>
              <CardTitle className="text-3xl">Talk to us.</CardTitle>
              <CardDescription className="text-white/60">
                Setup, product questions, partnerships.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <form className="space-y-6" onSubmit={handleSubmit}>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="name">Name</Label>
                    <Input
                      id="name"
                      value={form.name}
                      onChange={(event) => setForm((prev) => ({ ...prev, name: event.target.value }))}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="email">Email</Label>
                    <Input
                      id="email"
                      type="email"
                      value={form.email}
                      onChange={(event) => setForm((prev) => ({ ...prev, email: event.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="company">Company</Label>
                    <Input
                      id="company"
                      value={form.company}
                      onChange={(event) => setForm((prev) => ({ ...prev, company: event.target.value }))}
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="subject">Subject</Label>
                    <Input
                      id="subject"
                      value={form.subject}
                      onChange={(event) => setForm((prev) => ({ ...prev, subject: event.target.value }))}
                      required
                    />
                  </div>
                </div>

                <div className="space-y-2">
                  <Label htmlFor="message">Message</Label>
                  <Textarea
                    id="message"
                    value={form.message}
                    onChange={(event) => setForm((prev) => ({ ...prev, message: event.target.value }))}
                    className="min-h-[160px]"
                    required
                  />
                </div>

                <div className="flex flex-wrap items-center gap-3">
                  <Button type="submit" className="rounded-full px-6" disabled={sending}>
                    {sending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="mr-2 h-4 w-4" />
                        Send
                      </>
                    )}
                  </Button>
                  {notice ? <p className={`text-sm ${status === "error" ? "text-red-300" : "text-cyan-300"}`}>{notice}</p> : null}
                </div>
              </form>
            </CardContent>
          </Card>
        </section>

        <footer className="mt-16 flex flex-col gap-3 border-t border-white/10 pt-6 text-sm text-white/45 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-center gap-2">
            <Image src={logo} alt="SleekCRM" className="h-6 w-6 rounded-md" />
            <span>SleekCRM</span>
          </div>
          <div className="flex gap-4">
            <Link href="#features" className="hover:text-white/70">
              Features
            </Link>
            <Link href="#contact" className="hover:text-white/70">
              Contact
            </Link>
            <Link href="/login" className="hover:text-white/70">
              Login
            </Link>
          </div>
        </footer>
      </main>
    </div>
  )
}
