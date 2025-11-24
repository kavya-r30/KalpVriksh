import { ParentForm } from "@/components/admin/parent-form"
import { getSupabaseClient } from "@/lib/supabase"

async function getParentById(id: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase.from("parents").select("*").eq("id", id).single()
  if (error) throw error
  return data
}

export default async function EditParentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parent = await getParentById(id)

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-3xl font-bold tracking-tight">Edit Parent</h1>
      </div>
      <ParentForm initialData={parent} isEditing />
    </div>
  )
}
