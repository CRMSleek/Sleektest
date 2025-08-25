'use client'
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import Image from "next/image"
import { CheckCircle, Users, BarChart3 } from "lucide-react"
import { motion, useScroll, useTransform } from "framer-motion"
import { useState, useEffect } from "react"
import logo from '../public/logo.png'

export default function HomePage() {
  const [isScrolled, setIsScrolled] = useState(false)
  const { scrollY } = useScroll()
  const navbarOpacity = useTransform(scrollY, [0, 100], [0, 1])
  const navbarY = useTransform(scrollY, [0, 100], [-100, 0])

  useEffect(() => {
    const handleScroll = () => {
      setIsScrolled(window.scrollY > 100)
    }

    window.addEventListener('scroll', handleScroll)
    return () => window.removeEventListener('scroll', handleScroll)
  }, [])

  const heroVariants = {
    hidden: { opacity: 0, y: 40 },
    visible: { opacity: 1, y: 0, transition: { duration: 0.7 } },
  }
  const subheadingVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0, transition: { delay: 0.2, duration: 0.7 } },
  }
  const buttonVariants = {
    hidden: { opacity: 0, y: 10 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: 0.4 + i * 0.1, duration: 0.5 } }),
  }
  const featureCardVariants = {
    hidden: { opacity: 0, y: 30 },
    visible: (i: number) => ({ opacity: 1, y: 0, transition: { delay: i * 0.15, duration: 0.6 } }),
  }
  const pageFade = {
    hidden: { opacity: 0 },
    visible: { opacity: 1, transition: { duration: 0.5 } },
    exit: { opacity: 0, transition: { duration: 0.3 } },
  }

  return (
    <motion.div
      className="min-h-screen bg-gray-900 text-white"
      initial="hidden"
      animate="visible"
      exit="exit"
      variants={pageFade}
    >
      {/* Floating Navbar */}
      <motion.header 
        className="fixed top-3 left-0 right-0 z-50 flex justify-center"
        style={{ 
          opacity: navbarOpacity,
          y: navbarY,
          pointerEvents: isScrolled ? 'auto' : 'none'
        }}
        transition={{ type: 'spring', stiffness: 260, damping: 26 }}
      >
        <motion.div
          className="bg-gray-900/90 backdrop-blur-xl border border-gray-800/60 shadow-2xl rounded-full px-6 py-3 flex items-center gap-6"
          style={{ scale: useTransform(scrollY, [0, 100], [0.95, 1]) }}
        >
          <Link href="/" className="flex items-center gap-2 hover:opacity-90">
            <Image src={logo} alt="img" className="w-7 h-7" />
            <span className="text-sm font-semibold">SleekCRM</span>
          </Link>
          <nav className="hidden sm:flex items-center gap-5 text-sm text-gray-300">
            <Link href="#features" className="hover:text-white transition-colors">Features</Link>
            <Link href="/login" className="hover:text-white transition-colors">Login</Link>
          </nav>
          <Link href="/register" className="ml-auto">
            <Button variant="sleek" shape="pill" className="px-5 py-2 text-sm">Check it out</Button>
          </Link>
        </motion.div>
      </motion.header>

      {/* Main Header */}
      <header className="border-b border-gray-800">
        <div className="container mx-auto px-4 py-4">
          <nav className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <Image src={logo} alt="img" className="w-10 h-10" />
              <span className="text-xl font-bold">SleekCRM</span>
            </div>
            <div className="hidden md:flex items-center space-x-8">
              <Link href="#features" className="hover:text-gray-300 transition-colors">
                Features
              </Link>
              <Link href="/login" className="hover:text-gray-300 transition-colors">
                Login
              </Link>
              <Link href="/register">
                <Button variant="sleek" shape="pill" className="px-6">Check it out</Button>
              </Link>
            </div>
          </nav>
        </div>
      </header>

      {/* Hero Section - Perfectly Centered */}
      <section className="flex items-center justify-center min-h-[80vh] px-4">
        <div className="text-center max-w-4xl mx-auto">
          <motion.h1
            className="text-4xl md:text-6xl font-bold mb-6 leading-tight"
            initial="hidden"
            animate="visible"
            variants={heroVariants}
          >
            Customer Relationships, <span className="text-blue-400">Simplified</span>
          </motion.h1>
          <motion.p
            className="text-xl md:text-2xl text-gray-300 mb-8 max-w-3xl mx-auto leading-relaxed"
            initial="hidden"
            animate="visible"
            variants={subheadingVariants}
          >
            A minimalistic, free, and easy-to-use customer relationship management platform for businesses of all sizes.
          </motion.p>
          <div className="flex flex-col sm:flex-row gap-4 justify-center items-center">
            <motion.div
              custom={0}
              initial="hidden"
              animate="visible"
              variants={buttonVariants}
            >
              <Link href="/register">
                <Button size="lg" className="bg-blue-500 hover:bg-blue-600 text-white px-8 py-3 text-lg">
                  Get Started →
                </Button>
              </Link>
            </motion.div>
            <motion.div
              custom={1}
              initial="hidden"
              animate="visible"
              variants={buttonVariants}
            >
              <Link href="#features">
                <Button
                  variant="outline"
                  size="lg"
                  className="border-gray-400 text-gray-300 hover:bg-gray-700 hover:text-white px-8 py-3 text-lg"
                >
                  Learn More
                </Button>
              </Link>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Key Features Section - Centered */}
      <section id="features" className="py-20 px-4">
        <div className="container mx-auto max-w-6xl">
          <h2 className="text-3xl md:text-4xl font-bold text-center mb-16">Key Features</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            {[
              {
                icon: <CheckCircle className="h-8 w-8 text-white" />, bg: "bg-blue-500", title: "Customizable Surveys", desc: "Create tailored surveys with multiple question types to gather exactly the feedback you need from your customers.",
              },
              {
                icon: <Users className="h-8 w-8 text-white" />, bg: "bg-green-500", title: "Customer Profiles", desc: "Automatically generate detailed customer profiles from survey responses and manage all your customer data in one place.",
              },
              {
                icon: <BarChart3 className="h-8 w-8 text-white" />, bg: "bg-purple-500", title: "AI-Driven Insights", desc: "Get intelligent insights and analytics from your customer data to make informed business decisions.",
              },
            ].map((feature, i) => (
              <motion.div
                key={feature.title}
                custom={i}
                initial="hidden"
                whileInView="visible"
                viewport={{ once: true, amount: 0.3 }}
                variants={featureCardVariants}
              >
                <Card className="bg-gray-800 border-gray-700 text-center h-full">
                  <CardContent className="p-8 flex flex-col h-full">
                    <div className={`w-16 h-16 ${feature.bg} rounded-full flex items-center justify-center mx-auto mb-6`}>
                      {feature.icon}
                    </div>
                    <h3 className="text-xl font-semibold mb-4 text-white">{feature.title}</h3>
                    <p className="text-gray-300 leading-relaxed mt-auto">{feature.desc}</p>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-800 py-8 px-4">
        <div className="container mx-auto max-w-6xl">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <div className="flex items-center space-x-2 mb-4 md:mb-0">
              <BarChart3 className="h-6 w-6" />
              <span className="font-semibold">SleekCRM</span>
            </div>
            <div className="flex space-x-6 text-sm text-gray-400">
              <Link href="/privacy" className="hover:text-white transition-colors">
                Privacy Policy
              </Link>
              <Link href="/terms" className="hover:text-white transition-colors">
                Terms of Service
              </Link>
              <Link href="/contact" className="hover:text-white transition-colors">
                Contact
              </Link>
            </div>
          </div>
          <div className="text-center mt-4 pt-4 border-t border-gray-800 text-gray-400 text-sm">
            © 2025 SleekCRM. All rights reserved.
          </div>
        </div>
      </footer>
    </motion.div>
  )
}
