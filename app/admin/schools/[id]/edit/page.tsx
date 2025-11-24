import { SchoolForm } from "@/components/admin/school-form"
import { getSchoolById } from "@/lib/api/supabase-queries"
import { notFound } from "next/navigation"

export default async function EditSchoolPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params

  let school
  try {
    school = await getSchoolById(id)
  } catch (error) {
    notFound()
  }

  if (!school) {
    notFound()
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit School: {school.name}</h1>
      </div>
      <SchoolForm initialData={school} isEditing />
    </div>
  )
}
