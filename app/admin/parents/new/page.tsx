"use client"

import { ParentForm } from "@/components/admin/parent-form"
import { useRole } from "@/contexts/role-context"

export default function NewParentPage() {
  const { userId } = useRole()

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Add New Parent</h1>
      </div>
      <ParentForm />
    </div>
  )
}
