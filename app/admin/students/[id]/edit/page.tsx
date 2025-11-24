import { StudentForm } from "@/components/admin/student-form"
import { getStudentById } from "@/lib/api/supabase-queries"
import { notFound } from "next/navigation"

export default async function EditStudentPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const student = await getStudentById(resolvedParams.id)

    if (!student) {
      notFound()
    }

    return (
      <div className="max-w-4xl mx-auto">
        <div className="mb-6">
          <h1 className="text-3xl font-bold tracking-tight">Edit Student</h1>
          <p className="text-muted-foreground">Update student information</p>
        </div>
        <StudentForm initialData={student} isEditing />
      </div>
    )
  } catch (error) {
    console.error("Error fetching student:", error)
    return (
      <div className="flex flex-col items-center justify-center h-[50vh] gap-4">
        <h2 className="text-xl font-semibold">Something went wrong</h2>
        <p className="text-muted-foreground">Could not load student data.</p>
      </div>
    )
  }
}
