"use client"

import { useEffect, useState } from "react"
import { StudentForm } from "@/components/admin/student-form"
import { getStaffByUserId } from "@/lib/api/supabase-queries"
import { useRole } from "@/contexts/role-context"

export default function NewStudentPage() {
  const { userId } = useRole()
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchSchoolId() {
      if (!userId) return
      try {
        const staff = await getStaffByUserId(userId)
        if (staff) {
          setSchoolId(staff.school_id)
        }
      } catch (error) {
        console.error("Error fetching staff details:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSchoolId()
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!schoolId) {
    return <div>Access Denied: School ID not found</div>
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Add New Student</h1>
      </div>
      <StudentForm fixedSchoolId={schoolId} />
    </div>
  )
}
