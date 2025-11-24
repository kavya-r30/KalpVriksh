"use client"

import type React from "react"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Send } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { useState, useEffect } from "react"
import { getSupabaseClient } from "@/lib/supabase"
import { useRole } from "@/contexts/role-context"
import { getStaffByUserId } from "@/lib/api/supabase-queries"
import { toast } from "sonner"

export default function TeacherAnnouncementsPage() {
  const { userId } = useRole()
  const [announcements, setAnnouncements] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [staffId, setStaffId] = useState<string | null>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const staff = await getStaffByUserId(userId)
        setSchoolId(staff.school_id)
        setStaffId(staff.id)

        const { data, error } = await supabase
          .from("notifications")
          .select("*")
          .eq("school_id", staff.school_id)
          .eq("sent_by", staff.id)
          .order("created_at", { ascending: false })

        if (error) throw error
        setAnnouncements(data || [])
      } catch (error) {
        console.error("[v0] Error fetching announcements:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim() || !schoolId || !userId) return

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from("notifications")
        .insert({
          school_id: schoolId,
          title: title.trim(),
          message: message.trim(),
          notification_type: "Announcement",
          sent_by: staffId,
        })
        .select()

      if (error) throw error

      setAnnouncements([data[0], ...announcements])
      setTitle("")
      setMessage("")
      toast.success("Announcement posted successfully!")
    } catch (error) {
      console.error("[v0] Error creating announcement:", error)
      toast.error("Failed to post announcement")
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
        <h2 className="text-3xl font-bold tracking-tight">Announcements</h2>
        <p className="text-muted-foreground mt-1">Create and manage announcements for your school</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">Create Announcement</CardTitle>
            <CardDescription>Post a new announcement for students and parents</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="title">Title</Label>
                <Input
                  id="title"
                  placeholder="Announcement title"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="message">Message</Label>
                <Textarea
                  id="message"
                  placeholder="Type your announcement message here..."
                  className="min-h-32 resize-none"
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  required
                />
              </div>

              <Button type="submit" className="w-full" disabled={submitting}>
                <Send className="mr-2 h-4 w-4" />
                {submitting ? "Posting..." : "Post Announcement"}
              </Button>
            </form>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-xl">My Announcements</CardTitle>
            <CardDescription>Your previously posted announcements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3 max-h-[500px] overflow-y-auto">
              {announcements.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">No announcements yet</div>
              ) : (
                announcements.map((announcement) => (
                  <div
                    key={announcement.id}
                    className="p-4 rounded-lg border border-border/50 space-y-2 hover:bg-secondary/30 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex-1">
                        <h4 className="font-medium text-sm">{announcement.title}</h4>
                        <p className="text-xs text-muted-foreground mt-1">{announcement.message}</p>
                      </div>
                      <Badge variant="secondary" className="text-xs">
                        Posted
                      </Badge>
                    </div>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{new Date(announcement.created_at).toLocaleDateString()}</span>
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
