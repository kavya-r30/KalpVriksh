"use client"

import { useEffect, useState, useMemo } from "react"
import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, Calendar, TrendingUp, DollarSign, Award, Bell } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import {
  getParentChildrenByUserId,
  getParentByUserId,
  getStudentAttendance,
  getStudentMarks,
  getStudentFees,
} from "@/lib/api/supabase-queries"
import { getSupabaseClient } from "@/lib/supabase"
import Link from "next/link"
import { useRole } from "@/contexts/role-context"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Line, LineChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer } from "recharts"
import { ChartCard } from "@/components/dashboard/chart-card"

export default function ParentDashboard() {
  const { userId } = useRole()
  const [parent, setParent] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [notifications, setNotifications] = useState<any[]>([])
  const [childrenStats, setChildrenStats] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const supabase = getSupabaseClient()
        const [parentData, childrenData] = await Promise.all([
          getParentByUserId(userId),
          getParentChildrenByUserId(userId),
        ])

        setParent(parentData)
        setChildren(childrenData || [])

        const stats = await Promise.all(
          (childrenData || []).map(async (child: any) => {
            const [attendance, marks, fees] = await Promise.all([
              getStudentAttendance(child.id, 60),
              getStudentMarks(child.id),
              getStudentFees(child.id),
            ])

            const presentDays = attendance?.filter((a) => a.status === "Present").length || 0
            const totalDays = attendance?.length || 1
            const attendanceRate = Math.round((presentDays / totalDays) * 100)

            const avgMarks =
              marks?.length > 0
                ? Math.round(
                    marks.reduce(
                      (sum: number, m: any) => sum + ((m.marks_obtained / m.exam_schedule?.max_marks) * 100 || 0),
                      0,
                    ) / marks.length,
                  )
                : 0

            const totalFee = fees?.reduce((sum: number, f: any) => sum + f.total_amount, 0) || 0
            const paidFee = fees?.reduce((sum: number, f: any) => sum + f.paid_amount, 0) || 0

            return {
              childId: child.id,
              attendanceRate,
              avgMarks,
              attendance,
              pendingFees: totalFee - paidFee,
            }
          }),
        )

        setChildrenStats(stats)

        const { data: notifData } = await supabase
          .from("notification_recipients")
          .select(`
            *,
            notification:notifications(*)
          `)
          .eq("user_id", userId)
          .order("created_at", { ascending: false })
          .limit(5)

        setNotifications(notifData || [])
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const aggregateStats = useMemo(() => {
    if (childrenStats.length === 0) return { avgAttendance: 0, avgPerformance: 0, pendingFees: 0, chartData: [] }

    const totalAttendance = childrenStats.reduce((sum, s) => sum + s.attendanceRate, 0)
    const totalPerformance = childrenStats.reduce((sum, s) => sum + s.avgMarks, 0)
    const totalFees = childrenStats.reduce((sum, s) => sum + s.pendingFees, 0)

    const firstChild = childrenStats[0]
    const monthlyData = new Map()

    firstChild.attendance?.forEach((record: any) => {
      const date = new Date(record.attendance_date)
      const month = date.toLocaleString("default", { month: "short" })

      if (!monthlyData.has(month)) {
        monthlyData.set(month, { present: 0, total: 0 })
      }

      const stats = monthlyData.get(month)
      stats.total++
      if (record.status === "Present") stats.present++
    })

    const chartData = Array.from(monthlyData.entries())
      .map(([month, stats]) => ({
        month,
        rate: Math.round((stats.present / stats.total) * 100),
      }))
      .slice(-6)

    return {
      avgAttendance: Math.round(totalAttendance / childrenStats.length),
      avgPerformance: Math.round(totalPerformance / childrenStats.length),
      pendingFees: totalFees,
      chartData: chartData.length > 0 ? chartData : [{ month: "No Data", rate: 0 }],
    }
  }, [childrenStats])

  const attendanceChartData = useMemo(() => {
    if (childrenStats.length === 0) return []

    const firstChild = childrenStats[0]
    const monthlyData = new Map()

    firstChild.attendance?.forEach((record: any) => {
      const date = new Date(record.attendance_date)
      const month = date.toLocaleString("default", { month: "short" })
      const year = date.getFullYear()
      const key = `${month} ${year}`

      if (!monthlyData.has(key)) {
        monthlyData.set(key, { month: `${month} ${year}`, present: 0, absent: 0, late: 0 })
      }

      const stats = monthlyData.get(key)

      if (record.status === "Present") stats.present++
      else if (record.status === "Absent") stats.absent++
      else if (record.status === "Late") stats.late++
    })

    return Array.from(monthlyData.values()).slice(-6)
  }, [childrenStats])

  const unreadNotifications = notifications.filter((n) => !n.is_read).length

  if (loading || !parent) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight text-balance">
          Welcome back, {parent.first_name} {parent.last_name}!
        </h2>
        <p className="text-muted-foreground mt-1">Monitor your children's academic progress and school activities</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My Children"
          value={children.length.toString()}
          icon={Users}
          description="Enrolled students"
          variant="blue"
        />
        <StatCard
          title="Avg Attendance"
          value={`${aggregateStats.avgAttendance}%`}
          icon={Calendar}
          description="Across all children"
          variant="green"
        />
        <StatCard
          title="Avg Performance"
          value={`${aggregateStats.avgPerformance}%`}
          icon={TrendingUp}
          description="Overall academic score"
          variant="purple"
        />
        <StatCard
          title="Pending Fees"
          value={`₹${aggregateStats.pendingFees.toLocaleString()}`}
          icon={DollarSign}
          description="Total outstanding"
          variant="orange"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <ChartCard
          title="Attendance Trend"
          description="Monthly count of Present, Absent, and Late"
          data={attendanceChartData}
          xAxisKey="month"
          type="bar-multi"
          bars={[
            { key: "present", label: "Present" },
            { key: "absent", label: "Absent" },
            { key: "late", label: "Late" },
          ]}
        />

        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>My Children</CardTitle>
                <CardDescription>Overview of all enrolled children</CardDescription>
              </div>
              <Button variant="outline" size="sm" asChild>
                <Link href="/parent/children">View All</Link>
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {children.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No children records found</p>
              ) : (
                children.slice(0, 3).map((child: any) => (
                  <div
                    key={child.id}
                    className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <Avatar className="h-12 w-12">
                        <AvatarFallback className="bg-primary text-primary-foreground">
                          {child.first_name?.[0]}
                          {child.last_name?.[0]}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <p className="font-medium">
                          {child.first_name} {child.last_name}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {child.current_class?.name} - {child.section?.name}
                        </p>
                      </div>
                    </div>
                    <Button variant="ghost" size="sm" asChild>
                      <Link href={`/parent/children/${child.id}`}>View</Link>
                    </Button>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>Recent Notifications</CardTitle>
                <CardDescription>Important updates about your children</CardDescription>
              </div>
              {unreadNotifications > 0 && <Badge variant="destructive">{unreadNotifications} new</Badge>}
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {notifications.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No notifications</p>
              ) : (
                notifications.map((item) => {
                  const notif = item.notification
                  return (
                    <div key={item.id} className="flex gap-4 pb-4 border-b last:border-0">
                      <div
                        className={`h-10 w-10 rounded-full flex items-center justify-center shrink-0 ${
                          notif?.notification_type === "Fee"
                            ? "bg-orange-100 text-orange-700"
                            : notif?.notification_type === "Exam"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-purple-100 text-purple-700"
                        }`}
                      >
                        {notif?.notification_type === "Fee" ? (
                          <DollarSign className="h-5 w-5" />
                        ) : notif?.notification_type === "Exam" ? (
                          <Award className="h-5 w-5" />
                        ) : (
                          <Bell className="h-5 w-5" />
                        )}
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium text-sm">{notif?.title}</p>
                          {!item.is_read && (
                            <Badge variant="default" className="text-xs">
                              New
                            </Badge>
                          )}
                        </div>
                        <p className="text-sm text-muted-foreground mt-1">{notif?.message}</p>
                        <p className="text-xs text-muted-foreground mt-2">
                          {new Date(item.created_at).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  )
                })
              )}
              <Button variant="outline" className="w-full bg-transparent" asChild>
                <Link href="/parent/messages">View All Messages</Link>
              </Button>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Children Performance Summary</CardTitle>
            <CardDescription>Quick overview of academic progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {children.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No performance data available</p>
            ) : (
              children.map((child) => {
                const childStat = childrenStats.find((cs) => cs.childId === child.id) || {
                  attendanceRate: 0,
                  avgMarks: 0,
                  pendingFees: 0,
                }
                return (
                  <div key={child.id} className="space-y-3">
                    <div className="flex items-center justify-between">
                      <span className="text-sm font-medium">
                        {child.first_name} - {child.current_class?.name}
                      </span>
                      <span className="text-sm text-muted-foreground">{childStat.avgMarks}%</span>
                    </div>
                    <Progress value={childStat.avgMarks} className="h-2" />
                    <div className="grid grid-cols-3 gap-2 text-xs">
                      <div>
                        <span className="text-muted-foreground">Attendance: </span>
                        <span className="font-medium">{childStat.attendanceRate}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Avg Score: </span>
                        <span className="font-medium">{childStat.avgMarks}%</span>
                      </div>
                      <div>
                        <span className="text-muted-foreground">Rank: </span>
                        <span className="font-medium">#5</span>
                      </div>
                    </div>
                  </div>
                )
              })
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
