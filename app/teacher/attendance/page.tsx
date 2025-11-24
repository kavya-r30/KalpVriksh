"use client"

import { AttendanceMarker } from "@/components/teacher/attendance-marker"
import { useRole } from "@/contexts/role-context"
import { useEffect, useState } from "react"
import { getStaffByUserId } from "@/lib/api/supabase-queries"

export default function TeacherAttendancePage() {
  const { userId } = useRole()
  const [schoolId, setSchoolId] = useState<string | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchStaffDetails() {
      if (!userId) return

      try {
        const staff = await getStaffByUserId(userId)
        if (staff) {
          setSchoolId(staff.school_id)
        }
      } catch (error) {
        console.error("[v0] Error fetching staff details:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStaffDetails()
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  if (!userId || !schoolId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <p className="text-muted-foreground">Access Denied or Teacher details not found.</p>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <h1 className="text-3xl font-bold tracking-tight">Attendance</h1>
      <AttendanceMarker userId={userId} schoolId={schoolId} />
    </div>
  )
}
