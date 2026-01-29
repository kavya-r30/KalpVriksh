"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  Bell,
  CheckCheck,
  AlertCircle,
  DollarSign,
  FileText,
  Award,
  Megaphone,
  Calendar,
  Check,
} from "lucide-react"
import {
  getUserNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationRecipient,
  type NotificationType,
} from "@/lib/api/notification-service"
import { useRole } from "@/contexts/role-context"
import { cn } from "@/lib/utils"

const notificationConfig: Record<NotificationType, { icon: typeof Bell; color: string; bgColor: string; label: string }> = {
  report_card: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30", label: "Report Card" },
  low_attendance: { icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30", label: "Attendance Alert" },
  fee_reminder: { icon: DollarSign, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30", label: "Fee Reminder" },
  fee_overdue: { icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30", label: "Fee Overdue" },
  certificate_ready: { icon: Award, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30", label: "Certificate" },
  exam_result: { icon: FileText, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30", label: "Exam Result" },
  announcement: { icon: Megaphone, color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30", label: "Announcement" },
  admin_announcement: { icon: Megaphone, color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30", label: "Announcement" },
}

function formatDate(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInMs = now.getTime() - date.getTime()
  const diffInDays = Math.floor(diffInMs / (1000 * 60 * 60 * 24))

  if (diffInDays === 0) {
    return "Today at " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } else if (diffInDays === 1) {
    return "Yesterday at " + date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
  } else if (diffInDays < 7) {
    return `${diffInDays} days ago`
  } else {
    return date.toLocaleDateString("en-IN", { year: "numeric", month: "short", day: "numeric" })
  }
}

export default function StudentNotificationsPage() {
  const { userId } = useRole()
  const [notifications, setNotifications] = useState<NotificationRecipient[]>([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState("all")

  useEffect(() => {
    fetchNotifications()
  }, [userId])

  async function fetchNotifications() {
    if (!userId) return
    try {
      const data = await getUserNotifications(userId, 50)
      setNotifications(data)
    } catch (error) {
      console.error("[Student Notifications] Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleMarkAsRead = async (notificationRecipientId: string) => {
    const success = await markNotificationAsRead(notificationRecipientId)
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationRecipientId ? { ...n, is_read: true } : n))
      )
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!userId) return
    const success = await markAllNotificationsAsRead(userId)
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
    }
  }

  const getConfig = (type: string) => {
    return notificationConfig[type as NotificationType] || notificationConfig.announcement
  }

  const filteredNotifications = notifications.filter((n) => {
    if (filter === "all") return true
    if (filter === "unread") return !n.is_read
    return n.notification?.notification_type === filter
  })

  const unreadCount = notifications.filter((n) => !n.is_read).length

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Notifications</h2>
          <p className="text-muted-foreground mt-1">
            Stay updated with important announcements and alerts
          </p>
        </div>
        {unreadCount > 0 && (
          <Button variant="outline" onClick={handleMarkAllAsRead}>
            <CheckCheck className="h-4 w-4 mr-2" />
            Mark all as read ({unreadCount})
          </Button>
        )}
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFilter("all")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Bell className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-2xl font-bold">{notifications.length}</p>
                <p className="text-xs text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFilter("unread")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                <AlertCircle className="h-5 w-5 text-blue-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">{unreadCount}</p>
                <p className="text-xs text-muted-foreground">Unread</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFilter("low_attendance")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                <Calendar className="h-5 w-5 text-red-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {notifications.filter((n) => n.notification?.notification_type === "low_attendance").length}
                </p>
                <p className="text-xs text-muted-foreground">Attendance</p>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="cursor-pointer hover:bg-muted/50 transition-colors" onClick={() => setFilter("fee_reminder")}>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                <DollarSign className="h-5 w-5 text-orange-600" />
              </div>
              <div>
                <p className="text-2xl font-bold">
                  {notifications.filter((n) =>
                    n.notification?.notification_type === "fee_reminder" ||
                    n.notification?.notification_type === "fee_overdue"
                  ).length}
                </p>
                <p className="text-xs text-muted-foreground">Fee Alerts</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div>
              <CardTitle>All Notifications</CardTitle>
              <CardDescription>
                {filter === "all"
                  ? "Showing all notifications"
                  : filter === "unread"
                    ? "Showing unread notifications"
                    : `Showing ${filter.replace(/_/g, " ")} notifications`}
              </CardDescription>
            </div>
            {filter !== "all" && (
              <Button variant="ghost" size="sm" onClick={() => setFilter("all")}>
                Clear filter
              </Button>
            )}
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {filteredNotifications.length === 0 ? (
              <div className="text-center py-12 text-muted-foreground">
                <Bell className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No notifications found</p>
              </div>
            ) : (
              filteredNotifications.map((item) => {
                const notif = item.notification
                if (!notif) return null

                const config = getConfig(notif.notification_type)
                const Icon = config.icon

                return (
                  <div
                    key={item.id}
                    className={cn(
                      "flex gap-4 p-4 rounded-lg border transition-colors",
                      !item.is_read ? "bg-primary/5 border-primary/20" : "hover:bg-muted/50"
                    )}
                  >
                    <div
                      className={cn(
                        "h-10 w-10 rounded-full flex items-center justify-center shrink-0",
                        config.bgColor
                      )}
                    >
                      <Icon className={cn("h-5 w-5", config.color)} />
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <p className={cn("font-medium", !item.is_read && "font-semibold")}>
                              {notif.title}
                            </p>
                            <Badge variant="outline" className="text-xs">
                              {config.label}
                            </Badge>
                            {!item.is_read && (
                              <Badge variant="default" className="text-xs">
                                New
                              </Badge>
                            )}
                          </div>
                          <p className="text-sm text-muted-foreground mt-1">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-2">
                            {formatDate(item.created_at)}
                          </p>
                        </div>
                        {!item.is_read && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="shrink-0"
                            onClick={() => handleMarkAsRead(item.id)}
                          >
                            <Check className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
