"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, BarChart3, Users, GraduationCap, PieChartIcon } from "lucide-react"
import { getAdminDashboardStats } from "@/lib/api/supabase-queries"
import { InlineSelect } from "@/components/ui/inline-select"
import { ChartTooltip, ChartTooltipContent, ChartContainer } from "@/components/ui/chart"
import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Cell } from "recharts"
import { getSupabaseClient } from "@/lib/supabase"
import { toast } from "sonner"

export default function ReportsPage() {
  const [stats, setStats] = useState({
    totalSchools: 0,
    totalStudents: 0,
    totalTeachers: 0,
    totalParents: 0,
  })
  const [reportType, setReportType] = useState<string>("attendance")
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchStats() {
      try {
        const data = await getAdminDashboardStats()
        setStats(data)
      } catch (error) {
        console.error("Error fetching stats:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStats()
  }, [])

  const handleDownload = (reportName: string) => {
    toast.success(`Downloading ${reportName}...`)
    // In a real app, this would trigger a backend report generation
    setTimeout(() => {
      toast.success("Report downloaded successfully")
    }, 1500)
  }

  const reportCategories = [
    {
      title: "Attendance Reports",
      description: "School-wise and student-wise attendance analytics",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-100 dark:bg-blue-900/20",
      reports: ["Daily Attendance", "Monthly Summary", "Class-wise Report", "Absent Students"],
    },
    {
      title: "Academic Reports",
      description: "Exam results, marks analysis, and performance trends",
      icon: GraduationCap,
      color: "text-purple-600",
      bgColor: "bg-purple-100 dark:bg-purple-900/20",
      reports: ["Exam Results", "Subject-wise Analysis", "Top Performers", "Improvement Needed"],
    },
    {
      title: "Financial Reports",
      description: "Fee collection, pending payments, and financial summaries",
      icon: BarChart3,
      color: "text-green-600",
      bgColor: "bg-green-100 dark:bg-green-900/20",
      reports: ["Fee Collection", "Pending Payments", "School-wise Revenue", "Payment History"],
    },
    {
      title: "Administrative Reports",
      description: "Staff records, student enrollment, and school statistics",
      icon: FileText,
      color: "text-orange-600",
      bgColor: "bg-orange-100 dark:bg-orange-900/20",
      reports: ["Staff Directory", "Student Enrollment", "School Statistics", "Transfer Records"],
    },
  ]

  const overviewData = [
    { name: "Schools", value: stats.totalSchools, fill: "var(--chart-1)" },
    { name: "Teachers", value: stats.totalTeachers, fill: "var(--chart-2)" },
    { name: "Parents", value: stats.totalParents, fill: "var(--chart-3)" },
  ]

  const chartConfig = {
    schools: {
      label: "Schools",
      color: "var(--chart-1)",
    },
    teachers: {
      label: "Teachers",
      color: "var(--chart-2)",
    },
    parents: {
      label: "Parents",
      color: "var(--chart-3)",
    },
  }

  if (loading) {
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
          <h2 className="text-3xl font-bold tracking-tight">Reports & Analytics</h2>
          <p className="text-muted-foreground mt-1">Generate and download system-wide reports</p>
        </div>
        <InlineSelect
          label="Quick Report"
          placeholder="Select report type"
          value={reportType}
          onChange={setReportType}
          options={[
            { label: "Attendance Report", value: "attendance" },
            { label: "Academic Report", value: "academic" },
            { label: "Financial Report", value: "financial" },
            { label: "Administrative Report", value: "administrative" },
          ]}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>System Overview</CardTitle>
            <CardDescription>Distribution of key entities in the system</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px]">
              <ChartContainer config={chartConfig} className="w-full h-full">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={overviewData} layout="vertical" margin={{ top: 5, right: 30, left: 20, bottom: 5 }}>
                    <CartesianGrid strokeDasharray="3 3" horizontal={false} />
                    <XAxis type="number" hide />
                    <YAxis dataKey="name" type="category" width={80} tickLine={false} axisLine={false} />
                    <ChartTooltip content={<ChartTooltipContent />} cursor={{ fill: "transparent" }} />
                    <Bar dataKey="value" radius={[0, 4, 4, 0]}>
                      {overviewData.map((entry, index) => (
                        <Cell key={`cell-${index}`} fill={entry.fill} />
                      ))}
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </ChartContainer>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle>Students</CardTitle>
            <CardDescription>Total Enrollment</CardDescription>
          </CardHeader>
          <CardContent className="flex flex-col items-center justify-center pt-8">
            <div className="relative flex items-center justify-center">
              <PieChartIcon className="h-32 w-32 text-primary/20" />
              <div className="absolute text-3xl font-bold">{stats.totalStudents}</div>
            </div>
            <p className="mt-4 text-center text-sm text-muted-foreground">Active student records across all schools</p>
          </CardContent>
        </Card>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {reportCategories.map((category, index) => {
          const Icon = category.icon
          return (
            <Card key={index} className="border-border/50 shadow-sm overflow-hidden group">
              <CardHeader className="border-b border-border/50 bg-secondary/10">
                <div className="flex items-start gap-4">
                  <div
                    className={`rounded-lg p-3 ring-1 ring-inset ring-black/5 ${category.bgColor} ${category.color}`}
                  >
                    <Icon className="h-6 w-6" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl group-hover:text-primary transition-colors">
                      {category.title}
                    </CardTitle>
                    <CardDescription className="mt-1">{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="pt-4">
                <div className="space-y-1">
                  {category.reports.map((report, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary transition-colors cursor-pointer group/item"
                    >
                      <span className="text-sm font-medium group-hover/item:text-primary transition-colors">
                        {report}
                      </span>
                      <Button
                        variant="ghost"
                        size="sm"
                        className="opacity-0 group-hover/item:opacity-100 transition-opacity"
                        onClick={() => handleDownload(report)}
                      >
                        <Download className="h-4 w-4 mr-2" />
                        Download
                      </Button>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>
    </div>
  )
}
