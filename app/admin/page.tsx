"use client"

import { useEffect, useState } from "react"
import { StatCard } from "@/components/dashboard/stat-card"
import { DataTable } from "@/components/dashboard/data-table"
import {
  School,
  Users,
  GraduationCap,
  UserCircle,
  ArrowUpRight,
  Activity,
  Clock,
  TrendingUp,
  IndianRupee,
} from "lucide-react"
import { getAdminDashboardStats, getSchools, getSupabaseClient } from "@/lib/api/supabase-queries"
import { Button } from "@/components/ui/button"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, ResponsiveContainer, Cell, LineChart, Line, YAxis } from "recharts"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Plus } from "lucide-react"
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import Link from "next/link"

export default function AdminDashboard() {
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
  })
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [attendanceData, setAttendanceData] = useState<any[]>([])
  const [marksData, setMarksData] = useState<any[]>([])
  const [feeData, setFeeData] = useState<any[]>([])
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchData() {
      try {
        const [statsData, schoolsData] = await Promise.all([getAdminDashboardStats(), getSchools()])

        setStats(statsData)
        const sortedSchools = (schoolsData || []).sort(
          (a: any, b: any) => new Date(b.created_at).getTime() - new Date(a.created_at).getTime(),
        )
        setSchools(sortedSchools)

        const today = new Date()
        const weekDays = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          weekDays.push(d)
        }

        const attendancePromises = weekDays.map(async (date) => {
          const dateStr = date.toISOString().split("T")[0]
          const { data } = await supabase.from("attendance").select("status").eq("attendance_date", dateStr)
          const present = data?.filter((a) => a.status === "Present").length ?? 0
          const total = data?.length ?? 1
          return {
            date: date.toLocaleDateString("en-US", { month: "short", day: "numeric" }),
            percentage: Math.round((present / total) * 100) || 0,
          }
        })

        const attendanceTrends = await Promise.all(attendancePromises)
        setAttendanceData(attendanceTrends)

        const { data: marksRaw, error: marksError } = await supabase
          .from("marks")
          .select(`
            marks_obtained,
            is_absent,
            exam_schedule:exam_schedule_id ( max_marks )
          `);

        if (marksError) {
          console.error("Marks fetch error:", marksError);
        }

        if (marksRaw && marksRaw.length > 0) {
          const ranges = {
            "90-100": 0,
            "80-89": 0,
            "70-79": 0,
            "60-69": 0,
            "Below 60": 0,
          };

          marksRaw.forEach((m) => {
            if (m.is_absent) return;

            const maxMarks = m.exam_schedule?.max_marks;
            if (!maxMarks || maxMarks == 0) return;

            const percentage = Number(m.marks_obtained) / Number(maxMarks) * 100;

            if (percentage >= 90) ranges["90-100"]++;
            else if (percentage >= 80) ranges["80-89"]++;
            else if (percentage >= 70) ranges["70-79"]++;
            else if (percentage >= 60) ranges["60-69"]++;
            else ranges["Below 60"]++;
          });

          setMarksData(
            Object.entries(ranges).map(([range, count]) => ({
              range,
              count
            }))
          );
        }

        const { data: feesRaw, error: feesError } = await supabase
          .from("student_fees")
          .select(`
            total_amount,
            paid_amount,
            fee_structure:fee_structure_id(fee_type)
          `);

        if (feesError) console.error("Error fetching fee data:", feesError);

        if (feesRaw && feesRaw.length > 0) {
          const feeTypes: Record<string, { total: number; paid: number }> = {};

          feesRaw.forEach((f: any) => {
            const type = f.fee_structure?.fee_type || "Other";
            if (!feeTypes[type]) feeTypes[type] = { total: 0, paid: 0 };

            feeTypes[type].total += Number(f.total_amount);
            feeTypes[type].paid += Number(f.paid_amount);
          });

          const feeChart = Object.entries(feeTypes).map(([type, data]) => ({
            type,
            percentage: data.total === 0 ? 0 : Math.round((data.paid / data.total) * 100),
          }));

          setFeeData(feeChart);
        }
      } catch (error) {
        console.error("Error fetching admin dashboard data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const boardDistribution = schools.reduce((acc: any, school) => {
    const board = school.board || "Unknown"
    acc[board] = (acc[board] || 0) + 1
    return acc
  }, {})

  const chartData = Object.entries(boardDistribution).map(([board, count], index) => ({
    name: board,
    count: count,
    fill: `var(--chart-${(index % 5) + 1})`,
  }))

  const schoolColumns = [
    { key: "school_code", label: "School Code" },
    { key: "name", label: "School Name" },
    {
      key: "location",
      label: "Location",
      render: (school: any) => `${school.city}, ${school.state}`,
    },
    {
      key: "board",
      label: "Board",
      render: (school: any) => <Badge variant="secondary">{school.board || "N/A"}</Badge>,
    },
    {
      key: "actions",
      label: "Actions",
      render: (school: any) => (
        <Link href={`/admin/schools/${school.id}`}>
          <Button variant="ghost" size="sm">
            View
          </Button>
        </Link>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="text-center space-y-4">
          <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin mx-auto" />
          <p className="text-sm text-muted-foreground">Loading dashboard...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Welcome back, Admin</h2>
          <p className="text-muted-foreground mt-1">Here's what's happening with your schools today</p>
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90 shadow-lg shadow-primary/25">
          <Link href="/admin/schools/new">
            <Plus className="mr-2 h-4 w-4" />
            Add School
          </Link>
        </Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Schools"
          value={stats.totalSchools}
          icon={School}
          description="Registered schools"
          variant="blue"
        />
        <StatCard
          title="Total Students"
          value={stats.totalStudents.toLocaleString()}
          icon={GraduationCap}
          description="Enrolled students"
          variant="purple"
        />
        <StatCard
          title="Total Teachers"
          value={stats.totalTeachers}
          icon={Users}
          description="Active teachers"
          variant="orange"
        />
        <StatCard
          title="Total Parents"
          value={stats.totalParents}
          icon={UserCircle}
          description="Registered parents"
          variant="green"
        />
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        <Card className="col-span-4 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Schools by Board</CardTitle>
            <CardDescription>Distribution of schools across different boards</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            <ChartContainer
              config={{
                count: {
                  label: "Schools",
                  color: "var(--chart-1)",
                },
              }}
              className="h-[300px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={chartData}>
                  <CartesianGrid vertical={false} strokeDasharray="3 3" stroke="var(--border)" opacity={0.4} />
                  <XAxis dataKey="name" tickLine={false} axisLine={false} tickMargin={10} />
                  <ChartTooltip cursor={false} content={<ChartTooltipContent />} />
                  <Bar dataKey="count" radius={[4, 4, 0, 0]}>
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <div className="col-span-3 space-y-4">
          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Quick Actions</CardTitle>
              <CardDescription>Frequently used administrative tasks</CardDescription>
            </CardHeader>
            <CardContent className="grid gap-2">
              <Link href="/admin/students/new">
                <div className="group flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/50 hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-primary/10 p-2 text-primary group-hover:bg-primary group-hover:text-primary-foreground transition-colors">
                      <UserCircle className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Add New Student</span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
              <Link href="/admin/teachers/new">
                <div className="group flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/50 hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-purple-100 p-2 text-purple-600 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                      <Users className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Add New Teacher</span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
              <Link href="/admin/reports">
                <div className="group flex items-center justify-between rounded-lg border border-border/50 p-3 hover:bg-muted/50 hover:border-primary/50 transition-all">
                  <div className="flex items-center gap-3">
                    <div className="rounded-md bg-orange-100 p-2 text-orange-600 group-hover:bg-orange-600 group-hover:text-white transition-colors">
                      <Activity className="h-4 w-4" />
                    </div>
                    <span className="font-medium">Generate Reports</span>
                  </div>
                  <ArrowUpRight className="h-4 w-4 text-muted-foreground group-hover:text-primary transition-colors" />
                </div>
              </Link>
            </CardContent>
          </Card>

          <Card className="border-border/50 shadow-sm">
            <CardHeader>
              <CardTitle>Recent Registrations</CardTitle>
              <CardDescription>Latest schools added to the platform</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {schools.slice(0, 3).map((school: any) => (
                  <div key={school.id} className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <Avatar className="h-9 w-9 border border-border">
                        <AvatarImage src={school.logo_url || "/placeholder.svg"} alt={school.name} />
                        <AvatarFallback className="bg-primary/10 text-primary">
                          {school.name.substring(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div className="space-y-1">
                        <p className="text-sm font-medium leading-none">{school.name}</p>
                        <p className="text-xs text-muted-foreground">
                          {school.city}, {school.state}
                        </p>
                      </div>
                    </div>
                    <div className="text-xs text-muted-foreground flex items-center gap-1">
                      <Clock className="h-3 w-3" />
                      {new Date(school.created_at).toLocaleDateString()}
                    </div>
                  </div>
                ))}
                {schools.length === 0 && (
                  <div className="text-center text-sm text-muted-foreground py-4">No recent registrations</div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <TrendingUp className="h-5 w-5 text-chart-1" />
              Attendance Trends
            </CardTitle>
            <CardDescription>Last 7 days attendance percentage</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                percentage: {
                  label: "Attendance %",
                  color: "var(--chart-1)",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <LineChart data={attendanceData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="date" tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <YAxis domain={[0, 100]} tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Line
                    type="monotone"
                    dataKey="percentage"
                    stroke="var(--chart-1)"
                    strokeWidth={2}
                    dot={{ r: 4, fill: "var(--chart-1)" }}
                  />
                </LineChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5 text-chart-2" />
              Marks Distribution
            </CardTitle>
            <CardDescription>Student performance across all schools</CardDescription>
          </CardHeader>
          <CardContent>
            <ChartContainer
              config={{
                count: {
                  label: "Students",
                  color: "var(--chart-4)",
                },
              }}
              className="h-[200px]"
            >
              <ResponsiveContainer width="100%" height="100%">
                <BarChart data={marksData}>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                  <XAxis dataKey="range" tickLine={false} axisLine={false} tick={{ fontSize: 11 }} />
                  <YAxis tickLine={false} axisLine={false} tick={{ fontSize: 12 }} />
                  <ChartTooltip content={<ChartTooltipContent />} />
                  <Bar dataKey="count" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <IndianRupee className="h-5 w-5 text-chart-3" />
              Fee Collection
            </CardTitle>
            <CardDescription>Percentage of paid fees by type</CardDescription>
          </CardHeader>
          <CardContent>
            {feeData.length > 0 ? (
              <ChartContainer
                config={{
                  count: {
                    label: "Students",
                    color: "var(--chart-4)",
                  },
                }}
                className="h-[200px]"
              >
                <ResponsiveContainer width="100%" height={250}>
                  <BarChart data={feeData} margin={{ top: 20, right: 20, left: 0, bottom: 20 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                    <XAxis dataKey="type" tickLine={false} axisLine={false} />
                    <YAxis domain={[0, 100]} tickFormatter={(v) => `${v}%`} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} />
                    <Bar dataKey="percentage" radius={[4, 4, 0, 0]} fill="var(--chart-3)">
                      {feeData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={`var(--chart-${(index % 5) + 1})`} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            ) : (
              <div className="flex items-center justify-center h-[180px] text-sm text-muted-foreground">
                No fee data available
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      <DataTable
        title="Schools Overview"
        description="All registered schools in the system"
        data={schools.slice(0, 10)}
        columns={schoolColumns}
        searchable
        downloadable
        actions={
          <Button variant="outline" asChild size="sm">
            <Link href="/admin/schools">View All</Link>
          </Button>
        }
      />
    </div>
  )
}
