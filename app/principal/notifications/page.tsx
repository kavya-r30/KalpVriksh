"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { InlineSelect } from "@/components/ui/inline-select"
import { DataTable } from "@/components/dashboard/data-table"
import { StatCard } from "@/components/dashboard/stat-card"
import {
  Send,
  Bell,
  AlertCircle,
  CheckCircle,
  Clock,
  Users,
  FileText,
  DollarSign,
  Calendar,
  RefreshCw,
  Megaphone,
} from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { getPrincipalDashboardStatsForUser } from "@/lib/api/supabase-queries"
import {
  sendNotification,
  checkAndNotifyLowAttendance,
  checkAndNotifyUpcomingFees,
  checkAndNotifyOverdueFees,
} from "@/lib/api/notification-service"
import { useRole } from "@/contexts/role-context"
import { toast } from "sonner"

export default function PrincipalNotificationsPage() {
  const { userId } = useRole()
  const [schoolId, setSchoolId] = useState<string>("")
  const [classes, setClasses] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [runningAutomation, setRunningAutomation] = useState<string | null>(null)

  // Form state
  const [title, setTitle] = useState("")
  const [message, setMessage] = useState("")
  const [notificationType, setNotificationType] = useState("announcement")
  const [targetAudience, setTargetAudience] = useState("all")
  const [selectedClass, setSelectedClass] = useState("")

  // Stats
  const [notificationStats, setNotificationStats] = useState({
    total: 0,
    today: 0,
    lowAttendance: 0,
    feeReminders: 0,
  })

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchData()
  }, [userId])

  async function fetchData() {
    if (!userId) return

    try {
      const stats = await getPrincipalDashboardStatsForUser(userId)
      setSchoolId(stats.schoolId)

      // Fetch classes
      const { data: classesData } = await supabase
        .from("classes")
        .select("id, name")
        .eq("school_id", stats.schoolId)
        .order("name")

      setClasses(classesData || [])

      // Fetch notifications
      const { data: notificationsData } = await supabase
        .from("notifications")
        .select("*")
        .eq("school_id", stats.schoolId)
        .order("created_at", { ascending: false })
        .limit(50)

      setNotifications(notificationsData || [])

      // Calculate stats
      const today = new Date().toISOString().split("T")[0]
      const todayNotifs = notificationsData?.filter(
        (n) => n.created_at.split("T")[0] === today
      ).length || 0
      const lowAttendanceNotifs = notificationsData?.filter(
        (n) => n.notification_type === "low_attendance"
      ).length || 0
      const feeNotifs = notificationsData?.filter(
        (n) => n.notification_type === "fee_reminder" || n.notification_type === "fee_overdue"
      ).length || 0

      setNotificationStats({
        total: notificationsData?.length || 0,
        today: todayNotifs,
        lowAttendance: lowAttendanceNotifs,
        feeReminders: feeNotifs,
      })
    } catch (error) {
      console.error("[Principal Notifications] Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSendNotification = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!title.trim() || !message.trim() || !userId || !schoolId) return

    setSubmitting(true)
    try {
      const result = await sendNotification({
        school_id: schoolId,
        title: title.trim(),
        message: message.trim(),
        notification_type: notificationType as any,
        target_audience: targetAudience as any,
        sent_by: userId,
        class_id: targetAudience === "class" ? selectedClass : undefined,
      })

      if (result.success) {
        toast.success("Notification sent successfully!")
        setTitle("")
        setMessage("")
        fetchData()
      } else {
        toast.error("Failed to send notification")
      }
    } catch (error) {
      console.error("[Principal Notifications] Error sending notification:", error)
      toast.error("Failed to send notification")
    } finally {
      setSubmitting(false)
    }
  }

  const handleRunAutomation = async (type: "attendance" | "upcoming_fees" | "overdue_fees") => {
    if (!schoolId || !userId) return

    setRunningAutomation(type)
    try {
      let result: { notified: number; students?: string[] }

      switch (type) {
        case "attendance":
          result = await checkAndNotifyLowAttendance(schoolId, 75, userId)
          toast.success(`Low attendance alerts sent to ${result.notified} students`)
          break
        case "upcoming_fees":
          result = await checkAndNotifyUpcomingFees(schoolId, 7, userId)
          toast.success(`Fee reminders sent to ${result.notified} students`)
          break
        case "overdue_fees":
          result = await checkAndNotifyOverdueFees(schoolId, userId)
          toast.success(`Overdue fee alerts sent to ${result.notified} students`)
          break
      }

      fetchData()
    } catch (error) {
      console.error("[Principal Notifications] Automation error:", error)
      toast.error("Failed to run automation")
    } finally {
      setRunningAutomation(null)
    }
  }

  const notificationColumns = [
    {
      key: "title",
      label: "Title",
      render: (record: any) => (
        <div>
          <div className="font-medium">{record.title}</div>
          <div className="text-xs text-muted-foreground line-clamp-1">{record.message}</div>
        </div>
      ),
    },
    {
      key: "notification_type",
      label: "Type",
      render: (record: any) => {
        const typeColors: Record<string, string> = {
          low_attendance: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
          fee_reminder: "bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200",
          fee_overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
          report_card: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
          exam_result: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          announcement: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200",
        }
        return (
          <Badge className={typeColors[record.notification_type] || ""} variant="secondary">
            {record.notification_type?.replace(/_/g, " ")}
          </Badge>
        )
      },
    },
    {
      key: "target_audience",
      label: "Audience",
      render: (record: any) => (
        <div className="flex items-center gap-1">
          <Users className="h-3 w-3 text-muted-foreground" />
          <span className="capitalize">{record.target_audience}</span>
        </div>
      ),
    },
    {
      key: "created_at",
      label: "Sent",
      render: (record: any) => new Date(record.created_at).toLocaleString(),
    },
  ]

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
        <h2 className="text-3xl font-bold tracking-tight">Notification Center</h2>
        <p className="text-muted-foreground mt-1">
          Send notifications and manage automated alerts for students and parents
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Notifications"
          value={notificationStats.total.toString()}
          icon={Bell}
          description="All time"
          variant="blue"
        />
        <StatCard
          title="Sent Today"
          value={notificationStats.today.toString()}
          icon={CheckCircle}
          description="Today's notifications"
          variant="green"
        />
        <StatCard
          title="Attendance Alerts"
          value={notificationStats.lowAttendance.toString()}
          icon={AlertCircle}
          description="Low attendance warnings"
          variant="orange"
        />
        <StatCard
          title="Fee Reminders"
          value={notificationStats.feeReminders.toString()}
          icon={DollarSign}
          description="Payment notifications"
          variant="purple"
        />
      </div>

      <Tabs defaultValue="compose" className="space-y-4">
        <TabsList>
          <TabsTrigger value="compose">Compose</TabsTrigger>
          <TabsTrigger value="automation">Automation</TabsTrigger>
          <TabsTrigger value="history">History</TabsTrigger>
        </TabsList>

        <TabsContent value="compose" className="space-y-4">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Send New Notification</CardTitle>
                <CardDescription>
                  Compose and send notifications to students, parents, or specific classes
                </CardDescription>
              </CardHeader>
              <CardContent>
                <form onSubmit={handleSendNotification} className="space-y-4">
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

                  <div className="grid gap-4 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Type</Label>
                      <InlineSelect
                        placeholder="Select type"
                        value={notificationType}
                        onChange={setNotificationType}
                        options={[
                          { label: "Announcement", value: "announcement" },
                          { label: "Exam Result", value: "exam_result" },
                          { label: "Fee Reminder", value: "fee_reminder" },
                          { label: "Report Card", value: "report_card" },
                        ]}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Target Audience</Label>
                      <InlineSelect
                        placeholder="Select audience"
                        value={targetAudience}
                        onChange={setTargetAudience}
                        options={[
                          { label: "All Users", value: "all" },
                          { label: "All Students", value: "students" },
                          { label: "All Parents", value: "parents" },
                          { label: "All Teachers", value: "teachers" },
                          { label: "Specific Class", value: "class" },
                        ]}
                      />
                    </div>
                  </div>

                  {targetAudience === "class" && (
                    <div className="space-y-2">
                      <Label>Select Class</Label>
                      <InlineSelect
                        placeholder="Choose a class"
                        value={selectedClass}
                        onChange={setSelectedClass}
                        options={classes.map((c) => ({
                          label: c.name,
                          value: c.id,
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

            <Card>
              <CardHeader>
                <CardTitle>Quick Templates</CardTitle>
                <CardDescription>Use pre-built templates for common notifications</CardDescription>
              </CardHeader>
              <CardContent className="space-y-3">
                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setTitle("Parent-Teacher Meeting")
                    setMessage(
                      "Dear Parents, you are invited to the upcoming Parent-Teacher Meeting. Please attend to discuss your child's academic progress and any concerns."
                    )
                    setNotificationType("announcement")
                    setTargetAudience("parents")
                  }}
                >
                  <Calendar className="mr-2 h-4 w-4" />
                  Parent-Teacher Meeting
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setTitle("Exam Schedule Announcement")
                    setMessage(
                      "The examination schedule has been released. Please check the portal for detailed timetable and prepare accordingly."
                    )
                    setNotificationType("announcement")
                    setTargetAudience("students")
                  }}
                >
                  <FileText className="mr-2 h-4 w-4" />
                  Exam Schedule
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setTitle("School Holiday Notice")
                    setMessage(
                      "Please note that the school will remain closed on the mentioned date. Regular classes will resume from the following day."
                    )
                    setNotificationType("announcement")
                    setTargetAudience("all")
                  }}
                >
                  <Bell className="mr-2 h-4 w-4" />
                  Holiday Notice
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setTitle("Fee Payment Reminder")
                    setMessage(
                      "This is a reminder to clear any pending fee payments before the due date to avoid late fees."
                    )
                    setNotificationType("fee_reminder")
                    setTargetAudience("parents")
                  }}
                >
                  <DollarSign className="mr-2 h-4 w-4" />
                  Fee Reminder
                </Button>

                <Button
                  variant="outline"
                  className="w-full justify-start"
                  onClick={() => {
                    setTitle("Results Published")
                    setMessage(
                      "Examination results have been published. Students can view their marks and download report cards from the portal."
                    )
                    setNotificationType("exam_result")
                    setTargetAudience("all")
                  }}
                >
                  <CheckCircle className="mr-2 h-4 w-4" />
                  Results Published
                </Button>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="automation" className="space-y-4">
          <div className="grid gap-4 md:grid-cols-3">
            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <AlertCircle className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Low Attendance Alert</CardTitle>
                    <CardDescription>Students below 75% attendance</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Automatically notify students and parents whose attendance has dropped below the
                  threshold in the last 30 days.
                </p>
                <Button
                  className="w-full"
                  onClick={() => handleRunAutomation("attendance")}
                  disabled={runningAutomation !== null}
                >
                  {runningAutomation === "attendance" ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Alerts
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-orange-100 dark:bg-orange-900/30 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-orange-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Upcoming Fee Reminder</CardTitle>
                    <CardDescription>Fees due within 7 days</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Send reminders to students and parents with pending fees that are due within the
                  next 7 days.
                </p>
                <Button
                  className="w-full"
                  onClick={() => handleRunAutomation("upcoming_fees")}
                  disabled={runningAutomation !== null}
                >
                  {runningAutomation === "upcoming_fees" ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Reminders
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center gap-2">
                  <div className="h-10 w-10 rounded-full bg-red-100 dark:bg-red-900/30 flex items-center justify-center">
                    <DollarSign className="h-5 w-5 text-red-600" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">Overdue Fee Alert</CardTitle>
                    <CardDescription>Past due date payments</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <p className="text-sm text-muted-foreground">
                  Send urgent notifications to students and parents with overdue fee payments that
                  need immediate attention.
                </p>
                <Button
                  className="w-full"
                  variant="destructive"
                  onClick={() => handleRunAutomation("overdue_fees")}
                  disabled={runningAutomation !== null}
                >
                  {runningAutomation === "overdue_fees" ? (
                    <>
                      <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                      Running...
                    </>
                  ) : (
                    <>
                      <Send className="mr-2 h-4 w-4" />
                      Send Alerts
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Automation Tips</CardTitle>
              <CardDescription>Best practices for automated notifications</CardDescription>
            </CardHeader>
            <CardContent>
              <ul className="space-y-2 text-sm text-muted-foreground">
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Run low attendance alerts weekly to ensure timely intervention
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Send fee reminders 7 days before due dates to give parents time to arrange payment
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Follow up on overdue fees with a phone call after the automated notification
                </li>
                <li className="flex items-start gap-2">
                  <CheckCircle className="h-4 w-4 text-green-500 mt-0.5" />
                  Avoid sending too many notifications to prevent notification fatigue
                </li>
              </ul>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="history">
          <DataTable
            title="Notification History"
            description={`Showing ${notifications.length} most recent notifications`}
            data={notifications}
            columns={notificationColumns}
            searchable
            downloadable
          />
        </TabsContent>
      </Tabs>
    </div>
  )
}