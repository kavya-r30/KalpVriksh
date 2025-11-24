"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InlineSelect } from "@/components/ui/inline-select"
import { getParentChildrenByUserId } from "@/lib/api/supabase-queries"
import { getSupabaseClient } from "@/lib/supabase"
import { Calendar } from "@/components/ui/calendar"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { useRole } from "@/contexts/role-context"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

export default function ParentAttendancePage() {
  const { userId } = useRole()
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState("")
  const [date, setDate] = useState<Date>(new Date())
  const [attendanceRecords, setAttendanceRecords] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChildren() {
      if (!userId) return

      try {
        const data = await getParentChildrenByUserId(userId)
        setChildren(data || [])
        if (data && data.length > 0) {
          setSelectedChild(data[0].id)
        }
      } catch (error) {
        console.error("[v0] Error fetching children:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChildren()
  }, [userId])

  useEffect(() => {
    async function fetchAttendance() {
      if (!selectedChild) return

      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from("attendance")
          .select("*")
          .eq("student_id", selectedChild)
          .order("attendance_date", { ascending: false })
          .limit(30)

        if (error) throw error
        setAttendanceRecords(data || [])
      } catch (error) {
        console.error("[v0] Error fetching attendance:", error)
      }
    }

    fetchAttendance()
  }, [selectedChild])

  const presentCount = attendanceRecords.filter((r) => r.status === "Present").length
  const absentCount = attendanceRecords.filter((r) => r.status === "Absent").length
  const lateCount = attendanceRecords.filter((r) => r.status === "Late").length
  const totalDays = attendanceRecords.length
  const attendanceRate = totalDays > 0 ? ((presentCount / totalDays) * 100).toFixed(1) : "0"

  const statusData = [
    { name: "Present", value: presentCount, color: "var(--chart-1)" },
    { name: "Absent", value: absentCount, color: "var(--chart-2)" },
    { name: "Late", value: lateCount, color: "var(--chart-3)" },
  ].filter((item) => item.value > 0)

  // Chart data for monthly trend (group by month)
  const monthlyData = attendanceRecords.reduce((acc: any, record) => {
    const month = new Date(record.attendance_date).toLocaleDateString("en-US", { month: "short" })
    if (!acc[month]) {
      acc[month] = { month, present: 0, absent: 0, total: 0 }
    }
    acc[month].total++
    if (record.status === "Present") acc[month].present++
    if (record.status === "Absent") acc[month].absent++
    return acc
  }, {})

  const monthlyChartData = Object.values(monthlyData).reverse().slice(0, 6)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Attendance Tracking</h2>
          <p className="text-muted-foreground mt-1">Monitor your children's attendance records</p>
        </div>
        {children.length > 0 && (
          <InlineSelect
            label="Select Child"
            value={selectedChild}
            onChange={setSelectedChild}
            options={children.map((child) => ({
              label: `${child.first_name} ${child.last_name}`,
              value: child.id,
            }))}
          />
        )}
      </div>

      {selectedChild && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-linear-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Days</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{totalDays}</div>
                <p className="text-xs text-muted-foreground mt-1">Recorded</p>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Present</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{presentCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Days attended</p>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-red-500/10 to-red-500/5 border-red-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Absent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{absentCount}</div>
                <p className="text-xs text-muted-foreground mt-1">Days missed</p>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Attendance Rate</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-primary">{attendanceRate}%</div>
                <p className="text-xs text-muted-foreground mt-1">Overall</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Distribution</CardTitle>
                <CardDescription>Breakdown by status</CardDescription>
              </CardHeader>
              <CardContent>
                {statusData.length > 0 ? (
                  <ChartContainer
                    config={{
                      value: {
                        label: "Days",
                        color: "var(--chart-1)",
                      },
                    }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={statusData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="value"
                        >
                          {statusData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={entry.color} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No attendance data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Monthly Trend</CardTitle>
                <CardDescription>Attendance over recent months</CardDescription>
              </CardHeader>
              <CardContent>
                {monthlyChartData.length > 0 ? (
                  <ChartContainer
                    config={{
                      present: {
                        label: "Present",
                        color: "var(--chart-1)",
                      },
                      absent: {
                        label: "Absent",
                        color: "var(--chart-2)",
                      },
                    }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={monthlyChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="month" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="present" fill="var(--chart-2)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="absent" fill="var(--chart-4)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No monthly data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-3">
            <Card className="lg:col-span-1">
              <CardHeader>
                <CardTitle>Calendar View</CardTitle>
                <CardDescription>Select a date to view details</CardDescription>
              </CardHeader>
              <CardContent className="flex justify-center">
                <Calendar
                  mode="single"
                  selected={date}
                  onSelect={(d) => d && setDate(d)}
                  className="rounded-md border"
                />
              </CardContent>
            </Card>

            <Card className="lg:col-span-2">
              <CardHeader>
                <CardTitle>Recent Attendance</CardTitle>
                <CardDescription>Latest attendance records</CardDescription>
              </CardHeader>
              <CardContent>
                {attendanceRecords.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No attendance records found</p>
                ) : (
                  <div className="space-y-2">
                    {attendanceRecords.slice(0, 10).map((record) => (
                      <div key={record.id} className="flex items-center justify-between py-3 border-b last:border-0">
                        <p className="font-medium">{format(new Date(record.attendance_date), "EEEE, MMMM d, yyyy")}</p>
                        <Badge
                          variant={
                            record.status === "Present"
                              ? "default"
                              : record.status === "Absent"
                                ? "destructive"
                                : "secondary"
                          }
                        >
                          {record.status}
                        </Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </>
      )}
    </div>
  )
}
