"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InlineSelect } from "@/components/ui/inline-select"
import { getParentChildrenByUserId } from "@/lib/api/supabase-queries"
import { getSupabaseClient } from "@/lib/supabase"
import { Progress } from "@/components/ui/progress"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/contexts/role-context"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, Line, LineChart } from "recharts"

export default function ProgressPage() {
  const { userId } = useRole()
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState("")
  const [marks, setMarks] = useState<any[]>([])
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
        console.error("Error fetching children:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChildren()
  }, [userId])

  useEffect(() => {
    async function fetchMarks() {
      if (!selectedChild) return

      try {
        const supabase = getSupabaseClient()
        const { data, error } = await supabase
          .from("marks")
          .select(`
            *,
            exam_schedule:exam_schedule(
              max_marks,
              exam:exams(name, exam_type),
              subject:subjects(name)
            )
          `)
          .eq("student_id", selectedChild)
          .order("created_at", { ascending: false })

        if (error) throw error
        setMarks(data || [])
      } catch (error) {
        console.error("Error fetching marks:", error)
      }
    }

    fetchMarks()
  }, [selectedChild])

  const subjectPerformance = marks.reduce((acc: any, mark) => {
    const subject = mark.exam_schedule?.subject?.name || "Unknown"
    if (!acc[subject]) {
      acc[subject] = { subject, totalMarks: 0, obtainedMarks: 0, count: 0 }
    }
    acc[subject].totalMarks += mark.exam_schedule?.max_marks || 0
    acc[subject].obtainedMarks += mark.marks_obtained || 0
    acc[subject].count++
    return acc
  }, {})

  const subjectChartData = Object.values(subjectPerformance).map((item: any) => ({
    subject: item.subject,
    percentage: item.totalMarks > 0 ? Math.round((item.obtainedMarks / item.totalMarks) * 100) : 0,
  }))

  const examTrend = marks
    .slice(0, 6)
    .reverse()
    .map((mark) => ({
      exam: mark.exam_schedule?.exam?.name || "Exam",
      percentage:
        mark.exam_schedule?.max_marks > 0 ? Math.round((mark.marks_obtained / mark.exam_schedule.max_marks) * 100) : 0,
    }))

  const totalMarks = marks.reduce((sum, m) => sum + (m.exam_schedule?.max_marks || 0), 0)
  const obtainedMarks = marks.reduce((sum, m) => sum + (m.marks_obtained || 0), 0)
  const overallPercentage = totalMarks > 0 ? Math.round((obtainedMarks / totalMarks) * 100) : 0
  const grade =
    overallPercentage >= 90
      ? "A+"
      : overallPercentage >= 80
        ? "A"
        : overallPercentage >= 70
          ? "B"
          : overallPercentage >= 60
            ? "C"
            : "D"

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
          <h2 className="text-3xl font-bold tracking-tight">Academic Progress</h2>
          <p className="text-muted-foreground mt-1">Track your children's academic performance and growth</p>
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
          <div className="grid gap-4 md:grid-cols-3">
            <Card className="bg-linear-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Overall Grade</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-primary">{grade}</div>
                <p className="text-sm text-muted-foreground mt-1">{overallPercentage}% Average</p>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Total Exams</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold">{marks.length}</div>
                <p className="text-sm text-muted-foreground mt-1">Completed</p>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Improvement</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-3xl font-bold text-green-600">+5%</div>
                <p className="text-sm text-muted-foreground mt-1">From last term</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Subject-wise Performance</CardTitle>
                <CardDescription>Performance across different subjects</CardDescription>
              </CardHeader>
              <CardContent>
                {subjectChartData.length > 0 ? (
                  <ChartContainer
                    config={{
                      percentage: {
                        label: "Percentage",
                        color: "var(--chart-1)",
                      },
                    }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={subjectChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="subject" className="text-xs" />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="percentage" fill="var(--color-percentage)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No performance data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Exam Performance Trend</CardTitle>
                <CardDescription>Progress over recent exams</CardDescription>
              </CardHeader>
              <CardContent>
                {examTrend.length > 0 ? (
                  <ChartContainer
                    config={{
                      percentage: {
                        label: "Score %",
                        color: "var(--chart-2)",
                      },
                    }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={examTrend}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="exam" className="text-xs" />
                        <YAxis domain={[0, 100]} className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="percentage" stroke="var(--color-percentage)" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No exam trend data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Subject Performance Details</CardTitle>
              <CardDescription>Detailed breakdown by subject</CardDescription>
            </CardHeader>
            <CardContent>
              {subjectChartData.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No subject data available</p>
              ) : (
                <div className="space-y-6">
                  {subjectChartData.map((subject: any) => (
                    <div key={subject.subject} className="space-y-2">
                      <div className="flex items-center justify-between">
                        <span className="font-medium">{subject.subject}</span>
                        <Badge
                          variant={
                            subject.percentage >= 90 ? "default" : subject.percentage >= 75 ? "secondary" : "outline"
                          }
                        >
                          {subject.percentage}%
                        </Badge>
                      </div>
                      <Progress value={subject.percentage} className="h-2" />
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Exam History</CardTitle>
              <CardDescription>Recent examination results</CardDescription>
            </CardHeader>
            <CardContent>
              {marks.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No exam records found</p>
              ) : (
                <div className="space-y-2">
                  {marks.slice(0, 10).map((mark) => (
                    <div key={mark.id} className="flex items-center justify-between py-3 border-b last:border-0">
                      <div>
                        <p className="font-medium">{mark.exam_schedule?.exam?.name || "Exam"}</p>
                        <p className="text-sm text-muted-foreground">
                          {mark.exam_schedule?.subject?.name || "Subject"}
                        </p>
                      </div>
                      <div className="text-right">
                        <div className="font-semibold text-lg">
                          {mark.marks_obtained}/{mark.exam_schedule?.max_marks}
                        </div>
                        <Badge variant="outline">
                          {mark.exam_schedule?.max_marks > 0
                            ? Math.round((mark.marks_obtained / mark.exam_schedule.max_marks) * 100)
                            : 0}
                          %
                        </Badge>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
