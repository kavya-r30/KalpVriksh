import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase"
import { User, Mail, Phone, MapPin, Calendar, Users, Edit } from "lucide-react"
import Link from "next/link"

async function getParentById(id: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("parents")
    .select(`
      *,
      children:student_parents(
        student:students(
          id, first_name, last_name, admission_number
        )
      )
    `)
    .eq("id", id)
    .single()

  if (error) throw error

  return {
    ...data,
    children: data.children?.map((c: any) => c.student) || []
  }
}

export default async function ViewParentPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const parent = await getParentById(id)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Parent Details</h1>
          <p className="text-muted-foreground">View parent information and linked children</p>
        </div>
        <Link href={`/admin/parents/${id}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Parent
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">Full Name</p>
              <p className="font-medium">
                {parent.first_name} {parent.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="font-medium">{parent.gender || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {parent.date_of_birth ? new Date(parent.date_of_birth).toLocaleDateString() : "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Occupation</p>
              <p className="font-medium">{parent.occupation || "Not specified"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Mail className="h-5 w-5" />
              Contact Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </p>
              <p className="font-medium">{parent.phone_number || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </p>
              <p className="font-medium">{parent.email || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </p>
              <p className="font-medium">{parent.address || "Not provided"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Linked Children
          </CardTitle>
        </CardHeader>
        <CardContent>
          {parent.children && parent.children.length > 0 ? (
            <div className="grid gap-4 md:grid-cols-2">
              {parent.children.map((child: any) => (
                <Link
                  key={child.id}
                  href={`/admin/students/${child.id}`}
                  className="border border-border rounded-lg p-4 hover:border-primary transition-colors"
                >
                  <p className="font-semibold">
                    {child.first_name} {child.last_name}
                  </p>
                  <p className="text-sm text-muted-foreground">Admission: {child.admission_number}</p>
                </Link>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No children linked to this parent.</p>
          )}
        </CardContent>
      </Card>

      {/* Additional Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Created At</p>
            <p className="font-medium">{new Date(parent.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">{new Date(parent.updated_at).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}