"use client"

import { useEffect, useState } from "react"
import { StatCard } from "@/components/dashboard/stat-card"
import { ChartCard } from "@/components/dashboard/chart-card"
import { DataTable } from "@/components/dashboard/data-table"
import { Users, GraduationCap, Calendar, TrendingUp } from "lucide-react"
import {
  getPrincipalDashboardStatsForUser,
  getStudents,
  getSupabaseClient,
  getPrincipalUpcomingEvents,
  getPrincipalPerformanceStats,
  getPrincipalFeeStats,
} from "@/lib/api/supabase-queries"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Progress } from "@/components/ui/progress"
import { useRole } from "@/contexts/role-context"
import { Badge } from "@/components/ui/badge"
import { ResponsiveContainer, BarChart, CartesianGrid, XAxis, YAxis, Bar } from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

export default function PrincipalDashboard() {
  const { userId } = useRole()
  const [stats, setStats] = useState<any>(null)
  const [students, setStudents] = useState<any[]>([])
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [upcomingEvents, setUpcomingEvents] = useState<any[]>([])
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [feeStats, setFeeStats] = useState({ tuition: 0, exam: 0, library: 0 })
  const [subjectMarksData, setSubjectMarksData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const statsData = await getPrincipalDashboardStatsForUser(userId)
        const studentsData = await getStudents(statsData.schoolId)

        const today = new Date()
        const weekDays = []
        for (let i = 13; i >= 0; i--) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          weekDays.push(d)
        }

        const { data: studentRows } = await supabase.from("students").select("id").eq("school_id", statsData.schoolId)

        const studentIds = studentRows?.map((s) => s.id) ?? []

        const attendancePromises = weekDays.map(async (date) => {
          const dateStr = date.toISOString().split("T")[0]

          if (studentIds.length === 0)
            return { day: date.toLocaleDateString("en-US", { weekday: "short" }), attendance: 0 }

          const { data, error } = await supabase
            .from("attendance")
            .select("status")
            .eq("attendance_date", dateStr)
            .in("student_id", studentIds)

          if (error) throw error

          const present = data?.filter((a) => a.status === "Present").length ?? 0
          const total = data?.length ?? 1
          const percentage = Math.round((present / total) * 100)

          return {
            day: date.toLocaleDateString("en-US", { weekday: "short" }),
            attendance: isNaN(percentage) ? 0 : percentage,
          }
        })

        const weekAttendance = await Promise.all(attendancePromises)

        const [events, performance, fees] = await Promise.all([
          getPrincipalUpcomingEvents(statsData.schoolId),
          getPrincipalPerformanceStats(statsData.schoolId),
          getPrincipalFeeStats(statsData.schoolId),
        ])

        const { data: marksRaw, error } = await supabase
          .from("marks")
          .select(`
            marks_obtained,
            is_absent,
            exam_schedule:exam_schedule_id (
              max_marks,
              subject_id,
              subjects:subject_id (
                name
              )
            )
          `)
          .in("student_id", studentIds)

        if (marksRaw) {
          const subjectStats: any = {}

          marksRaw.forEach((mark: any) => {
            const subjectName = mark.exam_schedule?.subjects?.name || "Unknown"

            if (!subjectStats[subjectName]) {
              subjectStats[subjectName] = { total: 0, count: 0 }
            }

            const obtained = parseFloat(mark.marks_obtained ?? 0)
            const maxMarks = parseFloat(mark.exam_schedule?.max_marks ?? 100)

            const percentage = (obtained / maxMarks) * 100

            subjectStats[subjectName].total += percentage
            subjectStats[subjectName].count++
          })

          const subjectChart = Object.entries(subjectStats).map(
            ([subject, data]: [string, any]) => ({
              subject,
              average: Math.round(data.total / data.count),
            }),
          )

          setSubjectMarksData(subjectChart)
        }

        setStats(statsData)
        setStudents(studentsData?.slice(0, 5) || [])
        setAttendanceData(weekAttendance)
        setUpcomingEvents(events)
        setPerformanceData(performance)
        setFeeStats(fees)
      } catch (error) {
        console.error("Error fetching principal dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const studentColumns = [
    {
      key: "name",
      label: "Student Name",
      render: (s: any) => `${s.first_name} ${s.last_name}`,
    },
    { key: "admission_number", label: "Admission No." },
    {
      key: "class",
      label: "Class",
      render: (s: any) => <Badge variant="secondary">{s.current_class?.name || "Not Assigned"}</Badge>,
    },
    { key: "roll_number", label: "Roll No." },
  ]

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">
          Welcome back, {stats.staff.first_name} {stats.staff.last_name}
        </h2>
        <p className="text-muted-foreground mt-1">Here's an overview of {stats.staff.schools?.name} today</p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={GraduationCap}
          description="Enrolled this year"
          variant="blue"
        />
        <StatCard
          title="Teaching Staff"
          value={stats.totalTeachers}
          icon={Users}
          description="Active teachers"
          variant="purple"
        />
        <StatCard
          title="Total Classes"
          value={stats.totalClasses}
          icon={Calendar}
          description="All classes"
          variant="orange"
        />
        <StatCard
          title="Present Today"
          value={stats.presentToday}
          icon={Calendar}
          description={`${stats.totalStudents > 0 ? Math.round((stats.presentToday / stats.totalStudents) * 100) : 0}% attendance rate`}
          variant="green"
        />
      </div>

      <ChartCard
        title="Weekly Attendance"
        description="Student attendance percentage for the past week"
        data={attendanceData}
        dataKey="attendance"
        xAxisKey="day"
        type="bar"
      />

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-chart-2" />
              Subject-wise Performance
            </CardTitle>
            <CardDescription>Average marks across all subjects</CardDescription>
          </CardHeader>
          <CardContent>
            {subjectMarksData.length > 0 ? (
              <ChartContainer
                config={{
                  average: {
                    label: "Average Marks",
                    color: "var(--chart-2)",
                  },
                }}
                className="h-[250px]"
              >
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={subjectMarksData}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="subject" axisLine={false} tickLine={false} tick={{ fontSize: 11 }} />
                    <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="average" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[250px] text-muted-foreground">
                No performance data available
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Fee Collection Status</CardTitle>
            <CardDescription>Current academic year fee collection progress</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Tuition Fees</span>
                <span className="font-medium text-primary">{feeStats.tuition}%</span>
              </div>
              <Progress value={feeStats.tuition} className="h-2 bg-primary/10" />
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Exam Fees</span>
                <span className="font-medium text-chart-2">{feeStats.exam}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-chart-2/10">
                <div className="h-full bg-chart-2 transition-all" style={{ width: `${feeStats.exam}%` }} />
              </div>
            </div>
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span className="text-muted-foreground">Library Fees</span>
                <span className="font-medium text-chart-3">{feeStats.library}%</span>
              </div>
              <div className="h-2 w-full overflow-hidden rounded-full bg-chart-3/10">
                <div className="h-full bg-chart-3 transition-all" style={{ width: `${feeStats.library}%` }} />
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Upcoming Events</CardTitle>
            <CardDescription>Recent announcements and important dates</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {upcomingEvents.length > 0 ? (
                upcomingEvents.map((event, i) => (
                  <div
                    key={i}
                    className={`flex items-center justify-between border-l-2 ${event.color} pl-4 py-2 bg-muted/30 rounded-r-md`}
                  >
                    <div>
                      <p className="font-medium text-sm">{event.title}</p>
                      <p className="text-xs text-muted-foreground">{event.date}</p>
                    </div>
                    <Badge variant="outline" className="text-xs bg-background">
                      {event.type}
                    </Badge>
                  </div>
                ))
              ) : (
                <div className="text-center text-sm text-muted-foreground py-8">No recent announcements</div>
              )}
            </div>
          </CardContent>
        </Card>

        <DataTable
          title="Recent Student Enrollments"
          description="Latest students enrolled in the school"
          data={students}
          columns={studentColumns}
        />
      </div>
    </div>
  )
}
