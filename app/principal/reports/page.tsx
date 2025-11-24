"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, BarChart3, Users, GraduationCap, Calendar } from "lucide-react"
import { InlineSelect } from "@/components/ui/inline-select"
import { useState } from "react"

export default function ReportsPage() {
  const [reportType, setReportType] = useState<string>("attendance")

  const reportCategories = [
    {
      title: "Attendance Reports",
      description: "Daily, weekly, and monthly attendance analytics",
      icon: Calendar,
      reports: ["Daily Attendance", "Monthly Summary", "Class-wise Report", "Defaulters List"],
    },
    {
      title: "Academic Reports",
      description: "Exam results and academic performance",
      icon: GraduationCap,
      reports: ["Exam Results", "Subject Analysis", "Top Performers", "Progress Reports"],
    },
    {
      title: "Financial Reports",
      description: "Fee collection and payment tracking",
      icon: BarChart3,
      reports: ["Fee Collection", "Pending Payments", "Payment History", "Revenue Summary"],
    },
    {
      title: "Staff Reports",
      description: "Teacher records and staff analytics",
      icon: Users,
      reports: ["Staff Directory", "Leave Records", "Performance Review", "Salary Reports"],
    },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground mt-1">Generate and download school reports</p>
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
            { label: "Staff Report", value: "staff" },
          ]}
        />
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {reportCategories.map((category, index) => {
          const Icon = category.icon
          return (
            <Card key={index} className="border-border/50 shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-secondary/50 p-3 ring-1 ring-border/50">
                    <Icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{category.title}</CardTitle>
                    <CardDescription className="mt-1">{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  {category.reports.map((report, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between p-3 rounded-lg hover:bg-secondary/50 transition-colors border border-border/30"
                    >
                      <span className="text-sm font-medium">{report}</span>
                      <Button variant="ghost" size="sm">
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
