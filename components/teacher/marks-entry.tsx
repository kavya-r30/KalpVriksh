"use client"

import { useState, useEffect, useMemo } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import {
  getClasses,
  getStudents,
  getExamsByClass,
  getMarksBySchedule,
  updateStudentMarks,
} from "@/lib/api/supabase-queries"
import { Loader2, Save, TrendingUp, TrendingDown, Activity } from "lucide-react"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Bar, BarChart, CartesianGrid, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts"

interface MarksEntryProps {
  userId: string
  schoolId: string
}

export function MarksEntry({ userId, schoolId }: MarksEntryProps) {
  const [classes, setClasses] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [selectedExamSchedule, setSelectedExamSchedule] = useState<string>("")
  const [students, setStudents] = useState<any[]>([])
  const [marks, setMarks] = useState<Record<string, number>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    async function loadClasses() {
      const classesData = await getClasses(schoolId)
      setClasses(classesData || [])
    }
    loadClasses()
  }, [schoolId])

  useEffect(() => {
    if (!selectedClass) return
    async function loadExams() {
      try {
        const examsData = await getExamsByClass(selectedClass)
        setExams(examsData || [])
        setSelectedExamSchedule("")
      } catch (e) {
        console.error(e)
      }
    }
    loadExams()
  }, [selectedClass])

  useEffect(() => {
    if (!selectedClass || !selectedExamSchedule) return

    async function loadData() {
      setLoading(true)
      try {
        const [studentsData, existingMarks] = await Promise.all([
          getStudents(schoolId),
          getMarksBySchedule(selectedExamSchedule),
        ])

        const classStudents = studentsData?.filter((s: any) => s.current_class_id === selectedClass) || []
        setStudents(classStudents)

        const marksMap: Record<string, number> = {}
        existingMarks?.forEach((m: any) => {
          marksMap[m.student_id] = m.marks_obtained
        })
        setMarks(marksMap)
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [selectedClass, selectedExamSchedule, schoolId])

  const handleMarkChange = (studentId: string, value: string) => {
    setMarks((prev) => ({ ...prev, [studentId]: Number.parseFloat(value) || 0 }))
  }

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = Object.entries(marks).map(([studentId, mark]) => ({
        exam_schedule_id: selectedExamSchedule,
        student_id: studentId,
        marks_obtained: mark,
        is_absent: false,
      }))

      await updateStudentMarks(payload)
      alert("Marks saved successfully!")
    } catch (error) {
      console.error("Error saving marks:", error)
      alert("Failed to save marks.")
    } finally {
      setSaving(false)
    }
  }

  const analytics = useMemo(() => {
    const values = Object.values(marks)
    if (values.length === 0) return { high: 0, low: 0, avg: 0, distribution: [] }

    const high = Math.max(...values)
    const low = Math.min(...values)
    const avg = values.reduce((a, b) => a + b, 0) / values.length

    // Distribution for chart
    const ranges = [
      { name: "0-39", count: 0 },
      { name: "40-59", count: 0 },
      { name: "60-79", count: 0 },
      { name: "80-100", count: 0 },
    ]

    values.forEach((v) => {
      if (v < 40) ranges[0].count++
      else if (v < 60) ranges[1].count++
      else if (v < 80) ranges[2].count++
      else ranges[3].count++
    })

    return { high, low, avg: Math.round(avg * 10) / 10, distribution: ranges }
  }, [marks])

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Enter Marks</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="flex gap-4 flex-wrap">
            <div className="space-y-2 w-[200px]">
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
            <div className="space-y-2 w-[250px]">
              <label className="text-sm font-medium">Select Exam & Subject</label>
              <Select value={selectedExamSchedule} onValueChange={setSelectedExamSchedule} disabled={!selectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Exam" />
                </SelectTrigger>
                <SelectContent>
                  {exams.map((exam) => (
                    <SelectItem key={exam.id} value={exam.id}>
                      {exam.exam?.name} - {exam.subject?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedClass && selectedExamSchedule && (
        <Tabs defaultValue="entry">
          <TabsList className="mb-4">
            <TabsTrigger value="entry">Data Entry</TabsTrigger>
            <TabsTrigger value="analysis">Performance Analysis</TabsTrigger>
          </TabsList>

          <TabsContent value="entry">
            <Card>
              <CardContent className="pt-6">
                {loading ? (
                  <div className="flex justify-center p-8">
                    <Loader2 className="animate-spin" />
                  </div>
                ) : (
                  <>
                    <div className="rounded-md border mb-4">
                      <Table>
                        <TableHeader>
                          <TableRow>
                            <TableHead>Roll No</TableHead>
                            <TableHead>Student Name</TableHead>
                            <TableHead>Marks</TableHead>
                          </TableRow>
                        </TableHeader>
                        <TableBody>
                          {students.map((student) => (
                            <TableRow key={student.id}>
                              <TableCell>{student.roll_number}</TableCell>
                              <TableCell>
                                {student.first_name} {student.last_name}
                              </TableCell>
                              <TableCell>
                                <Input
                                  type="number"
                                  value={marks[student.id] || ""}
                                  placeholder="0"
                                  className="w-24"
                                  onChange={(e) => handleMarkChange(student.id, e.target.value)}
                                />
                              </TableCell>
                            </TableRow>
                          ))}
                        </TableBody>
                      </Table>
                    </div>
                    <Button onClick={handleSave} disabled={saving} className="w-full sm:w-auto">
                      {saving && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                      <Save className="mr-2 h-4 w-4" />
                      Save Marks
                    </Button>
                  </>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="analysis">
            <div className="grid gap-4 md:grid-cols-3 mb-6">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Highest Mark</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.high}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Lowest Mark</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.low}</div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">Class Average</CardTitle>
                  <Activity className="h-4 w-4 text-blue-500" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{analytics.avg}</div>
                </CardContent>
              </Card>
            </div>

            <Card>
              <CardHeader>
                <CardTitle>Score Distribution</CardTitle>
              </CardHeader>
              <CardContent className="h-[300px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={analytics.distribution}>
                    <CartesianGrid strokeDasharray="3 3" opacity={0.3} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip cursor={{ fill: "transparent" }} contentStyle={{ borderRadius: "8px", border: "none" }} />
                    <Bar dataKey="count" fill="var(--chart-1)" radius={[4, 4, 0, 0]} name="Students" />
                  </BarChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}
