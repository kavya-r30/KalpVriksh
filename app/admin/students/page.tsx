"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { getStudents, getSchools } from "@/lib/api/supabase-queries"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { InlineSelect } from "@/components/ui/inline-select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { PieChart, Pie, Cell, ResponsiveContainer, Legend } from "recharts"

export default function StudentsPage() {
  const [students, setStudents] = useState<any[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolFilter, setSchoolFilter] = useState<string>("all")
  const [classFilter, setClassFilter] = useState<string>("all")

  useEffect(() => {
    async function fetchData() {
      try {
        const [studentsData, schoolsData] = await Promise.all([getStudents(), getSchools()])
        setStudents(studentsData || [])
        setSchools(schoolsData || [])
      } catch (error) {
        console.error("Error fetching students:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredStudents = students.filter((student) => {
    if (schoolFilter !== "all" && student.school_id !== schoolFilter) return false
    // Note: API returns class name in current_class object, not class_id directly for filtering sometimes
    // Assuming simple filter for now
    if (classFilter !== "all" && student.current_class?.name !== classFilter) return false
    return true
  })

  const uniqueClasses = Array.from(new Set(students.map((s) => s.current_class?.name).filter(Boolean)))

  // Prepare chart data
  const genderData = students.reduce((acc: any, student) => {
    const gender = student.gender || "Unknown"
    acc[gender] = (acc[gender] || 0) + 1
    return acc
  }, {})

  const chartData = Object.entries(genderData).map(([name, value], index) => ({
    name,
    value,
    fill: index === 0 ? "var(--chart-1)" : index === 1 ? "var(--chart-2)" : "var(--chart-3)",
  }))

  const chartConfig = {
    male: {
      label: "Male",
      color: "var(--chart-1)",
    },
    female: {
      label: "Female",
      color: "var(--chart-2)",
    },
    other: {
      label: "Other",
      color: "var(--chart-3)",
    },
  }

  const columns = [
    {
      key: "student",
      label: "Student",
      render: (student: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="text-xs bg-primary/10 text-primary font-medium">
              {student.first_name[0]}
              {student.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">
              {student.first_name} {student.last_name}
            </div>
            <div className="text-xs text-muted-foreground">{student.admission_number}</div>
          </div>
        </div>
      ),
    },
    {
      key: "class",
      label: "Class",
      render: (student: any) => (
        <Badge variant="secondary" className="font-normal">
          {student.current_class?.name || "Not Assigned"} {student.section?.name ? `- ${student.section.name}` : ""}
        </Badge>
      ),
    },
    { key: "roll_number", label: "Roll No." },
    {
      key: "gender",
      label: "Gender",
      render: (student: any) => student.gender || "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (student: any) => (
        <Button variant="ghost" size="sm" className="text-blue-600 hover:text-blue-700 hover:bg-blue-50" asChild>
          <Link href={`/admin/students/${student.id}`}>View</Link>
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="grid gap-6 md:grid-cols-3">
        <Card className="md:col-span-2 border-border/50 shadow-sm bg-linear-to-br from-background to-secondary/30">
          <CardContent className="p-6 flex items-center justify-between">
            <div>
              <h2 className="text-2xl font-bold tracking-tight">Student Directory</h2>
              <p className="text-muted-foreground">Manage all student records across schools</p>
            </div>
            <div className="text-right">
              <div className="text-3xl font-bold text-primary">{students.length}</div>
              <div className="text-sm text-muted-foreground">Total Students</div>
            </div>
          </CardContent>
        </Card>

        <Card className="border-border/50 shadow-sm">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Gender Distribution</CardTitle>
          </CardHeader>
          <CardContent className="h-[120px]">
            <ChartContainer config={chartConfig} className="h-full w-full">
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={chartData}
                    cx="50%"
                    cy="50%"
                    innerRadius={30}
                    outerRadius={50}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {chartData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.fill} />
                    ))}
                  </Pie>
                  <ChartTooltip content={<ChartTooltipContent />} />
                </PieChart>
              </ResponsiveContainer>
            </ChartContainer>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <InlineSelect
            label="School"
            placeholder="All Schools"
            value={schoolFilter}
            onChange={setSchoolFilter}
            options={[
              { label: "All Schools", value: "all" },
              ...schools.map((school) => ({ label: school.name, value: school.id })),
            ]}
          />
          <InlineSelect
            label="Class"
            placeholder="All Classes"
            value={classFilter}
            onChange={setClassFilter}
            options={[
              { label: "All Classes", value: "all" },
              ...uniqueClasses.map((cls) => ({ label: cls, value: cls })),
            ]}
          />
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/admin/students/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Student
          </Link>
        </Button>
      </div>

      <DataTable
        title="All Students"
        description={`Showing ${filteredStudents.length} of ${students.length} students`}
        data={filteredStudents}
        columns={columns}
        searchable
        downloadable
      />
    </div>
  )
}
