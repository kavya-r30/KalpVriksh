"use client"

import { StudentForm } from "@/components/admin/student-form"
import { useRole } from "@/contexts/role-context"

export default function NewStudentPage() {
  const { userId } = useRole()

  if (!userId) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-6">
        <h1 className="text-3xl font-bold tracking-tight">Add New Student</h1>
        <p className="text-muted-foreground">Create a new student record in the system</p>
      </div>
      <StudentForm />
    </div>
  )
}
