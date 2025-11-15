'use client'
import React from "react"
import DOMPurify from "dompurify"

interface EmailViewProps {
  isOpen: boolean
  onClose: () => void
  emailId: any
  onReply?: (email: any) => void
  onForward?: (email: any) => void
}

function EmailView({ isOpen, onClose, emailId, onReply, onForward }: EmailViewProps) {
  if (!isOpen) return null

  const safeHTML = DOMPurify.sanitize(emailId?.html || emailId?.content || "")

  const handleReply = () => {
    if (onReply) {
      onReply(emailId)
    }
    onClose()
  }

  const handleForward = () => {
    if (onForward) {
      onForward(emailId)
    }
    onClose()
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border w-full max-w-7xl rounded-2xl shadow-xl p-6 relative overflow-y-auto max-h-[90vh] flex flex-col">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold text-white mb-4">Email</h2>

        <div className="flex flex-col gap-3 mb-4">
          <p className="border rounded-lg px-3 py-2 bg-gray-100 text-black">
            <strong>From:</strong> {emailId?.from}
          </p>
          <p className="border rounded-lg px-3 py-2 bg-gray-100 text-black">
            <strong>Subject:</strong> {emailId?.subject}
          </p>
          <p className="border rounded-lg px-3 py-2 bg-gray-100 text-black">
            <strong>Date:</strong> {emailId?.date}
          </p>
        </div>

        {/* Render full HTML body safely */}
        <div
          className="border rounded-lg p-4 bg-white text-black prose max-w-none flex-1 overflow-y-auto mb-4"
          dangerouslySetInnerHTML={{ __html: safeHTML }}
        />

        {/* Reply and Forward buttons */}
        <div className="flex gap-3 justify-end pt-4 border-t">
          <button
            onClick={handleReply}
            className="bg-blue-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-blue-700 transition-colors"
          >
            Reply
          </button>
          <button
            onClick={handleForward}
            className="bg-gray-600 text-white font-medium py-2 px-4 rounded-lg hover:bg-gray-700 transition-colors"
          >
            Forward
          </button>
        </div>
      </div>
    </div>
  )
}

export default EmailView