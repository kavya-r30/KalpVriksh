"use client"

import { useEffect, useState } from "react"
import { FeeStructureView } from "@/components/fees/fee-structure-view"
import { useRole } from "@/contexts/role-context"
import { getStaffByUserId } from "@/lib/api/supabase-queries"
import { Loader2 } from "lucide-react"

export default function TeacherFeesPage() {
  const { userId } = useRole()
  const [loading, setLoading] = useState(true)
  const [schoolId, setSchoolId] = useState<string>("")

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const teacher = await getStaffByUserId(userId)
        if (teacher?.school_id) {
          setSchoolId(teacher.school_id)
        }
      } catch (error) {
        console.error("Error fetching teacher data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  if (!schoolId) {
    return (
      <div className="flex items-center justify-center h-full">
        <p className="text-muted-foreground">Unable to load fee structure. School not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">Fee Structure</h1>
        <p className="text-muted-foreground">View the school's fee structure for reference</p>
      </div>

      <FeeStructureView
        schoolId={schoolId}
        showClassFilter={true}
        title="School Fee Structure"
        description="Complete fee structure for all classes"
      />
    </div>
  )
}
