"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Calendar } from "@/components/ui/calendar"
import {
  getAttendanceByDate,
  getClasses,
  getPrincipalDashboardStatsForUser,
  getSupabaseClient,
} from "@/lib/api/supabase-queries"
import { DataTable } from "@/components/dashboard/data-table"
import { Badge } from "@/components/ui/badge"
import { InlineSelect } from "@/components/ui/inline-select"
import { useRole } from "@/contexts/role-context"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

export default function AttendancePage() {
  const { userId } = useRole()
  const [date, setDate] = useState<Date>(new Date())
  const [attendance, setAttendance] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [schoolId, setSchoolId] = useState<string>("")
  const [attendanceTrend, setAttendanceTrend] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchSchoolId() {
      if (!userId) return
      try {
        const stats = await getPrincipalDashboardStatsForUser(userId)
        setSchoolId(stats.schoolId)
      } catch (error) {
        console.error("[v0] Error fetching school ID:", error)
      }
    }
    fetchSchoolId()
  }, [userId])

  useEffect(() => {
    async function fetchClasses() {
      if (!schoolId) return
      try {
        const data = await getClasses(schoolId)
        setClasses(data || [])
      } catch (error) {
        console.error("[v0] Error fetching classes:", error)
      }
    }
    fetchClasses()
  }, [schoolId])

  useEffect(() => {
    async function fetchAttendanceTrend() {
      if (!schoolId) return

      try {
        const { data: studentRows } = await supabase.from("students").select("id").eq("school_id", schoolId)
        const studentIds = studentRows?.map((s) => s.id) ?? []

        if (studentIds.length === 0) return

        const today = new Date()
        const weekDays = []
        for (let i = 6; i >= 0; i--) {
          const d = new Date(today)
          d.setDate(d.getDate() - i)
          weekDays.push(d)
        }

        const trendPromises = weekDays.map(async (date) => {
          const dateStr = date.toISOString().split("T")[0]

          const { data, error } = await supabase
            .from("attendance")
            .select("status")
            .eq("attendance_date", dateStr)
            .in("student_id", studentIds)

          if (error) return { day: date.toLocaleDateString("en-US", { weekday: "short" }), rate: 0 }

          const present = data?.filter((a) => a.status === "Present").length ?? 0
          const total = data?.length ?? 1
          const rate = Math.round((present / total) * 100)

          return {
            day: date.toLocaleDateString("en-US", { weekday: "short" }),
            rate: isNaN(rate) ? 0 : rate,
          }
        })

        const trend = await Promise.all(trendPromises)
        setAttendanceTrend(trend)
      } catch (error) {
        console.error("Error fetching attendance trend:", error)
      }
    }

    fetchAttendanceTrend()
  }, [schoolId])

  useEffect(() => {
    async function fetchAttendance() {
      if (!date || !schoolId) return

      setLoading(true)
      try {
        const dateStr = date.toISOString().split("T")[0]
        const data = await getAttendanceByDate(dateStr, selectedClass === "all" ? undefined : selectedClass)
        setAttendance(data || [])
      } catch (error) {
        console.error("[v0] Error fetching attendance:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAttendance()
  }, [date, selectedClass, schoolId])

  const columns = [
    {
      key: "student",
      label: "Student",
      render: (a: any) => (
        <div>
          <div className="font-medium">
            {a.students?.first_name} {a.students?.last_name}
          </div>
          <div className="text-xs text-muted-foreground">Roll No: {a.students?.roll_number}</div>
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (a: any) => {
        const colors: Record<string, string> = {
          Present: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          Absent: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
          Late: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
          Holiday: "bg-gray-100 text-gray-800 dark:bg-gray-800 dark:text-gray-200",
        }
        return (
          <Badge className={colors[a.status] || ""} variant="secondary">
            {a.status}
          </Badge>
        )
      },
    },
    { key: "remarks", label: "Remarks" },
  ]

  const presentCount = attendance.filter((a) => a.status === "Present").length
  const absentCount = attendance.filter((a) => a.status === "Absent").length
  const attendanceRate = attendance.length > 0 ? ((presentCount / attendance.length) * 100).toFixed(1) : "0"

  if (!schoolId) {
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
          <h2 className="text-3xl font-bold tracking-tight">Attendance Management</h2>
          <p className="text-muted-foreground mt-1">View and manage student attendance records</p>
        </div>
        <InlineSelect
          label="Filter by Class"
          placeholder="All Classes"
          value={selectedClass}
          onChange={setSelectedClass}
          options={[
            { label: "All Classes", value: "all" },
            ...classes.map((cls) => ({ label: cls.name, value: cls.id })),
          ]}
        />
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-green-600 dark:text-green-400">{presentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Students present today</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-red-600 dark:text-red-400">{absentCount}</div>
            <p className="text-xs text-muted-foreground mt-1">Students absent today</p>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold">{attendanceRate}%</div>
            <p className="text-xs text-muted-foreground mt-1">Overall attendance</p>
          </CardContent>
        </Card>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Weekly Attendance Trend</CardTitle>
          <CardDescription>Attendance rate for the past 7 days</CardDescription>
        </CardHeader>
        <CardContent>
          {attendanceTrend.length > 0 ? (
            <ResponsiveContainer width="100%" height={250}>
              <BarChart data={attendanceTrend} margin={{ top: 10, right: 30, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" vertical={false} opacity={0.3} />
                <XAxis dataKey="day" axisLine={false} tickLine={false} />
                <YAxis axisLine={false} tickLine={false} domain={[0, 100]} />
                <Tooltip
                  cursor={{ fill: "transparent" }}
                  contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                />
                <Bar dataKey="rate" name="Attendance %" fill="var(--chart-1)" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <div className="flex items-center justify-center h-[250px] text-muted-foreground">
              No attendance trend data available
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-1 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Select Date</CardTitle>
            <CardDescription>Choose a date to view attendance</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar mode="single" selected={date} onSelect={(d) => d && setDate(d)} className="rounded-md border" />
          </CardContent>
        </Card>

        <div className="lg:col-span-2">
          <DataTable
            title={`Attendance for ${date.toLocaleDateString()}`}
            description={`Showing ${attendance.length} records`}
            data={attendance}
            columns={columns}
            searchable={false}
          />
        </div>
      </div>
    </div>
  )
}
