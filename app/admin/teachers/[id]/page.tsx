import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getSupabaseClient } from "@/lib/supabase"
import { User, Mail, Phone, MapPin, Briefcase, Calendar, GraduationCap, Edit } from "lucide-react"
import Link from "next/link"

async function getStaffById(id: string) {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("staff")
    .select(`
      *,
      school:schools (*),
      subjects:class_subjects (
        *,
        subject:subjects (*),
        class:classes (
          *,
          sections:sections (*)
        )
      )
    `)
    .eq("id", id)
    .maybeSingle()
  
  if (error) throw error
  return data
}

export default async function ViewTeacherPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  const teacher = await getStaffById(id)

  return (
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Teacher Details</h1>
          <p className="text-muted-foreground">View teacher information and assignments</p>
        </div>
        <Link href={`/admin/teachers/${id}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit Teacher
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
                {teacher.first_name} {teacher.last_name}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Staff Code</p>
              <p className="font-medium">
                <Badge variant="outline">{teacher.staff_code}</Badge>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Gender</p>
              <p className="font-medium">{teacher.gender || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Birth</p>
              <p className="font-medium">
                {teacher.date_of_birth ? new Date(teacher.date_of_birth).toLocaleDateString() : "Not specified"}
              </p>
            </div>
          </CardContent>
        </Card>

        {/* Contact Information */}
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
              <p className="font-medium">{teacher.phone_number || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </p>
              <p className="font-medium">{teacher.email || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </p>
              <p className="font-medium">{teacher.address || "Not provided"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Employment Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Briefcase className="h-5 w-5" />
            Employment Information
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-2">
          <div>
            <p className="text-sm text-muted-foreground">School</p>
            <p className="font-medium">{teacher.school?.name || "Not assigned"}</p>
            {teacher.school?.udise_code && (
              <p className="text-sm text-muted-foreground">UDISE: {teacher.school.udise_code}</p>
            )}
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Employment Type</p>
            <p className="font-medium">{teacher.employment_type || "Not specified"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Date of Joining</p>
            <p className="font-medium">
              {teacher.date_of_joining ? new Date(teacher.date_of_joining).toLocaleDateString() : "Not specified"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Qualification</p>
            <p className="font-medium">{teacher.qualification || "Not specified"}</p>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <GraduationCap className="h-5 w-5" />
            Teaching Subjects
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teacher.subjects && teacher.subjects.length > 0 ? (
            <div className="flex flex-wrap gap-2">
              {teacher.subjects.map((item: any, index: number) => (
                <Badge key={index} variant="secondary">
                  {item.subject?.name || "Unknown"}
                </Badge>
              ))}
            </div>
          ) : (
            <p className="text-muted-foreground">No subjects assigned.</p>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Additional Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={teacher.is_active ? "default" : "secondary"}>
              {teacher.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created At</p>
            <p className="font-medium">{new Date(teacher.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">{new Date(teacher.updated_at).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
