"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import { getExams, getPrincipalDashboardStatsForUser } from "@/lib/api/supabase-queries"
import { Badge } from "@/components/ui/badge"
import { format } from "date-fns"
import { useRole } from "@/contexts/role-context"
import { InlineSelect } from "@/components/ui/inline-select"

export default function ExamsPage() {
  const { userId } = useRole()
  const [exams, setExams] = useState<any[]>([])
  const [schoolId, setSchoolId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [yearFilter, setYearFilter] = useState<string>("all")

  useEffect(() => {
    async function fetchData() {
      if (!userId) return
      try {
        const stats = await getPrincipalDashboardStatsForUser(userId)
        setSchoolId(stats.schoolId)
        const data = await getExams(stats.schoolId)
        setExams(data || [])
      } catch (error) {
        console.error("[v0] Error fetching exams:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const filteredExams = yearFilter === "all" ? exams : exams.filter((e) => e.academic_year === yearFilter)

  const uniqueYears = Array.from(new Set(exams.map((e) => e.academic_year).filter(Boolean)))

  const columns = [
    {
      key: "name",
      label: "Exam Name",
      render: (exam: any) => (
        <div>
          <div className="font-medium">{exam.name}</div>
          <div className="text-xs text-muted-foreground">{exam.exam_type}</div>
        </div>
      ),
    },
    { key: "academic_year", label: "Academic Year" },
    {
      key: "dates",
      label: "Exam Period",
      render: (exam: any) => (
        <div className="text-sm">
          {exam.start_date && format(new Date(exam.start_date), "MMM d, yyyy")} -{" "}
          {exam.end_date && format(new Date(exam.end_date), "MMM d, yyyy")}
        </div>
      ),
    },
    {
      key: "status",
      label: "Status",
      render: (exam: any) => {
        const now = new Date()
        const start = exam.start_date ? new Date(exam.start_date) : null
        const end = exam.end_date ? new Date(exam.end_date) : null

        let status = "Upcoming"
        let variant: "default" | "secondary" | "destructive" | "outline" = "secondary"

        if (start && end) {
          if (now < start) {
            status = "Upcoming"
            variant = "secondary"
          } else if (now >= start && now <= end) {
            status = "Ongoing"
            variant = "default"
          } else {
            status = "Completed"
            variant = "outline"
          }
        }

        return <Badge variant={variant}>{status}</Badge>
      },
    },
    {
      key: "actions",
      label: "Actions",
      render: (exam: any) => (
        <div className="flex gap-2">
          <Button variant="ghost" size="sm">
            View Schedule
          </Button>
        </div>
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
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Examinations</h2>
          <p className="text-muted-foreground mt-1">Manage exam schedules and results</p>
        </div>
        <div className="flex items-center gap-3">
          <InlineSelect
            label="Academic Year"
            placeholder="All Years"
            value={yearFilter}
            onChange={setYearFilter}
            options={[
              { label: "All Years", value: "all" },
              ...uniqueYears.map((year) => ({ label: year, value: year })),
            ]}
          />
          <Button>
            <Plus className="mr-2 h-4 w-4" />
            Schedule Exam
          </Button>
        </div>
      </div>

      <DataTable
        title="All Examinations"
        description={`Showing ${filteredExams.length} of ${exams.length} exams`}
        data={filteredExams}
        columns={columns}
        searchable
        downloadable
      />
    </div>
  )
}
