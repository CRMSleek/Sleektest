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
                SleekCRM ("we", "our", or "us") values your privacy. This Privacy Policy explains how we collect, use,
                protect, retain, and delete your information when you use our services.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-4">Information We Collect</h2>
                <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300">
                <li>Name</li>
                <li>Email addresses you select for AI analysis</li>
                <li>Email message bodies, subject lines, and metadata (only for emails you explicitly select)</li>
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
                We use your information to provide AI-centered CRM services, including analyzing emails and survey data
                that you explicitly select to generate insights for your business.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-4">Email Analysis</h2>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                Only emails you explicitly choose for analysis are accessed. We process message content and metadata
                solely to provide insights. We do not read or access any other emails in your Gmail account.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-4">Data Protection & Security</h2>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                We use industry-standard security measures to protect sensitive data, including:
                </p>
                <ul className="list-disc list-inside mb-4 space-y-1 text-gray-700 dark:text-gray-300">
                <li>Encryption in transit (HTTPS/TLS)</li>
                <li>Encryption at rest for all stored data</li>
                <li>Restricted access using the principle of least privilege</li>
                <li>Secure server and database configuration (Supabase/PostgreSQL)</li>
                <li>No human access to raw Gmail data except as required for debugging with your consent</li>
                </ul>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                We do not share or sell sensitive user data. Gmail data is never used for advertising.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-4">Data Retention</h2>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                We retain Gmail message data and survey data only for as long as necessary to provide the requested
                insights. Email content is stored temporarily and may be deleted automatically after processing.
                </p>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                If future features introduce longer-term storage (e.g., chatbot history), users will be notified and
                must opt in.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-4">Data Deletion</h2>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                You may request deletion of all stored data at any time by contacting us at <a href="mailto:crmsleek@gmail.com" className="text-blue-600 underline">crmsleek@gmail.com</a> or deleting your account.
                </p>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                You may also revoke SleekCRM’s access to your Google account at any time via the Google Account
                Permissions page.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-4">Third-Party Integrations</h2>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                We integrate with Google Gmail API, Supabase, and the OpenAI API (powered by Groq). Google Analytics
                may also be used for service improvements. These services operate under their own privacy policies and
                only receive data necessary for functionality.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-4">User Consent</h2>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                All data is collected with your consent. Emails and surveys are analyzed only after your explicit
                permission.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-4">Global Users & Minors</h2>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                SleekCRM is available to users globally. Minors may use the platform with parental consent.
                </p>

                <h2 className="text-2xl font-semibold mt-6 mb-4">Contact</h2>
                <p className="mb-4 text-gray-700 dark:text-gray-300">
                If you have any questions regarding this Privacy Policy, please contact us at <a href="mailto:crmsleek@gmail.com" className="text-blue-600 underline">crmsleek@gmail.com</a>.
                </p>

            <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">Last updated: 18 November, 2025</p>
          </motion.div>
        </motion.div>
    </AnimatePresence>
  )
}