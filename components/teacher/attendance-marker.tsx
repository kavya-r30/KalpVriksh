"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getClasses, getStudents, getAttendanceByDate, getClassAttendanceStats } from "@/lib/api/supabase-queries"
import { markAttendance } from "@/lib/api/supabase-mutations"
import { Loader2, Save, CalendarIcon } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface AttendanceMarkerProps {
  userId: string
  schoolId: string
}

export function AttendanceMarker({ userId, schoolId }: AttendanceMarkerProps) {
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [students, setStudents] = useState<any[]>([])
  const [attendance, setAttendance] = useState<Record<string, string>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [date, setDate] = useState<string>(new Date().toISOString().split("T")[0])
  const [stats, setStats] = useState<any[]>([])

  useEffect(() => {
    async function loadClasses() {
      const classesData = await getClasses(schoolId)
      setClasses(classesData || [])
    }
    loadClasses()
  }, [schoolId])

  useEffect(() => {
    if (!selectedClass) return

    async function loadData() {
      setLoading(true)
      try {
        const [studentsData, existingAttendance, statsData] = await Promise.all([
          getStudents(schoolId),
          getAttendanceByDate(date, selectedClass),
          getClassAttendanceStats(selectedClass),
        ])

        const classStudents = studentsData?.filter((s: any) => s.current_class_id === selectedClass) || []
        setStudents(classStudents)

        const attMap: Record<string, string> = {}
        classStudents.forEach((s: any) => {
          attMap[s.id] = "Present"
        })

        existingAttendance?.forEach((a: any) => {
          attMap[a.student_id] = a.status
        })

        setAttendance(attMap)

        if (statsData) {
          const dateMap = new Map()
          statsData.forEach((record: any) => {
            const d = record.attendance_date
            if (!dateMap.has(d)) dateMap.set(d, { date: d, Present: 0, Absent: 0, Late: 0 })
            const entry = dateMap.get(d)
            entry[record.status] = (entry[record.status] || 0) + 1
          })
          setStats(Array.from(dateMap.values()).sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()))
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedClass, date, schoolId])

  const handleStatusChange = (studentId: string, status: string) => {
    setAttendance((prev) => ({ ...prev, [studentId]: status }))
  }

  const markAll = (status: string) => {
    const newAtt = { ...attendance }
    students.forEach((s) => (newAtt[s.id] = status))
    setAttendance(newAtt)
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = Object.entries(attendance).map(([studentId, status]) => ({
        student_id: studentId,
        attendance_date: date,
        status,
        marked_by: null,
      }))

      await markAttendance(payload)
    } catch (error) {
      console.error("Error saving attendance:", error)
    } finally {
      setSaving(false)
    }
  }

  const dailyStats = useMemo(() => {
    const total = students.length
    if (total === 0) return { present: 0, absent: 0, percentage: 0 }
    const present = Object.values(attendance).filter((s) => s === "Present").length
    return {
      present,
      absent: total - present,
      percentage: Math.round((present / total) * 100),
    }
  }, [attendance, students])

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row gap-4 items-end bg-card p-4 rounded-lg border shadow-sm">
        <div className="space-y-2 w-full sm:w-[250px]">
          <label className="text-sm font-medium">Select Class</label>
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger>
              <SelectValue placeholder="Select Class" />
            </SelectTrigger>
            <SelectContent>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-2 w-full sm:w-[200px]">
          <label className="text-sm font-medium">Date</label>
          <input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            className="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          />
        </div>
      </div>

      {selectedClass ? (
        <Tabs defaultValue="take-attendance" className="w-full">
          <TabsList className="grid w-full grid-cols-2 mb-4">
            <TabsTrigger value="take-attendance">Take Attendance</TabsTrigger>
            <TabsTrigger value="history">Analytics & History</TabsTrigger>
          </TabsList>

          <TabsContent value="take-attendance" className="space-y-4">
            <div className="grid gap-4 md:grid-cols-3">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Total Students</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{students.length}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Present Today</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{dailyStats.present}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-sm font-medium">Attendance Rate</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-blue-600">{dailyStats.percentage}%</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Student List</CardTitle>
                <div className="flex gap-2">
                  <Button size="sm" variant="outline" onClick={() => markAll("Present")}>
                    All Present
                  </Button>
                  <Button size="sm" variant="outline" onClick={() => markAll("Absent")}>
                    All Absent
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {loading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin h-8 w-8 text-primary" />
                  </div>
                ) : (
                  <div className="rounded-md border">
                    <Table>
                      <TableHeader>
                        <TableRow>
                          <TableHead>Roll No</TableHead>
                          <TableHead>Name</TableHead>
                          <TableHead>Status</TableHead>
                        </TableRow>
                      </TableHeader>
                      <TableBody>
                        {students.map((student) => (
                          <TableRow key={student.id}>
                            <TableCell className="font-mono">{student.roll_number || "-"}</TableCell>
                            <TableCell className="font-medium">
                              {student.first_name} {student.last_name}
                            </TableCell>
                            <TableCell>
                              <div className="flex gap-1">
                                {["Present", "Absent", "Late", "Holiday"].map((status) => (
                                  <Button
                                    key={status}
                                    size="sm"
                                    variant={
                                      attendance[student.id] === status
                                        ? status === "Present"
                                          ? "default" // Uses primary color (Blue/Green depending on theme)
                                          : status === "Absent"
                                            ? "destructive"
                                            : "secondary"
                                        : "ghost"
                                    }
                                    className={`h-8 px-3 ${attendance[student.id] !== status ? "text-muted-foreground hover:bg-muted" : ""}`}
                                    onClick={() => handleStatusChange(student.id, status)}
                                  >
                                    {status.charAt(0)}
                                  </Button>
                                ))}
                              </div>
                            </TableCell>
                          </TableRow>
                        ))}
                      </TableBody>
                    </Table>
                  </div>
                )}
                <div className="mt-4 flex justify-end">
                  <Button
                    onClick={handleSave}
                    disabled={saving || students.length === 0}
                    className="w-full sm:w-auto min-w-[150px]"
                  >
                    {saving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
                    Save Attendance
                  </Button>
                </div>
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Attendance Trends</CardTitle>
                <CardDescription>
                  Last 30 days performance for {classes.find((c) => c.id === selectedClass)?.name}
                </CardDescription>
              </CardHeader>
              <CardContent className="h-[400px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={stats}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis
                      dataKey="date"
                      tickFormatter={(value) =>
                        new Date(value).toLocaleDateString(undefined, { month: "short", day: "numeric" })
                      }
                      fontSize={12}
                    />
                    <YAxis fontSize={12} />
                    <Tooltip
                      contentStyle={{ borderRadius: "8px", border: "none", boxShadow: "0 4px 12px rgba(0,0,0,0.1)" }}
                      labelFormatter={(value) => new Date(value).toLocaleDateString()}
                    />
                    <Legend />
                    <Bar dataKey="Present" fill="var(--chart-3)" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="Late" fill="var(--chart-4)" radius={[4, 4, 0, 0]} stackId="a" />
                    <Bar dataKey="Absent" fill="var(--chart-2)" radius={[4, 4, 0, 0]} stackId="a" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      ) : (
        <div className="flex flex-col items-center justify-center h-[400px] border-2 border-dashed rounded-lg bg-muted/30">
          <CalendarIcon className="h-12 w-12 text-muted-foreground mb-4" />
          <h3 className="text-lg font-medium">No Class Selected</h3>
          <p className="text-muted-foreground">Please select a class to view or take attendance</p>
        </div>
      )}
    </div>
  )
}
