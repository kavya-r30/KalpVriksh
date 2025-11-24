"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getSupabaseClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Bell, MessageSquare, AlertCircle, Info } from "lucide-react"
import { useRole } from "@/contexts/role-context"
import { InlineSelect } from "@/components/ui/inline-select"

export default function MessagesPage() {
  const { userId } = useRole()
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("All")

  useEffect(() => {
    async function fetchNotifications() {
      if (!userId) return

      try {
        const supabase = getSupabaseClient()

        const { data, error } = await supabase
          .from("notification_recipients")
          .select(`
            *,
            notification:notifications(*)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })

        if (error) throw error
        setNotifications(data || [])
      } catch (error) {
        console.error("[v0] Error fetching notifications:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchNotifications()
  }, [userId])

  const markAsRead = async (id: string) => {
    try {
      const supabase = getSupabaseClient()
      await supabase
        .from("notification_recipients")
        .update({ is_read: true, read_at: new Date().toISOString() })
        .eq("id", id)

      setNotifications((prev) => prev.map((notif) => (notif.id === id ? { ...notif, is_read: true } : notif)))
    } catch (error) {
      console.error("[v0] Error marking as read:", error)
    }
  }

  const filteredNotifications =
    filter === "All"
      ? notifications
      : filter === "Unread"
        ? notifications.filter((n) => !n.is_read)
        : notifications.filter((n) => n.notification?.notification_type === filter)

  const unreadCount = notifications.filter((n) => !n.is_read).length

  const getIcon = (type: string) => {
    switch (type) {
      case "Announcement":
        return <Bell className="h-5 w-5" />
      case "Fee":
        return <AlertCircle className="h-5 w-5" />
      case "Exam":
        return <Info className="h-5 w-5" />
      default:
        return <MessageSquare className="h-5 w-5" />
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Messages & Notifications</h2>
          <p className="text-muted-foreground mt-1">Stay updated with school communications</p>
        </div>
        <InlineSelect
          label="Filter"
          value={filter}
          onChange={setFilter}
          options={[
            { label: "All", value: "All" },
            { label: "Unread", value: "Unread" },
            { label: "Announcements", value: "Announcement" },
            { label: "Fees", value: "Fee" },
            { label: "Exams", value: "Exam" },
            { label: "Attendance", value: "Attendance" },
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Messages</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{notifications.length}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Unread</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-orange-600">{unreadCount}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Week</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {
                notifications.filter((n) => {
                  const date = new Date(n.created_at)
                  const weekAgo = new Date()
                  weekAgo.setDate(weekAgo.getDate() - 7)
                  return date > weekAgo
                }).length
              }
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Important</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">
              {
                notifications.filter(
                  (n) => n.notification?.notification_type === "Fee" || n.notification?.notification_type === "Exam",
                ).length
              }
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>All Notifications</CardTitle>
          <CardDescription>
            {filteredNotifications.length} {filter !== "All" ? filter.toLowerCase() : ""} message
            {filteredNotifications.length !== 1 ? "s" : ""}
          </CardDescription>
        </CardHeader>
        <CardContent>
          {filteredNotifications.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No notifications found</p>
          ) : (
            <div className="space-y-3">
              {filteredNotifications.map((item) => {
                const notif = item.notification
                return (
                  <div
                    key={item.id}
                    className={`flex gap-4 p-4 rounded-lg border transition-colors ${
                      !item.is_read ? "bg-primary/5 border-primary/20" : "hover:bg-accent/50"
                    }`}
                  >
                    <div
                      className={`h-10 w-10 rounded-full flex items-center justify-center flex-shrink-0 ${
                        notif?.notification_type === "Fee"
                          ? "bg-orange-100 text-orange-700"
                          : notif?.notification_type === "Exam"
                            ? "bg-blue-100 text-blue-700"
                            : notif?.notification_type === "Announcement"
                              ? "bg-purple-100 text-purple-700"
                              : "bg-gray-100 text-gray-700"
                      }`}
                    >
                      {getIcon(notif?.notification_type || "")}
                    </div>
                    <div className="flex-1 space-y-2">
                      <div className="flex items-start justify-between gap-4">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium">{notif?.title}</p>
                            {!item.is_read && (
                              <Badge variant="default" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground">{notif?.message}</p>
                        </div>
                        <Badge variant="outline" className="whitespace-nowrap">
                          {notif?.notification_type}
                        </Badge>
                      </div>
                      <div className="flex items-center justify-between">
                        <p className="text-xs text-muted-foreground">{new Date(item.created_at).toLocaleString()}</p>
                        {!item.is_read && (
                          <Button variant="ghost" size="sm" onClick={() => markAsRead(item.id)}>
                            Mark as read
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
