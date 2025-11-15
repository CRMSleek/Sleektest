'use client'
import React from 'react'
import { useState, useEffect } from "react"
import { useEditor, EditorContent } from '@tiptap/react'
import StarterKit from '@tiptap/starter-kit'
import TextAlign from '@tiptap/extension-text-align'
import Underline from '@tiptap/extension-underline'
import { Bold, Italic, Underline as UnderlineIcon, AlignLeft, AlignCenter, AlignRight, List, ListOrdered } from 'lucide-react'
import { Button } from '@/components/ui/button'
import { useToast } from '@/components/ui/use-toast'
import { Upload } from 'lucide-react'

interface EmailSendProps {
  isOpen: boolean
  onClose: () => void
  mode?: 'compose' | 'reply' | 'forward'
  originalEmail?: any
}

function EmailSend({ isOpen, onClose, mode = 'compose', originalEmail }: EmailSendProps) {
  if (!isOpen) return null
  const [OAuth, setOAuth] = useState(true)
  const [subject, setSubject] = useState("")
  const [to, setTo] = useState("")
  const [cc, setCc] = useState("")
  const [bcc, setBcc] = useState("")
  const [showCc, setShowCc] = useState(false)
  const [showBcc, setShowBcc] = useState(false)
  const { toast } = useToast()
  const [files, setFiles] = useState<File[]>([])
  
  const editor = useEditor({
    immediatelyRender: false,
    extensions: [
      StarterKit.configure({
        heading: {
          levels: [1, 2, 3, 4, 5, 6],
        },
      }),
      TextAlign.configure({
        types: ['heading', 'paragraph'],
      }),
      Underline,
    ],
    content: '',
    editorProps: {
      attributes: {
        class: 'focus:outline-none min-h-[300px] p-4 [&_p]:my-2 [&_h1]:text-3xl [&_h1]:font-bold [&_h1]:my-3 [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:my-3 [&_h3]:text-xl [&_h3]:font-bold [&_h3]:my-2 [&_h4]:text-lg [&_h4]:font-bold [&_h4]:my-2 [&_h5]:text-base [&_h5]:font-bold [&_h5]:my-2 [&_h6]:text-sm [&_h6]:font-bold [&_h6]:my-2 [&_ul]:list-disc [&_ul]:ml-6 [&_ol]:list-decimal [&_ol]:ml-6 [&_li]:my-1',
      },
    },
  })

  useEffect(() => {
    if (originalEmail && editor) {
      if (mode === 'reply') {
        setTo(originalEmail.fromEmail || originalEmail.from || '')
        setSubject(originalEmail.subject?.startsWith('Re:') ? originalEmail.subject : `Re: ${originalEmail.subject || ''}`)
        const quotedContent = `<br><br><div style="border-left: 3px solid #ccc; padding-left: 10px; margin-left: 10px;"><p><strong>From:</strong> ${originalEmail.from}</p><p><strong>Date:</strong> ${originalEmail.date}</p><p><strong>Subject:</strong> ${originalEmail.subject}</p><div>${originalEmail.content || originalEmail.html || ''}</div></div>`
        editor.commands.setContent(quotedContent)
      } else if (mode === 'forward') {
        setSubject(originalEmail.subject?.startsWith('Fw:') ? originalEmail.subject : `Fw: ${originalEmail.subject || ''}`)
        const forwardedContent = `<div style="border-left: 3px solid #ccc; padding-left: 10px; margin-left: 10px;"><p><strong>From:</strong> ${originalEmail.from}</p><p><strong>Date:</strong> ${originalEmail.date}</p><p><strong>Subject:</strong> ${originalEmail.subject}</p><p><strong>To:</strong> ${originalEmail.to || ''}</p><div>${originalEmail.content || originalEmail.html || ''}</div></div>`
        editor.commands.setContent(forwardedContent)
      }
    } else if (mode === 'compose') {
      setTo('')
      setSubject('')
      setCc('')
      setBcc('')
      if (editor) {
        editor.commands.clearContent()
      }
    }
  }, [mode, originalEmail, editor, isOpen])
  
  useEffect(() => {
    getOauth()
  }, [])
  
  const getOauth = async () => {
    try {
      const response = await fetch("/api/email")
      const responseJson = await response.json()
      if (response.ok) {
        setOAuth(responseJson.OAuth)
      }
    } catch (error) {
      console.error("Fetch oauth status error", error)
    }
  }

  
  
  
  const sendEmail = async (e: React.FormEvent) => {
    e.preventDefault();
  
    if (!editor) return console.error("Editor not initialized");
    if (!to || !subject) return console.error("Missing required fields");
  
    try {
      const htmlContent = editor.getHTML();
  
      const formData = new FormData();
  
      formData.append(
        "email",
        JSON.stringify({
          to,
          subject,
          body: htmlContent,
          cc: cc || undefined,
          bcc: bcc || undefined,
          mode,
          originalEmailId: mode !== "compose" ? originalEmail?.id : undefined,
          threadId: mode === "reply" ? originalEmail?.threadId : undefined,
        })
      );
  
      files.forEach((file) => {
        formData.append("files", file, file.name);
      });
  
      const response = await fetch("/api/email/send-email", {
        method: "POST",
        body: formData,
      });
  
      const responseJson = await response.json();
  
      if (response.ok) {
        console.log("Email sent successfully");
        toast({
          title: "Email sent",
          description: "Your email has been sent successfully.",
        });
        setTo("");
        setSubject("");
        setCc("");
        setBcc("");
        setShowCc(false);
        setShowBcc(false);
        setFiles([]);
        editor.commands.clearContent();
        onClose();
      } else {
        console.error("Failed to send email:", responseJson.error || responseJson);
        toast({
          title: "Failed to send email",
          description: responseJson.error || "An error occurred while sending the email.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Send email error", error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    }
  };


  if (!editor) {
    return null
  }

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-background border w-full max-w-7xl rounded-2xl shadow-xl p-6 relative">
        <button
          onClick={onClose}
          className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200"
        >
          ✕
        </button>

        <h2 className="text-xl font-semibold mb-4">
          {mode === 'reply' ? 'Reply' : mode === 'forward' ? 'Forward' : 'Compose Email'}
        </h2>

        <form className="flex flex-col gap-3" onSubmit={sendEmail}>
          <input
            type="text"
            placeholder="To (Comma and space separated list for multiple recipients)"
            value={to}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-gray-100"
            onChange={(e) => setTo(e.target.value)}
            required
          />
          <input
            type="text"
            placeholder="Subject"
            value={subject}
            className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-gray-100"
            onChange={(e) => setSubject(e.target.value)}
            required
          />
          <div className="flex gap-2">
            {!showCc && (
              <>
                <button
                  type="button"
                  onClick={() => setShowCc(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Cc
                </button>
              </>
            )}
            {!showBcc && (
              <>
                <button
                  type="button"
                  onClick={() => setShowBcc(true)}
                  className="text-sm text-blue-600 hover:text-blue-800"
                >
                  Bcc
                </button>
              </>
            )}
          </div>
          {showCc && (
            <input
              type="text"
              placeholder="Cc (Comma and space separated list for multiple recipients)"
              value={cc}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-gray-100"
              onChange={(e) => setCc(e.target.value)}
            />
          )}
          {showBcc && (
            <input
              type="text"
              placeholder="Bcc (Comma and space separated list for multiple recipients)"
              value={bcc}
              className="border rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 text-black bg-gray-100"
              onChange={(e) => setBcc(e.target.value)}
            />
          )}
          <div className="border rounded-lg overflow-hidden text-black bg-gray-100">
            {/* Toolbar */}
            <div className="border-b p-2 flex flex-wrap items-center gap-1 bg-muted/50">
              {/* Font Size / Headings */}
              <select
                onChange={(e) => {
                  const value = e.target.value
                  if (value === 'paragraph') {
                    editor.chain().focus().setParagraph().run()
                  } else {
                    editor.chain().focus().toggleHeading({ level: parseInt(value) as 1 | 2 | 3 | 4 | 5 | 6 }).run()
                  }
                }}
                value={
                  editor.isActive('heading', { level: 1 }) ? '1' :
                  editor.isActive('heading', { level: 2 }) ? '2' :
                  editor.isActive('heading', { level: 3 }) ? '3' :
                  editor.isActive('heading', { level: 4 }) ? '4' :
                  editor.isActive('heading', { level: 5 }) ? '5' :
                  editor.isActive('heading', { level: 6 }) ? '6' :
                  'paragraph'
                }
                className="px-2 py-1 text-sm outline-none rounded-md bg-gray-100"
              >
                <option value="paragraph">Normal</option>
                <option value="1">Heading 1</option>
                <option value="2">Heading 2</option>
                <option value="3">Heading 3</option>
                <option value="4">Heading 4</option>
                <option value="5">Heading 5</option>
                <option value="6">Heading 6</option>
              </select>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Text Formatting */}
              <Button
                type="button"
                variant={editor.isActive('bold') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleBold().run()}
                className="h-8 w-8 p-0"
              >
                <Bold className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={editor.isActive('italic') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleItalic().run()}
                className="h-8 w-8 p-0"
              >
                <Italic className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={editor.isActive('underline') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleUnderline().run()}
                className="h-8 w-8 p-0"
              >
                <UnderlineIcon className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Alignment */}
              <Button
                type="button"
                variant={editor.isActive({ textAlign: 'left' }) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('left').run()}
                className="h-8 w-8 p-0"
              >
                <AlignLeft className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={editor.isActive({ textAlign: 'center' }) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('center').run()}
                className="h-8 w-8 p-0"
              >
                <AlignCenter className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={editor.isActive({ textAlign: 'right' }) ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().setTextAlign('right').run()}
                className="h-8 w-8 p-0"
              >
                <AlignRight className="h-4 w-4" />
              </Button>

              <div className="w-px h-6 bg-border mx-1" />

              {/* Lists */}
              <Button
                type="button"
                variant={editor.isActive('bulletList') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleBulletList().run()}
                className="h-8 w-8 p-0"
              >
                <List className="h-4 w-4" />
              </Button>
              <Button
                type="button"
                variant={editor.isActive('orderedList') ? 'default' : 'ghost'}
                size="sm"
                onClick={() => editor.chain().focus().toggleOrderedList().run()}
                className="h-8 w-8 p-0"
              >
                <ListOrdered className="h-4 w-4" />
              </Button>
            </div>

            {/* Editor Content */}
            <div className="min-h-[300px] max-h-[500px] overflow-y-auto">
              <EditorContent editor={editor} />
            </div>
          </div>
          <div className="flex w-full items-center gap-2">
            {/* Scrollable file list */}
            <div className="flex-1 overflow-x-auto">
              {files.length > 0 && (
                <ul className="flex gap-2 min-w-max">
                  {files.map((file, index) => (
                    <li
                      key={index}
                      className="bg-gray-800 text-white px-2 py-1 rounded-xl flex items-center gap-1 whitespace-nowrap"
                    >
                      <span className="max-w-[120px] overflow-hidden text-ellipsis">{file.name}</span>
                      <button
                        type="button"
                        onClick={() => setFiles((prev) => prev.filter((_, i) => i !== index))}
                        className="text-red-600 hover:text-red-800 font-bold"
                      >
                        ✕
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Upload button */}
            <label
              htmlFor="file-upload"
              className="bg-gray-600 text-white px-3 py-2 rounded-xl hover:bg-gray-700 transition-colors flex items-center gap-2 cursor-pointer"
            >
              <Upload className="h-4 w-4" />
              Upload Attachment
            </label>


            <input
              key={files.length} 
              type="file"
              id="file-upload"
              multiple
              className="hidden"
              onChange={(e) => {
                if (!e.target.files) return
                setFiles((prev) => [...prev, ...Array.from(e.target.files)])
                // no need to reset value manually anymore
              }}
            />
          </div>
          <button
            type="submit"
            className="bg-blue-600 text-white font-medium py-2 rounded-xl hover:bg-blue-700 transition-colors"
          >
            Send
          </button>
        </form>
      </div>
    </div>
  )
}

export default EmailSend