"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getStudentAttendance } from "@/lib/api/supabase-queries"
import { Badge } from "@/components/ui/badge"
import { Calendar } from "@/components/ui/calendar"
import { format } from "date-fns"
import { ChartCard } from "@/components/dashboard/chart-card"
import { useRole } from "@/contexts/role-context"
import { getStudentByUserId } from "@/lib/api/supabase-queries"

export default function StudentAttendancePage() {
  const { userId } = useRole()
  const [attendance, setAttendance] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | undefined>(new Date())

  useEffect(() => {
    async function fetchAttendance() {
      if (!userId) return

      try {
        const student = await getStudentByUserId(userId)
        if (student) {
          const data = await getStudentAttendance(student.id, 90)
          setAttendance(data || [])
        }
      } catch (error) {
        console.error("[v0] Error fetching attendance:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchAttendance()
  }, [userId])

  const presentDays = attendance.filter((a) => a.status === "Present").length
  const absentDays = attendance.filter((a) => a.status === "Absent").length
  const lateDays = attendance.filter((a) => a.status === "Late").length
  const totalDays = attendance.length
  const attendanceRate = totalDays > 0 ? ((presentDays / totalDays) * 100).toFixed(1) : "0"

  const attendanceByDate = attendance.reduce(
    (acc, record) => {
      acc[record.attendance_date] = record.status
      return acc
    },
    {} as Record<string, string>,
  )

  const monthlyData = attendance.reduce((acc: any[], record: any) => {
    const month = record.attendance_date.substring(0, 7)
    const existing = acc.find((item) => item.month === month)

    if (existing) {
      if (record.status === "Present") existing.present++
      if (record.status === "Absent") existing.absent++
      if (record.status === "Late") existing.late++
    } else {
      acc.push({
        month,
        present: record.status === "Present" ? 1 : 0,
        absent: record.status === "Absent" ? 1 : 0,
        late: record.status === "Late" ? 1 : 0,
      })
    }

    return acc
  }, [])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Attendance</h2>
        <p className="text-muted-foreground mt-1">View your attendance records and statistics</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Days</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{totalDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">{presentDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">{absentDays}</div>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-primary">{attendanceRate}%</div>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <ChartCard
            title="Monthly Attendance"
            description="Your attendance breakdown by month"
            data={monthlyData}
            dataKey="present"
            xAxisKey="month"
            type="bar"
          />
        </div>

        <Card>
          <CardHeader>
            <CardTitle>Calendar View</CardTitle>
            <CardDescription>Select a date to view details</CardDescription>
          </CardHeader>
          <CardContent className="flex justify-center">
            <Calendar
              mode="single"
              selected={selectedDate}
              onSelect={setSelectedDate}
              className="rounded-md border"
              modifiers={{
                present: (date) => {
                  const dateStr = format(date, "yyyy-MM-dd")
                  return attendanceByDate[dateStr] === "Present"
                },
                absent: (date) => {
                  const dateStr = format(date, "yyyy-MM-dd")
                  return attendanceByDate[dateStr] === "Absent"
                },
              }}
              modifiersStyles={{
                present: { backgroundColor: "hsl(var(--primary))", color: "white" },
                absent: { backgroundColor: "hsl(var(--destructive))", color: "white" },
              }}
            />
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Attendance History</CardTitle>
          <CardDescription>Your recent attendance records</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {attendance.slice(0, 10).map((record, i) => (
              <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                <div>
                  <p className="font-medium">{format(new Date(record.attendance_date), "EEEE, MMMM d, yyyy")}</p>
                  {record.remarks && <p className="text-xs text-muted-foreground mt-1">{record.remarks}</p>}
                </div>
                <Badge
                  variant={
                    record.status === "Present" ? "default" : record.status === "Absent" ? "destructive" : "secondary"
                  }
                >
                  {record.status}
                </Badge>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
