"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { ArrowUp } from "lucide-react"
import { useRole } from "@/contexts/role-context"
import ReactMarkdown from "react-markdown"
import remarkGfm from "remark-gfm"
import remarkBreaks from "remark-breaks"
import Image from "next/image"
import { getSupabaseClient } from "@/lib/supabase"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function ChatbotPage() {
  const { role, userId } = useRole()
  const [parentId, setParentId] = useState<string | null>(null)
  const [messages, setMessages] = useState<Message[]>([])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseClient()

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

  useEffect(() => {
    async function fetchParentId(){
      if (!userId) return
      
      try {
        const { data, error } = await supabase.from("parents").select("id").eq("user_id", userId).single()
        
        if (error) throw error
        
        setParentId(data.id)
      } catch (error) {
        console.error("Error fetching student ID:", error)
      }
    }
    fetchParentId()
  }, [userId])

  useEffect(() => {
    scrollToBottom()
  }, [messages])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!input.trim() || loading) return

    const userMessage = input.trim()
    setInput("")

    setMessages((prev) => [...prev, { role: "user", content: userMessage }])
    setLoading(true)

    try {
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          message: userMessage,
          user_id: parentId,
          role: role,
        }),
      })

      if (!response.ok) {
        throw new Error("Network response was not ok")
      }

      const data = await response.json()

      setMessages((prev) => [...prev, { role: "assistant", content: data.reply }])
    } catch (error) {
      console.error("Error:", error)
      setMessages((prev) => [
        ...prev,
        { role: "assistant", content: "Sorry, I'm having trouble connecting to the school database right now." },
      ])
    } finally {
      setLoading(false)
    }
  }

  if (messages.length === 0) {
    return (
      <div className="h-[calc(100dvh-8rem)] flex flex-col bg-background">
        <div className="flex-1 flex flex-col items-center justify-center px-4">
          <div className="mb-8 flex flex-col items-center">
            <div className="h-16 w-16 rounded-full bg-foreground/5 flex items-center justify-center mb-6">
              <Image src={"../ai.svg"} width={32} height={32} alt="AI" className="h-8 w-8" />
            </div>
            <h1 className="text-2xl font-medium text-foreground mb-2">How can I help you today?</h1>
            <p className="text-muted-foreground text-center max-w-md">
              I can help you with school management tasks, answer questions about students, teachers, and provide
              insights.
            </p>
          </div>

          <div className="flex flex-wrap gap-2 justify-center max-w-2xl mb-8">
            {[
              "Show my child's attendance report",
              "How is my child performing academically?",
              "Do we have any pending fee dues?",
              "What upcoming school events should I know about?"
            ].map((suggestion) => (
              <button
                key={suggestion}
                onClick={() => {
                  setInput(suggestion)
                }}
                className="px-4 py-2.5 rounded-full border border-border bg-background hover:bg-muted/50 text-sm text-foreground transition-colors"
              >
                {suggestion}
              </button>
            ))}
          </div>

          <div className="w-full max-w-2xl">
            <form onSubmit={handleSubmit} className="relative">
              <div className="relative rounded-2xl border border-border bg-muted/30 focus-within:border-foreground/20 focus-within:bg-muted/50 transition-all">
                <Textarea
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Message AI Assistant..."
                  className="min-h-[52px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-3.5 pr-14 text-base placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault()
                      handleSubmit(e)
                    }
                  }}
                />
                <Button
                  type="submit"
                  size="icon"
                  disabled={!input.trim() || loading}
                  className="absolute right-2 bottom-2 h-9 w-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30 disabled:bg-muted-foreground transition-all"
                >
                  <ArrowUp className="h-5 w-5" />
                </Button>
              </div>
              <p className="text-xs text-muted-foreground/60 mt-2 text-center">
                AI can make mistakes. Consider checking important information.
              </p>
            </form>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="h-[calc(100vh-4rem)] flex flex-col bg-background">
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto px-4 py-6">
          {messages.map((message, index) => (
            <div key={index} className={`mb-6 ${message.role === "user" ? "flex justify-end" : ""}`}>
              {message.role === "assistant" ? (
                <div className="flex gap-4">
                  <div className="shrink-0 h-8 w-8 rounded-full bg-foreground/5 flex items-center justify-center">
                    <Image src={"../ai.svg"} width={18} height={18} alt="AI" className="h-[18px] w-[18px]" />
                  </div>
                  <div className="flex-1 pt-1">
                    <div className="text-sm leading-relaxed prose prose-neutral dark:prose-invert max-w-none prose-p:my-2 prose-headings:my-3 prose-ul:my-2 prose-li:my-0.5 prose-pre:bg-muted prose-pre:border prose-pre:border-border">
                      <ReactMarkdown
                        remarkPlugins={[remarkGfm, remarkBreaks]}
                        components={{
                          table: ({ children }) => (
                            <div className="overflow-x-auto my-4">
                              <table className="w-full border-collapse">
                                {children}
                              </table>
                            </div>
                          ),
                          th: ({ children }) => (
                            <th className="border px-3 py-2 bg-muted font-semibold text-left">
                              {children}
                            </th>
                          ),
                          td: ({ children }) => (
                            <td className="border px-3 py-2">
                              {children}
                            </td>
                          ),
                        }}
                      >
                        {message.content}
                      </ReactMarkdown>  
                    </div>
                  </div>
                </div>
              ) : (
                <div className="max-w-[85%] bg-muted rounded-2xl px-4 py-3">
                  <p className="text-sm leading-relaxed">{message.content}</p>
                </div>
              )}
            </div>
          ))}

          {loading && (
            <div className="mb-6 flex gap-4">
              <div className="shrink-0 h-8 w-8 rounded-full bg-foreground/5 flex items-center justify-center">
                <Image src={"../ai.svg"} width={18} height={18} alt="AI" className="h-[18px] w-[18px]" />
              </div>
              <div className="flex-1 pt-2">
                <div className="flex gap-1">
                  <span className="h-2 w-2 bg-foreground/30 rounded-full animate-bounce [animation-delay:-0.3s]" />
                  <span className="h-2 w-2 bg-foreground/30 rounded-full animate-bounce [animation-delay:-0.15s]" />
                  <span className="h-2 w-2 bg-foreground/30 rounded-full animate-bounce" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      <div className="border-t border-border/50 bg-background">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <form onSubmit={handleSubmit} className="relative">
            <div className="relative rounded-2xl border border-border bg-muted/30 focus-within:border-foreground/20 focus-within:bg-muted/50 transition-all">
              <Textarea
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Message AI Assistant..."
                className="min-h-[52px] max-h-[200px] resize-none border-0 bg-transparent px-4 py-3.5 pr-14 text-base placeholder:text-muted-foreground/60 focus-visible:ring-0 focus-visible:ring-offset-0"
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault()
                    handleSubmit(e)
                  }
                }}
              />
              <Button
                type="submit"
                size="icon"
                disabled={!input.trim() || loading}
                className="absolute right-2 bottom-2 h-9 w-9 rounded-lg bg-foreground text-background hover:bg-foreground/90 disabled:opacity-30 disabled:bg-muted-foreground transition-all"
              >
                <ArrowUp className="h-5 w-5" />
              </Button>
            </div>
            <p className="text-xs text-muted-foreground/60 mt-2 text-center">
              AI can make mistakes. Consider checking important information.
            </p>
          </form>
        </div>
      </div>
    </div>
  )
}
