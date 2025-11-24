import { ExamForm } from "@/components/principal/exam-form"
import { getSupabaseClient } from "@/lib/supabase"
import { getStaffByUserId } from "@/lib/api/supabase-queries"

async function getExamById(id: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("exams").select("*").eq("id", id).single()
  if (error) throw error
  return data
}

export default async function EditExamPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const supabase = getSupabaseClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) return <div>Access Denied</div>

  const [staff, exam] = await Promise.all([getStaffByUserId(user.id), getExamById(id)])

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Exam</h1>
      </div>
      <ExamForm initialData={exam} isEditing schoolId={staff.school_id} />
    </div>
  )
}
