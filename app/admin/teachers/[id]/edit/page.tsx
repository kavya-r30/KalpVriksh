import { TeacherForm } from "@/components/admin/teacher-form"
import { getSupabaseClient } from "@/lib/supabase"

async function getStaffById(id: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("staff").select("*").eq("id", id).single()
  if (error) throw error
  return data
}

export default async function EditTeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teacher = await getStaffById(id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Teacher</h1>
      </div>
      <TeacherForm initialData={teacher} isEditing />
    </div>
  )
}
