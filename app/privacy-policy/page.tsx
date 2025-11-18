'use client'

import { X } from 'lucide-react'
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'


export default function PrivacyPolicyPage() {
  return (
    <AnimatePresence>
        <motion.div
          className="fixed inset-0 bg-black/70 backdrop-blur-sm z-[9999] flex justify-center items-center overflow-y-auto"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <motion.div
            className="relative max-w-4xl w-full mx-4 my-10 bg-white dark:bg-gray-900 rounded-2xl shadow-2xl p-8 overflow-y-auto max-h-[90vh]"
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0.9, opacity: 0 }}
            transition={{ duration: 0.25 }}
          >
            {/* Close button */}
            <a
              className="absolute top-4 right-4 p-2 rounded-full hover:bg-gray-200 dark:hover:bg-gray-700 transition"
              href='/'
            >
              <X className="w-5 h-5" />
            </a>

            <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">Privacy Policy</h1>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              SleekCRM ("we", "our", or "us") values your privacy. This Privacy Policy explains how we collect,
              use, and protect your information when you use our services.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-4">Information We Collect</h2>
            <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300">
              <li>Name</li>
              <li>Email addresses that you select for AI analysis</li>
              <li>Business name</li>
              <li>Password</li>
              <li>Business website</li>
              <li>Business phone</li>
              <li>Business description</li>
              <li>Business address</li>
              <li>Survey data</li>
            </ul>

            <h2 className="text-2xl font-semibold mt-6 mb-4">How We Use Your Information</h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              We use your information to provide our AI-centered CRM services, including analyzing emails you
              select and survey data to generate insights for your business.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-4">Email Analysis</h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Only emails you explicitly choose for AI analysis are processed. We read message bodies, subject
              lines, and sender/recipient information solely to generate business insights.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-4">Data Storage</h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              Emails and survey data are stored temporarily. Future updates may include long-term storage to
              support AI-powered chatbots. Deletion functionality will be added in a future release.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-4">Third-Party Integrations</h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              We integrate with Google Gmail API, Supabase, and the OpenAI API (powered by Groq). Google
              Analytics may also be used for service improvements. These third-party tools operate under their
              own privacy policies.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-4">User Consent</h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              All data is collected with your consent. Surveys and selected emails are analyzed only after your
              explicit permission.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-4">Global Users & Minors</h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              SleekCRM is available to users globally. Minors may use the platform with parental consent.
            </p>

            <h2 className="text-2xl font-semibold mt-6 mb-4">Contact</h2>
            <p className="mb-4 text-gray-700 dark:text-gray-300">
              If you have any questions regarding this Privacy Policy, please contact us at{' '}
              <a href="mailto:crmsleek@gmail.com" className="text-blue-600 underline">
                crmsleek@gmail.com
              </a>
              .
            </p>

            <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">Last updated: [Insert Date]</p>
          </motion.div>
        </motion.div>
    </AnimatePresence>
  )
}