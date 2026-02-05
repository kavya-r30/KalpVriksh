"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Send, Users } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { InlineSelect } from "@/components/ui/inline-select"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase"
import { useRole } from "@/contexts/role-context"
import { toast } from "sonner"

export default function NotificationsPage() {
  const { userId } = useRole()
  const [recipientType, setRecipientType] = useState<string>("All")
  const [schoolId, setSchoolId] = useState<string>("")
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [schools, setSchools] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchData() {
      try {
        const { data: schoolsData } = await supabase.from("schools").select("*").order("name")
        setSchools(schoolsData || [])

        const { data: notificationsData } = await supabase
          .from("notifications")
          .select("*")
          .order("created_at", { ascending: false })
          .limit(20)

        setNotifications(notificationsData || [])
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim() || !userId) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          school_id: recipientType === "school" ? schoolId : null,
          title: title.trim(),
          message: message.trim(),
          notification_type: "Announcement",
          sent_by: userId,
          target_audience: recipientType,
        })
        .select()

      if (error) throw error

      setNotifications([data[0], ...notifications])
      setTitle("")
      setMessage("")
      toast.success("Notification sent successfully!")
    } catch (error) {
      console.error("[v0] Error sending notification:", error)
      toast.error("Failed to send notification")
    } finally {
      setSubmitting(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
        <p className="text-muted-foreground mt-1">
          Send announcements and notifications to schools, students, and parents
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Send New Notification</CardTitle>
            <CardDescription>Compose and send notifications to selected recipients</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Notification title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label>Recipient Type</Label>
                <InlineSelect
                  placeholder="Select recipients"
                  value={recipientType}
                  onChange={setRecipientType}
                  options={[
                    { label: "All Users", value: "All" },
                    { label: "All Students", value: "Students" },
                    { label: "All Teachers", value: "Teachers" },
                    { label: "All Parents", value: "Parents" },
                    { label: "Specific School", value: "Staff" },
                  ]}
                />
              </div>

              {recipientType === "school" && (
                <div className="space-y-2">
                  <Label>Select School</Label>
                  <InlineSelect
                    placeholder="Choose a school"
                    value={schoolId}
                    onChange={setSchoolId}
                    options={schools.map((school) => ({
                      label: school.name,
                      value: school.id,
                    }))}
                  />
                </div>
              )}

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your notification message here..."
                  className="min-h-32 resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                <Send className="mr-2 h-4 w-4" />
                {submitting ? "Sending..." : "Send Notification"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Recent Notifications</CardTitle>
            <CardDescription>Previously sent notifications and announcements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {notifications.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No notifications yet</div>
              ) : (
                notifications.map((notification) => (
                  <div
                    key={notification.id}
                    className="p-4 rounded-lg border border-border/50 space-y-2 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{notification.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{notification.message}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Sent
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span className="flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        {notification.recipient_type || "all"}
                      </span>
                      <span>{new Date(notification.created_at).toLocaleDateString()}</span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
