"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Send, Search } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useState } from "react"

export default function MessagesPage() {
  const [searchQuery, setSearchQuery] = useState("")

  const messages = [
    {
      id: 1,
      from: "Rajesh Kumar (Parent)",
      subject: "Query about homework",
      preview: "I wanted to ask about the mathematics homework assigned yesterday...",
      timestamp: "2 hours ago",
      unread: true,
    },
    {
      id: 2,
      from: "Priya Sharma (Parent)",
      subject: "Absence notification",
      preview: "My child will be absent tomorrow due to a doctor's appointment...",
      timestamp: "5 hours ago",
      unread: true,
    },
    {
      id: 3,
      from: "Admin Office",
      subject: "Staff meeting reminder",
      preview: "This is a reminder about the staff meeting scheduled for tomorrow...",
      timestamp: "1 day ago",
      unread: false,
    },
    {
      id: 4,
      from: "Amit Patel (Parent)",
      subject: "Thank you note",
      preview: "Thank you for your dedication and support in helping my child improve...",
      timestamp: "2 days ago",
      unread: false,
    },
  ]

  const filteredMessages = searchQuery
    ? messages.filter(
        (m) =>
          m.from.toLowerCase().includes(searchQuery.toLowerCase()) ||
          m.subject.toLowerCase().includes(searchQuery.toLowerCase()),
      )
    : messages

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Messages</h2>
        <p className="text-muted-foreground mt-1">Communicate with parents and school administration</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Inbox</CardTitle>
                <Badge variant="secondary">{messages.filter((m) => m.unread).length} unread</Badge>
              </div>
              <div className="relative pt-2">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search messages..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </CardHeader>
            <CardContent className="space-y-2">
              {filteredMessages.map((message) => (
                <div
                  key={message.id}
                  className={`p-4 rounded-lg border border-border/50 hover:bg-secondary/30 transition-colors cursor-pointer ${
                    message.unread ? "bg-secondary/20" : ""
                  }`}
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-3 flex-1">
                      <Avatar className="h-10 w-10 border border-border">
                        <AvatarFallback className="text-xs">
                          {message.from
                            .split(" ")
                            .map((n) => n[0])
                            .join("")
                            .substring(0, 2)}
                        </AvatarFallback>
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <p className={`text-sm font-medium truncate ${message.unread ? "font-semibold" : ""}`}>
                            {message.from}
                          </p>
                          {message.unread && <span className="h-2 w-2 rounded-full bg-primary flex-shrink-0" />}
                        </div>
                        <p className={`text-sm mt-1 ${message.unread ? "font-medium" : "text-muted-foreground"}`}>
                          {message.subject}
                        </p>
                        <p className="text-xs text-muted-foreground mt-1 truncate">{message.preview}</p>
                      </div>
                    </div>
                    <span className="text-xs text-muted-foreground whitespace-nowrap">{message.timestamp}</span>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </div>

        <div className="lg:col-span-1">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Compose Message</CardTitle>
              <CardDescription>Send a message to parents or administration</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium">To</label>
                <Input placeholder="Recipient email or name" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Subject</label>
                <Input placeholder="Message subject" />
              </div>
              <div className="space-y-2">
                <label className="text-sm font-medium">Message</label>
                <Textarea placeholder="Type your message here..." className="min-h-32 resize-none" />
              </div>
              <Button className="w-full">
                <Send className="mr-2 h-4 w-4" />
                Send Message
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
