"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getStudentMarks } from "@/lib/api/supabase-queries"
import { Badge } from "@/components/ui/badge"
import { ChartCard } from "@/components/dashboard/chart-card"
import { Progress } from "@/components/ui/progress"
import { useRole } from "@/contexts/role-context"
import { getStudentByUserId } from "@/lib/api/supabase-queries"

export default function StudentMarksPage() {
  const { userId } = useRole()
  const [marks, setMarks] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchMarks() {
      if (!userId) return

      try {
        const student = await getStudentByUserId(userId)
        if (student) {
          const data = await getStudentMarks(student.id)
          setMarks(data || [])
        }
      } catch (error) {
        console.error("[v0] Error fetching marks:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchMarks()
  }, [userId])

  const calculateGrade = (percentage: number) => {
    if (percentage >= 90) return { grade: "A+", color: "text-green-600" }
    if (percentage >= 80) return { grade: "A", color: "text-green-500" }
    if (percentage >= 70) return { grade: "B+", color: "text-blue-600" }
    if (percentage >= 60) return { grade: "B", color: "text-blue-500" }
    if (percentage >= 50) return { grade: "C", color: "text-yellow-600" }
    if (percentage >= 40) return { grade: "D", color: "text-orange-600" }
    return { grade: "F", color: "text-red-600" }
  }

  const subjectWisePerformance = marks.reduce(
    (acc, mark) => {
      const subject = mark.exam_schedule?.subject?.name || "Unknown"
      if (!acc[subject]) {
        acc[subject] = { total: 0, obtained: 0, count: 0 }
      }
      acc[subject].total += mark.exam_schedule?.max_marks || 0
      acc[subject].obtained += mark.marks_obtained || 0
      acc[subject].count += 1
      return acc
    },
    {} as Record<string, { total: number; obtained: number; count: number }>,
  )

  const subjectData = Object.entries(subjectWisePerformance).map(([subject, data]) => ({
    subject,
    percentage: data.total > 0 ? (data.obtained / data.total) * 100 : 0,
  }))

  const overallPercentage =
    marks.length > 0
      ? marks.reduce((sum, m) => {
          const maxMarks = m.exam_schedule?.max_marks || 100
          return sum + ((m.marks_obtained || 0) / maxMarks) * 100
        }, 0) / marks.length
      : 0

  const { grade: overallGrade, color: gradeColor } = calculateGrade(overallPercentage)

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
        <h2 className="text-3xl font-bold tracking-tight">Marks & Results</h2>
        <p className="text-muted-foreground mt-1">View your exam scores and academic performance</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Overall Grade</CardTitle>
          </CardHeader>
          <CardContent>
            <div className={`text-4xl font-bold ${gradeColor}`}>{overallGrade}</div>
            <p className="text-sm text-muted-foreground mt-1">{overallPercentage.toFixed(1)}% Average</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{marks.length}</div>
            <p className="text-sm text-muted-foreground mt-1">Exams taken</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Subjects</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-4xl font-bold">{Object.keys(subjectWisePerformance).length}</div>
            <p className="text-sm text-muted-foreground mt-1">Subjects evaluated</p>
          </CardContent>
        </Card>
      </div>

      <ChartCard
        title="Subject-wise Performance"
        description="Your average performance across subjects"
        data={subjectData}
        dataKey="percentage"
        xAxisKey="subject"
        type="bar"
        height={250}
      />

      <Card>
        <CardHeader>
          <CardTitle>Subject Performance Details</CardTitle>
          <CardDescription>Detailed breakdown of your scores by subject</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-6">
            {Object.entries(subjectWisePerformance).map(([subject, data]) => {
              const percentage = (data.obtained / data.total) * 100
              const { grade, color } = calculateGrade(percentage)

              return (
                <div key={subject} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{subject}</span>
                    <div className="flex items-center gap-4">
                      <span className="text-sm text-muted-foreground">
                        {data.obtained}/{data.total}
                      </span>
                      <Badge variant="outline" className={color}>
                        {grade}
                      </Badge>
                    </div>
                  </div>
                  <Progress value={percentage} />
                  <p className="text-xs text-muted-foreground">
                    {percentage.toFixed(1)}% - {data.count} exam{data.count > 1 ? "s" : ""}
                  </p>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Exam History</CardTitle>
          <CardDescription>All your exam results</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {marks.map((mark, i) => {
              const maxMarks = mark.exam_schedule?.max_marks || 100
              const percentage = (mark.marks_obtained / maxMarks) * 100
              const { grade, color } = calculateGrade(percentage)

              return (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div className="flex-1">
                    <p className="font-medium">{mark.exam_schedule?.subject?.name || "Subject"}</p>
                    <p className="text-sm text-muted-foreground">
                      {mark.exam_schedule?.exam?.name || "Exam"} - {mark.exam_schedule?.exam?.exam_type || ""}
                    </p>
                  </div>
                  <div className="flex items-center gap-4">
                    <div className="text-right">
                      <div className="font-semibold">
                        {mark.marks_obtained}/{maxMarks}
                      </div>
                      <div className="text-xs text-muted-foreground">{percentage.toFixed(1)}%</div>
                    </div>
                    <Badge variant="outline" className={`${color} min-w-[3rem] justify-center`}>
                      {grade}
                    </Badge>
                  </div>
                </div>
              )
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
