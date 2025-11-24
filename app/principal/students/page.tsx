"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { getStudents, getPrincipalDashboardStatsForUser, getClasses } from "@/lib/api/supabase-queries"
import { Badge } from "@/components/ui/badge"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { InlineSelect } from "@/components/ui/inline-select"
import { useRole } from "@/contexts/role-context"

export default function StudentsPage() {
  const { userId } = useRole()
  const [students, setStudents] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [schoolId, setSchoolId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [classFilter, setClassFilter] = useState<string>("all")
  const [genderFilter, setGenderFilter] = useState<string>("all")

  useEffect(() => {
    async function fetchData() {
      if (!userId) return
      try {
        const stats = await getPrincipalDashboardStatsForUser(userId)
        setSchoolId(stats.schoolId)
        const [studentsData, classesData] = await Promise.all([getStudents(stats.schoolId), getClasses(stats.schoolId)])
        setStudents(studentsData || [])
        setClasses(classesData || [])
      } catch (error) {
        console.error("[v0] Error fetching students:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const filteredStudents = students.filter((student) => {
    if (classFilter !== "all" && student.class_id !== classFilter) return false
    if (genderFilter !== "all" && student.gender !== genderFilter) return false
    return true
  })

  const columns = [
    {
      key: "student",
      label: "Student",
      render: (student: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="text-xs">
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
        <Badge variant="secondary">
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
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/principal/students/${student.id}`}>View</Link>
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div className="flex items-center gap-3 flex-wrap">
          <InlineSelect
            label="Class"
            placeholder="All Classes"
            value={classFilter}
            onChange={setClassFilter}
            options={[
              { label: "All Classes", value: "all" },
              ...classes.map((cls) => ({ label: cls.name, value: cls.id })),
            ]}
          />
          <InlineSelect
            label="Gender"
            placeholder="All"
            value={genderFilter}
            onChange={setGenderFilter}
            options={[
              { label: "All", value: "all" },
              { label: "Male", value: "Male" },
              { label: "Female", value: "Female" },
            ]}
          />
        </div>
        <Button asChild>
          <Link href="/principal/students/new">
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
