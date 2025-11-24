"use client"

import { useEffect, useState } from "react"
import { StatCard } from "@/components/dashboard/stat-card"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Users, ClipboardList, ChevronRight, TrendingUp, CalendarCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { useRole } from "@/contexts/role-context"
import {
  getTeacherStats,
  getTeacherClasses,
  getTeacherClassPerformance,
  getTeacherAttendanceStats,
} from "@/lib/api/supabase-queries"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis, Line, LineChart } from "recharts"
import { AnnouncementsModal } from "@/components/common/announcements-modal"

function TeacherMarksGraph({ data }: { data: any[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[300px] text-muted-foreground">
        No marks data available yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={300}>
      <BarChart data={data} margin={{ top: 20, right: 30, left: 20, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis dataKey="subject" axisLine={false} tickLine={false} />
        <YAxis axisLine={false} tickLine={false} />
        <Tooltip
          cursor={{ fill: "transparent" }}
          contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
        />
        <Bar dataKey="avg" name="Class Average" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
        <Bar dataKey="max" name="Highest Mark" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
      </BarChart>
    </ResponsiveContainer>
  )
}

function TeacherAttendanceGraph({ data }: { data: any[] }) {
  if (data.length === 0) {
    return (
      <div className="flex items-center justify-center h-[200px] text-muted-foreground">
        No attendance data available yet
      </div>
    )
  }

  return (
    <ResponsiveContainer width="100%" height={200}>
      <LineChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
        <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
        <XAxis dataKey="day" axisLine={false} tickLine={false} tick={{ fontSize: 12 }} />
        <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 12 }} domain={[0, 100]} />
        <Tooltip
          cursor={{ stroke: "var(--chart-1)", strokeWidth: 1 }}
          contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
        />
        <Line
          type="monotone"
          dataKey="rate"
          name="Attendance %"
          stroke="var(--chart-3)"
          strokeWidth={2}
          dot={{ r: 4 }}
        />
      </LineChart>
    </ResponsiveContainer>
  )
}

export default function TeacherDashboard() {
  const { userId } = useRole()
  const [stats, setStats] = useState<any>(null)
  const [classes, setClasses] = useState<any[]>([])
  const [performanceData, setPerformanceData] = useState<any[]>([])
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const [statsData, classesData, perfData, attData] = await Promise.all([
          getTeacherStats(userId),
          getTeacherClasses(userId),
          getTeacherClassPerformance(userId),
          getTeacherAttendanceStats(userId),
        ])

        setStats(statsData)
        setClasses(classesData || [])
        setPerformanceData(perfData || [])
        setAttendanceData(attData || [])
      } catch (error) {
        console.error("[v0] Error fetching teacher data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  if (loading || !stats) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const avgAttendance =
    attendanceData.length > 0
      ? Math.round(attendanceData.reduce((sum, d) => sum + d.rate, 0) / attendanceData.length)
      : 0

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">
            Hello, {stats.staff.first_name} {stats.staff.last_name}
          </h2>
          <p className="text-muted-foreground mt-1">Here's what's happening in your classes today.</p>
        </div>
        <div className="flex items-center gap-2">
          <AnnouncementsModal />
          <Button asChild className="bg-primary text-primary-foreground hover:bg-primary/90">
            <Link href="/teacher/announcements">
              <ClipboardList className="mr-2 h-4 w-4" />
              Create Announcement
            </Link>
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="My Classes"
          value={stats.totalClasses}
          icon={Users}
          description="Active classes assigned"
          variant="blue"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents}
          icon={Users}
          description="Across all sections"
          variant="purple"
        />
        <StatCard
          title="Subjects"
          value={stats.totalSubjects}
          icon={ClipboardList}
          description="Subjects you teach"
          variant="orange"
        />
        <StatCard
          title="Avg. Attendance"
          value={`${avgAttendance}%`}
          icon={TrendingUp}
          description="Last 7 days"
          variant="green"
        />
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="col-span-2 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Class Performance</CardTitle>
            <CardDescription>Average vs Highest marks per subject</CardDescription>
          </CardHeader>
          <CardContent>
            <TeacherMarksGraph data={performanceData} />
          </CardContent>
        </Card>

        <div className="space-y-6">
          <Card className="border-border/50 shadow-sm">
            <CardHeader className="flex flex-row items-center justify-between pb-2">
              <CardTitle className="text-lg font-medium">My Classes</CardTitle>
              <Link href="/teacher/classes" className="text-xs text-primary hover:underline flex items-center">
                View All <ChevronRight className="h-3 w-3 ml-1" />
              </Link>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {classes.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No classes assigned yet</p>
                ) : (
                  classes.slice(0, 4).map((cls, i) => (
                    <Link href={`/teacher/classes/${cls.class_id}`} key={i} className="block group">
                      <div className="flex items-center justify-between p-3 rounded-lg border border-border/50 hover:bg-accent hover:border-primary/30 transition-all">
                        <div className="flex items-center gap-3">
                          <Avatar className="h-9 w-9 border border-border group-hover:border-primary/50 transition-colors">
                            <AvatarFallback
                              className={`text-xs font-bold ${i % 3 === 0 ? "bg-chart-1/20 text-chart-1" : i % 3 === 1 ? "bg-chart-2/20 text-chart-2" : "bg-chart-3/20 text-chart-3"}`}
                            >
                              {cls.classes?.name?.substring(0, 2) || "CL"}
                            </AvatarFallback>
                          </Avatar>
                          <div>
                            <p className="font-medium text-sm group-hover:text-primary transition-colors">
                              {cls.classes?.name}
                            </p>
                            <p className="text-xs text-muted-foreground">{cls.subjects?.name}</p>
                          </div>
                        </div>
                        <ChevronRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                      </div>
                    </Link>
                  ))
                )}
              </div>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader className="pb-3">
              <CardTitle className="text-lg font-medium">Quick Actions</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-2 gap-3">
              <Link href="/teacher/attendance" className="block">
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col gap-2 hover:border-primary/50 hover:bg-primary/5 bg-transparent"
                >
                  <CalendarCheck className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium">Attendance</span>
                </Button>
              </Link>
              <Link href="/teacher/marks" className="block">
                <Button
                  variant="outline"
                  className="w-full h-auto py-4 flex flex-col gap-2 hover:border-primary/50 hover:bg-primary/5 bg-transparent"
                >
                  <ClipboardList className="h-5 w-5 text-primary" />
                  <span className="text-xs font-medium">Marks</span>
                </Button>
              </Link>
            </CardContent>
          </Card>
        </div>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Weekly Attendance Trends</CardTitle>
          <CardDescription>Student attendance rate for the past 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          <TeacherAttendanceGraph data={attendanceData} />
        </CardContent>
      </Card>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>My Classes Overview</CardTitle>
          <CardDescription>All classes you teach</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {classes.length > 0 ? (
              classes.map((cls, i) => (
                <div key={i} className="flex items-center justify-between border-b pb-4 last:border-0 last:pb-0">
                  <div className="flex items-center gap-4">
                    <div className="shrink-0 w-20 text-center">
                      <span className="text-xs font-bold text-muted-foreground block">CLASS</span>
                      <span className="text-sm font-bold">{cls.classes?.name}</span>
                    </div>
                    <div>
                      <h4 className="font-medium text-sm">{cls.subjects?.name}</h4>
                      <p className="text-xs text-muted-foreground">{cls.classes?.school?.name}</p>
                    </div>
                  </div>
                  <Badge variant="outline" className="bg-primary/5 text-primary border-primary/20">
                    Active
                  </Badge>
                </div>
              ))
            ) : (
              <p className="text-center text-muted-foreground py-4">No classes assigned yet.</p>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
