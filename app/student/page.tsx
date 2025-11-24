"use client"

import { useEffect, useState, useMemo } from "react"
import { StatCard } from "@/components/dashboard/stat-card"
import { ChartCard } from "@/components/dashboard/chart-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar, Award, TrendingUp, DollarSign, MessageSquare, FileText } from "lucide-react"
import {
  getStudentByUserId,
  getStudentAttendance,
  getStudentMarks,
  getStudentFees,
  getUpcomingEvents,
  getStudentSkills,
} from "@/lib/api/supabase-queries"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/contexts/role-context"
import Link from "next/link"
import { Button } from "@/components/ui/button"

export default function StudentDashboard() {
  const { userId } = useRole()
  const [student, setStudent] = useState<any>(null)
  const [attendance, setAttendance] = useState<any[]>([])
  const [marks, setMarks] = useState<any[]>([])
  const [fees, setFees] = useState<any[]>([])
  const [events, setEvents] = useState<any[]>([])
  const [skillsCount, setSkillsCount] = useState(0)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const studentData = await getStudentByUserId(userId)
        if (!studentData) return

        const [attendanceData, marksData, feesData, eventsData, skillsData] = await Promise.all([
          getStudentAttendance(studentData.id, 90),
          getStudentMarks(studentData.id),
          getStudentFees(studentData.id),
          getUpcomingEvents(studentData.id),
          getStudentSkills(studentData.id),
        ])

        setStudent(studentData)
        setAttendance(attendanceData || [])
        setMarks(marksData?.slice(0, 5) || [])
        setFees(feesData || [])
        setEvents(eventsData || [])
        setSkillsCount(skillsData?.length || 0)
      } catch (error) {
        console.error("[v0] Error fetching student dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const attendanceChartData = useMemo(() => {
    const monthlyData = new Map()

    attendance.forEach((record) => {
      const date = new Date(record.attendance_date)
      const month = date.toLocaleString("default", { month: "short" })
      const year = date.getFullYear()
      const key = `${month} ${year}`

      if (!monthlyData.has(key)) {
        monthlyData.set(key, { month, present: 0, absent: 0, late: 0 })
      }

      const stats = monthlyData.get(key)

      if (record.status === "Present") stats.present++
      else if (record.status === "Absent") stats.absent++
      else if (record.status === "Late") stats.late++
    })

    return Array.from(monthlyData.values()).slice(-6)
  }, [attendance])

  const presentDays = attendance.filter((a) => a.status === "Present").length
  const totalDays = attendance.length
  const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : "0"

  const averageMarks =
    marks.length > 0 ? (marks.reduce((sum, m) => sum + (m.marks_obtained || 0), 0) / marks.length).toFixed(1) : "0"

  const totalFees = fees.reduce((sum, f) => sum + f.total_amount, 0)
  const paidFees = fees.reduce((sum, f) => sum + f.paid_amount, 0)
  const pendingFees = totalFees - paidFees

  if (loading || !student) {
    return (
      <div className="flex items-center justify-center h-full">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Welcome back, {student.first_name} {student.last_name}!
          </h2>
          <p className="text-muted-foreground mt-1">
            {student.current_class?.name} - {student.section?.name} | {student.school?.name}
          </p>
        </div>
        <Button
          asChild
          className="hidden sm:flex bg-linear-to-r from-purple-300 to-purple-300/90 hover:from-primary/90 hover:to-blue-300"
        >
          <Link href="/student/fees">
            <DollarSign className="mr-2 h-4 w-4" />
            Pay Fees
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Attendance"
          value={`${attendanceRate}%`}
          icon={Calendar}
          description={`${presentDays}/${totalDays} days present`}
          trend={{ value: 2, isPositive: true }}
          variant="blue"
        />
        <StatCard
          title="Average Score"
          value={`${averageMarks}%`}
          icon={TrendingUp}
          description="Across all subjects"
          trend={{ value: 5, isPositive: true }}
          variant="purple"
        />
        <StatCard
          title="Skills Earned"
          value={skillsCount.toString()}
          icon={Award}
          description="Verified achievements"
          variant="orange"
        />
        <StatCard
          title="Pending Fees"
          value={`₹${pendingFees.toLocaleString()}`}
          icon={DollarSign}
          description="Due this month"
          className={pendingFees > 0 ? "border-red-200 dark:border-red-900" : ""}
          variant="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-7">
        <div className="lg:col-span-4">
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
        </div>
        <div className="lg:col-span-3">
          <Card className="border-border/50 shadow-sm h-full">
            <CardHeader>
              <CardTitle>Recent Marks</CardTitle>
              <CardDescription>Your latest exam scores</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {marks.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No marks available yet</p>
                ) : (
                  marks.map((mark, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-2 rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{mark.exam_schedule?.subject?.name || "Subject"}</p>
                        <p className="text-xs text-muted-foreground">{mark.exam_schedule?.exam?.name || "Exam"}</p>
                      </div>
                      <div className="text-right">
                        <div className="text-lg font-bold">
                          {mark.marks_obtained}/{mark.exam_schedule?.max_marks}
                        </div>
                        <Badge
                          variant={
                            mark.marks_obtained >= mark.exam_schedule?.max_marks * 0.9
                              ? "default"
                              : mark.marks_obtained >= mark.exam_schedule?.max_marks * 0.6
                                ? "secondary"
                                : "destructive"
                          }
                        >
                          {((mark.marks_obtained / mark.exam_schedule?.max_marks) * 100).toFixed(0)}%
                        </Badge>
                      </div>
                    </div>
                  ))
                )}
                <Button variant="outline" className="w-full mt-2 bg-transparent" asChild>
                  <Link href="/student/marks">View All Marks</Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Common tasks for you</CardDescription>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Link href="/student/fees" className="block">
                <div className="flex flex-col items-center justify-center p-4 bg-green-50 dark:bg-green-950/20 border border-green-100 dark:border-green-900/50 rounded-lg hover:bg-green-100 dark:hover:bg-green-900/40 transition-colors text-center h-full">
                  <DollarSign className="h-6 w-6 text-green-600 dark:text-green-400 mb-2" />
                  <span className="text-sm font-medium text-green-900 dark:text-green-300">Pay Fees</span>
                </div>
              </Link>
              <Link href="/student/attendance" className="block">
                <div className="flex flex-col items-center justify-center p-4 bg-blue-50 dark:bg-blue-950/20 border border-blue-100 dark:border-blue-900/50 rounded-lg hover:bg-blue-100 dark:hover:bg-blue-900/40 transition-colors text-center h-full">
                  <Calendar className="h-6 w-6 text-blue-600 dark:text-blue-400 mb-2" />
                  <span className="text-sm font-medium text-blue-900 dark:text-blue-300">Check Attendance</span>
                </div>
              </Link>
              <Link href="/student/messages" className="block">
                <div className="flex flex-col items-center justify-center p-4 bg-purple-50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/50 rounded-lg hover:bg-purple-100 dark:hover:bg-purple-900/40 transition-colors text-center h-full">
                  <MessageSquare className="h-6 w-6 text-purple-600 dark:text-purple-400 mb-2" />
                  <span className="text-sm font-medium text-purple-900 dark:text-purple-300">Messages</span>
                </div>
              </Link>
              <Link href="/student/certificates" className="block">
                <div className="flex flex-col items-center justify-center p-4 bg-orange-50 dark:bg-orange-950/20 border border-orange-100 dark:border-orange-900/50 rounded-lg hover:bg-orange-100 dark:hover:bg-orange-900/40 transition-colors text-center h-full">
                  <FileText className="h-6 w-6 text-orange-600 dark:text-orange-400 mb-2" />
                  <span className="text-sm font-medium text-orange-900 dark:text-orange-300">Certificates</span>
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Fee Status</CardTitle>
              <CardDescription>Your fee payment details</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Total Fees</span>
                <span className="font-semibold">₹{totalFees.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Paid</span>
                <span className="font-semibold text-green-600">₹{paidFees.toLocaleString()}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Pending</span>
                <span className="font-semibold text-red-600">₹{pendingFees.toLocaleString()}</span>
              </div>
              <Progress value={(paidFees / totalFees) * 100} className="mt-4 h-2" />
              <p className="text-xs text-muted-foreground text-center">
                {totalFees > 0 ? ((paidFees / totalFees) * 100).toFixed(0) : 0}% paid
              </p>
            </CardContent>
          </Card>
        </div>

        <Card className="border-border/50 shadow-sm h-full">
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Important dates and announcements</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {events.length > 0 ? (
                events.map((event, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between border-l-4 ${event.color} pl-4 py-3 bg-muted/30 rounded-r-md`}
                  >
                    <div>
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.date}</p>
                    </div>
                    <Badge variant="outline" className="bg-background">
                      {event.type}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">No upcoming events at this time</div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
