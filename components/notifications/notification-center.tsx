"use client"

import { useState, useEffect } from "react"
import { Bell, Check, CheckCheck, AlertCircle, DollarSign, Award, FileText, Calendar, Megaphone } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Separator } from "@/components/ui/separator"
import {
  getUserNotifications,
  getUnreadNotificationCount,
  markNotificationAsRead,
  markAllNotificationsAsRead,
  type NotificationRecipient,
  type NotificationType,
  getUserCreatedNotifications,
} from "@/lib/api/notification-service"
import { useRole } from "@/contexts/role-context"
import { cn } from "@/lib/utils"

const notificationConfig: Record<NotificationType, { icon: typeof Bell; color: string; bgColor: string }> = {
  report_card: { icon: FileText, color: "text-blue-600", bgColor: "bg-blue-100 dark:bg-blue-900/30" },
  low_attendance: { icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  fee_reminder: { icon: DollarSign, color: "text-orange-600", bgColor: "bg-orange-100 dark:bg-orange-900/30" },
  fee_overdue: { icon: AlertCircle, color: "text-red-600", bgColor: "bg-red-100 dark:bg-red-900/30" },
  certificate_ready: { icon: Award, color: "text-purple-600", bgColor: "bg-purple-100 dark:bg-purple-900/30" },
  exam_result: { icon: FileText, color: "text-green-600", bgColor: "bg-green-100 dark:bg-green-900/30" },
  announcement: { icon: Megaphone, color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
  admin_announcement: { icon: Megaphone, color: "text-indigo-600", bgColor: "bg-indigo-100 dark:bg-indigo-900/30" },
}

function formatTimeAgo(dateString: string): string {
  const date = new Date(dateString)
  const now = new Date()
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000)

  if (diffInSeconds < 60) return "Just now"
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`
  return date.toLocaleDateString()
}

export function NotificationCenter() {
  const { userId } = useRole()
  const [notifications, setNotifications] = useState<NotificationRecipient[]>([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(true)
  const [open, setOpen] = useState(false)

  const fetchNotifications = async () => {
    if (!userId) return

    try {
      const [notifs, count] = await Promise.all([
        getUserNotifications(userId, 15),
        getUnreadNotificationCount(userId),
      ])
      setNotifications(notifs)
      setUnreadCount(count)
    } catch (error) {
      console.error("[NotificationCenter] Error fetching notifications:", error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    fetchNotifications()

    const interval = setInterval(fetchNotifications, 60000)
    return () => clearInterval(interval)
  }, [userId])

  const handleMarkAsRead = async (notificationRecipientId: string) => {
    const success = await markNotificationAsRead(notificationRecipientId)
    if (success) {
      setNotifications((prev) =>
        prev.map((n) => (n.id === notificationRecipientId ? { ...n, is_read: true } : n))
      )
      setUnreadCount((prev) => Math.max(0, prev - 1))
    }
  }

  const handleMarkAllAsRead = async () => {
    if (!userId) return
    const success = await markAllNotificationsAsRead(userId)
    if (success) {
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })))
      setUnreadCount(0)
    }
  }

  const getConfig = (type: string) => {
    return notificationConfig[type as NotificationType] || notificationConfig.announcement
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size="icon" className="relative">
          <Bell className="h-5 w-5" />
          {unreadCount > 0 && (
            <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
          )}
          <span className="sr-only">Notifications</span>
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80 md:w-96">
        <div className="flex items-center justify-between p-3 border-b">
          <div className="flex items-center gap-2">
            <h4 className="font-semibold">Notifications</h4>
            {unreadCount > 0 && (
              <Badge variant="secondary" className="text-xs">
                {unreadCount} new
              </Badge>
            )}
          </div>
          {unreadCount > 0 && (
            <Button
              variant="ghost"
              size="sm"
              className="text-xs h-7"
              onClick={handleMarkAllAsRead}
            >
              <CheckCheck className="h-3 w-3 mr-1" />
              Mark all read
            </Button>
          )}
        </div>

        <ScrollArea className="h-[400px]">
          {loading ? (
            <div className="flex items-center justify-center h-32">
              <div className="h-6 w-6 rounded-full border-2 border-primary border-t-transparent animate-spin" />
            </div>
          ) : notifications.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-32 text-muted-foreground">
              <Bell className="h-8 w-8 mb-2 opacity-50" />
              <p className="text-sm">No notifications yet</p>
            </div>
          ) : (
            <div className="divide-y">
              {/* Unread notifications */}
              {notifications
                .filter((item) => !item.is_read)
                .map((item) => {
                  const notif = item.notification
                  if (!notif) return null

                  const config = getConfig(notif.notification_type)
                  const Icon = config.icon

                  return (
                    <div
                      key={item.id}
                      className={cn(
                        "p-3 hover:bg-muted/50 transition-colors cursor-pointer",
                        !item.is_read && "bg-primary/5"
                      )}
                      onClick={() => !item.is_read && handleMarkAsRead(item.id)}
                    >
                      <div className="flex gap-3">
                        <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", config.bgColor)}>
                          <Icon className={cn("h-4 w-4", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-start justify-between gap-2">
                            <p className="text-sm font-semibold">{notif.title}</p>
                            <div className="h-2 w-2 rounded-full bg-primary shrink-0 mt-1.5" />
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(item.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}

              {/* Separator between unread and read */}
              {notifications.some((n) => n.is_read) && <Separator />}

              {/* Read notifications */}
              {notifications
                .filter((item) => item.is_read)
                .map((item) => {
                  const notif = item.notification
                  if (!notif) return null

                  const config = getConfig(notif.notification_type)
                  const Icon = config.icon

                  return (
                    <div
                      key={item.id}
                      className="p-3 hover:bg-muted/50 transition-colors cursor-pointer opacity-60"
                    >
                      <div className="flex gap-3">
                        <div className={cn("h-9 w-9 rounded-full flex items-center justify-center shrink-0", config.bgColor)}>
                          <Icon className={cn("h-4 w-4", config.color)} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm">{notif.title}</p>
                          <p className="text-xs text-muted-foreground mt-0.5 line-clamp-2">{notif.message}</p>
                          <p className="text-xs text-muted-foreground mt-1">{formatTimeAgo(item.created_at)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
            </div>
          )}
        </ScrollArea>


        {notifications.length > 0 && (
          <>
            <Separator />
            <div className="p-2">
              <Button variant="ghost" className="w-full text-sm" size="sm">
                View all notifications
              </Button>
            </div>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
