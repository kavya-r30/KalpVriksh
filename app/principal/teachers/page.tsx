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
import { getPrincipalDashboardStatsForUser } from "@/lib/api/supabase-queries"
import { useRole } from "@/contexts/role-context"

export default function TeachersPage() {
  const { userId } = useRole()
  const [teachers, setTeachers] = useState<any[]>([])
  const [schoolId, setSchoolId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [subjectFilter, setSubjectFilter] = useState<string>("all")
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchData() {
      if (!userId) return
      try {
        const stats = await getPrincipalDashboardStatsForUser(userId)
        setSchoolId(stats.schoolId)

        const { data, error } = await supabase
          .from("staff")
          .select("*")
          .eq("school_id", stats.schoolId)
          .order("first_name")

        if (error) throw error
        setTeachers(data || [])
      } catch (error) {
        console.error("[v0] Error fetching teachers:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const filteredTeachers =
    subjectFilter === "all" ? teachers : teachers.filter((t) => t.subject_specialization === subjectFilter)

  const uniqueSubjects = Array.from(new Set(teachers.map((t) => t.subject_specialization).filter(Boolean)))

  const columns = [
    {
      key: "teacher",
      label: "Teacher",
      render: (teacher: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="text-xs">
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
      render: (teacher: any) => <Badge variant="secondary">{teacher.designation || "N/A"}</Badge>,
    },
    { key: "subject_specialization", label: "Subject" },
    {
      key: "phone",
      label: "Contact",
      render: (teacher: any) => teacher.phone || "N/A",
    },
    {
      key: "actions",
      label: "Actions",
      render: (teacher: any) => (
        <Button variant="ghost" size="sm" asChild>
          <Link href={`/principal/teachers/${teacher.id}`}>View</Link>
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
        <Button asChild>
          <Link href="/principal/teachers/new">
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
