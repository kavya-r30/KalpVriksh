"use client"

import type React from "react"

import { useState, useRef, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Textarea } from "@/components/ui/textarea"
import { Card } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Send, Sparkles, User } from "lucide-react"
import { useRole } from "@/contexts/role-context"

interface Message {
  role: "user" | "assistant"
  content: string
}

export default function ChatbotPage() {
  const { userId } = useRole()
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Hello! I'm your AI assistant. I can help you with school management tasks, answer questions about students, teachers, and provide insights. How can I assist you today?",
    },
  ])
  const [input, setInput] = useState("")
  const [loading, setLoading] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }

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

    setTimeout(() => {
      const responses = [
        "That's a great question! Based on your role and access level, I can provide detailed insights about school operations.",
        "I can help you with that. Would you like me to show you relevant statistics or guide you to the appropriate section?",
        "Let me assist you with your request. I have access to your user context and can provide personalized recommendations.",
      ]
      const randomResponse = responses[Math.floor(Math.random() * responses.length)]
      setMessages((prev) => [...prev, { role: "assistant", content: randomResponse }])
      setLoading(false)
    }, 1000)
  }

  return (
    <div className="h-[calc(100vh-8rem)] flex flex-col">
      <div className="mb-6">
        <div className="flex items-center gap-3 mb-2">
          <div className="h-10 w-10 rounded-2xl bg-linear-to-br from-primary to-primary/80 flex items-center justify-center">
            <Sparkles className="h-5 w-5 text-primary-foreground" />
          </div>
          <div>
            <h1 className="text-2xl font-bold">AI Assistant</h1>
            <p className="text-sm text-muted-foreground">Ask me anything about school management</p>
          </div>
        </div>
      </div>

      <Card className="flex-1 flex flex-col overflow-hidden border-border/50 bg-card/50 backdrop-blur-sm">
        <div className="flex-1 overflow-y-auto p-6 space-y-6">
          {messages.map((message, index) => (
            <div key={index} className={`flex gap-4 ${message.role === "user" ? "justify-end" : "justify-start"}`}>
              {message.role === "assistant" && (
                <Avatar className="h-10 w-10 border border-border/50 shrink-0">
                  <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/5 text-primary">
                    <Sparkles className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}
              <div
                className={`max-w-[70%] rounded-2xl px-4 py-3 ${
                  message.role === "user"
                    ? "bg-linear-to-br from-primary to-primary/80 text-primary-foreground"
                    : "bg-muted/50 border border-border/50 text-foreground"
                }`}
              >
                <p className="text-sm leading-relaxed">{message.content}</p>
              </div>
              {message.role === "user" && (
                <Avatar className="h-10 w-10 border border-border/50 shrink-0">
                  <AvatarFallback className="bg-linear-to-br from-secondary/50 to-secondary/20 text-secondary-foreground">
                    <User className="h-5 w-5" />
                  </AvatarFallback>
                </Avatar>
              )}
            </div>
          ))}
          {loading && (
            <div className="flex gap-4">
              <Avatar className="h-10 w-10 border border-border/50 shrink-0">
                <AvatarFallback className="bg-linear-to-br from-primary/20 to-primary/5 text-primary">
                  <Sparkles className="h-5 w-5" />
                </AvatarFallback>
              </Avatar>
              <div className="bg-muted/50 border border-border/50 rounded-2xl px-4 py-3">
                <div className="flex gap-1">
                  <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce" />
                  <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce delay-100" />
                  <div className="h-2 w-2 bg-muted-foreground/50 rounded-full animate-bounce delay-200" />
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form onSubmit={handleSubmit} className="p-4 border-t border-border/50 bg-background/50">
          <div className="flex gap-2">
            <Textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask me anything..."
              className="min-h-[60px] max-h-[120px] resize-none rounded-2xl border-border/50 bg-background/50"
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
              className="h-[60px] w-[60px] rounded-2xl shadow-lg shadow-primary/25 hover:shadow-xl hover:shadow-primary/30"
            >
              <Send className="h-5 w-5" />
            </Button>
          </div>
          <p className="text-xs text-muted-foreground mt-2 text-center">
            User ID: {userId} • Press Enter to send, Shift+Enter for new line
          </p>
        </form>
      </Card>
    </div>
  )
}
