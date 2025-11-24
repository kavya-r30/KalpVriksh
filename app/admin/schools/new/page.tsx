"use client"

import { SchoolForm } from "@/components/admin/school-form"
import { useRole } from "@/contexts/role-context"

export default function NewSchoolPage() {
  const { userId } = useRole()

  if (!userId) return null

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Add New School</h1>
      </div>
      <SchoolForm />
    </div>
  )
}
