"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { getSupabaseClient } from "@/lib/supabase"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { InlineSelect } from "@/components/ui/inline-select"
import { Badge } from "@/components/ui/badge"
import { getSchools } from "@/lib/api/supabase-queries"
import { Card, CardContent } from "@/components/ui/card"

export default function TeachersPage() {
  const [teachers, setTeachers] = useState<any[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [schoolFilter, setSchoolFilter] = useState<string>("all")
  const [subjectFilter, setSubjectFilter] = useState<string>("all")
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchData() {
      try {
        const [teachersResult, schoolsData] = await Promise.all([
          supabase.from("staff").select("*, schools(name)").order("first_name"),
          getSchools(),
        ])

        if (teachersResult.error) throw teachersResult.error
        setTeachers(teachersResult.data || [])
        setSchools(schoolsData || [])
      } catch (error) {
        console.error("[v0] Error fetching teachers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [])

  const filteredTeachers = teachers.filter((teacher) => {
    if (schoolFilter !== "all" && teacher.school_id !== schoolFilter) return false
    if (subjectFilter !== "all" && teacher.subject_specialization !== subjectFilter) return false
    return true
  })

  const uniqueSubjects = Array.from(new Set(teachers.map((t) => t.subject_specialization).filter(Boolean)))

  const columns = [
    {
      key: "teacher",
      label: "Teacher",
      render: (teacher: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="text-xs bg-purple-100 text-purple-700 font-medium">
              {teacher.first_name[0]}
              {teacher.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">
              {teacher.first_name} {teacher.last_name}
            </div>
            <div className="text-xs text-muted-foreground">{teacher.staff_code}</div>
          </div>
        </div>
      ),
    },
    {
      key: "designation",
      label: "Designation",
      render: (teacher: any) => (
        <Badge variant="secondary" className="font-normal">
          {teacher.designation || "N/A"}
        </Badge>
      ),
    },
    { key: "subject_specialization", label: "Subject" },
    {
      key: "school",
      label: "School",
      render: (teacher: any) => teacher.schools?.name || "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (teacher: any) => (
        <Button variant="ghost" size="sm" className="text-purple-600 hover:text-purple-700 hover:bg-purple-50" asChild>
          <Link href={`/admin/teachers/${teacher.id}`}>View</Link>
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
      <Card className="bg-gradient-to-r from-purple-500/10 via-pink-500/10 to-red-500/10 border-purple-200 dark:border-purple-800/30">
        <CardContent className="p-6 flex items-center justify-between">
          <div>
            <h2 className="text-2xl font-bold tracking-tight">Teacher Management</h2>
            <p className="text-muted-foreground">View and manage staff records</p>
          </div>
          <div className="flex gap-8 text-center">
            <div>
              <div className="text-2xl font-bold text-purple-600">{teachers.length}</div>
              <div className="text-xs text-muted-foreground">Total Teachers</div>
            </div>
            <div>
              <div className="text-2xl font-bold text-pink-600">{uniqueSubjects.length}</div>
              <div className="text-xs text-muted-foreground">Departments</div>
            </div>
          </div>
        </CardContent>
      </Card>

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
            label="Subject"
            placeholder="All Subjects"
            value={subjectFilter}
            onChange={setSubjectFilter}
            options={[
              { label: "All Subjects", value: "all" },
              ...uniqueSubjects.map((subject) => ({ label: subject, value: subject })),
            ]}
          />
        </div>
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/admin/teachers/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Teacher
          </Link>
        </Button>
      </div>

      <DataTable
        title="All Teachers"
        description={`Showing ${filteredTeachers.length} of ${teachers.length} teachers`}
        data={filteredTeachers}
        columns={columns}
        searchable
        downloadable
      />
    </div>
  )
}
