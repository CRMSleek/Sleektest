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
            href="/"
          >
            <X className="w-5 h-5" />
          </a>

          <h1 className="text-3xl font-bold mb-6 text-gray-900 dark:text-gray-100">
            Privacy Policy
          </h1>

          <p className="mb-4 text-gray-700 dark:text-gray-300">
            SleekCRM ("we", "our", or "us") values your privacy. This Privacy Policy explains how
            we collect, access, use, store, share, retain, and delete your information, including
            Google user data obtained through the Gmail API.
          </p>

          {/* NEW REQUIRED GOOGLE SECTION */}
          <h2 className="text-2xl font-semibold mt-6 mb-4">Google API Data Access</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            SleekCRM requests access only to the specific Google user data required for email
            analysis. We use the following OAuth scopes:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300">
            <li><code>openid</code></li>
            <li><code>https://www.googleapis.com/auth/gmail.readonly</code></li>
            <li><code>https://www.googleapis.com/auth/gmail.send</code></li>
            <li><code>https://www.googleapis.com/auth/userinfo.email</code></li>
          </ul>

          <p className="mb-4 text-gray-700 dark:text-gray-300">
            We only access Gmail messages that you explicitly select. SleekCRM never reads or
            accesses any other emails in your account.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">Information We Collect</h2>
          <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Name</li>
            <li>Email addresses you select for analysis</li>
            <li>
              Gmail message bodies, subject lines, metadata, message IDs, dates, and (when enabled)
              attachments — only for messages you explicitly choose
            </li>
            <li>Business profile information (name, website, phone, description, address)</li>
            <li>Password</li>
            <li>Survey data you submit</li>
          </ul>

          {/* NEW */}
          <h2 className="text-2xl font-semibold mt-6 mb-4">How We Use Google User Data</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            Gmail data is used solely to generate CRM insights for you. Specifically, we use your
            selected email content to:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Analyze customer communication patterns</li>
            <li>Generate summaries and insights</li>
            <li>Support CRM features such as follow-up detection</li>
          </ul>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            Full message text is transmitted to our AI processing endpoint at{" "}
            <code>https://api.groq.com/openai/v1</code> to generate insights. No other third
            parties receive your Gmail data.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">Data Sharing</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            We do <strong>not</strong> sell or share Gmail data with advertisers or unrelated
            third parties. Gmail data is shared only with:
          </p>
          <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300">
            <li>
              <strong>Supabase (PostgreSQL)</strong> — for secure storage of the email data you
              select.
            </li>
            <li>
              <strong>Groq LLM API</strong> — to process message text and generate insights.
            </li>
          </ul>

          <p className="mb-4 text-gray-700 dark:text-gray-300">
            These services only receive data required for functionality and operate under their own
            privacy policies.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">Data Protection & Security</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">We implement industry-standard protections:</p>

          <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300">
            <li>Encryption in transit (HTTPS/TLS)</li>
            <li>Encryption at rest for all stored data</li>
            <li>Role-based access control and least-privilege access</li>
            <li>Secure Supabase/PostgreSQL configuration</li>
            <li>No human access to Gmail data unless needed for debugging with your consent</li>
          </ul>

          <h2 className="text-2xl font-semibold mt-6 mb-4">Data Storage</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            Selected Gmail messages, subject lines, metadata, message IDs, and attachments (once
            enabled) are stored securely in Supabase until removed by the user.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">Data Retention</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            We retain Gmail message data <strong>until you delete it manually</strong> or{" "}
            <strong>delete your account</strong>. If you unselect a previously selected email, it is
            removed from storage.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">Data Deletion</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            You may request deletion of all stored data at any time by contacting{" "}
            <a href="mailto:crmsleek@gmail.com" className="text-blue-600 underline">
              crmsleek@gmail.com
            </a>{" "}
            or by deleting your account.
          </p>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            You may also revoke SleekCRM’s access to your Google account at any time using the
            Google Account Permissions page.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">User Consent</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            Data is processed only after your explicit consent. Only emails you manually choose are
            accessed.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">Global Users & Minors</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            SleekCRM is available globally. Minors may use the platform with parental consent.
          </p>

          <h2 className="text-2xl font-semibold mt-6 mb-4">Contact</h2>
          <p className="mb-4 text-gray-700 dark:text-gray-300">
            For questions, contact{" "}
            <a href="mailto:crmsleek@gmail.com" className="text-blue-600 underline">
              crmsleek@gmail.com
            </a>
            .
          </p>

          <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
            Last updated: 18 November, 2025
          </p>
        </motion.div>
      </motion.div>
    </AnimatePresence>
  )
}