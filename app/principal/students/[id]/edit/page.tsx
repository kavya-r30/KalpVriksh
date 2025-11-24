import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getStudentById, getParentsByStudentId } from "@/lib/api/supabase-queries"
import { notFound } from "next/navigation"
import { User, Mail, Phone, MapPin, GraduationCap, Calendar, Users, Edit } from "lucide-react"
import Link from "next/link"

export default async function ViewStudentPage({ params }: { params: Promise<{ id: string }> }) {
  try {
    const resolvedParams = await params
    const student = await getStudentById(resolvedParams.id)
    const parents = await getParentsByStudentId(resolvedParams.id)

    const father = parents.find((p: any) => p.relationship === "Father")
    const mother = parents.find((p: any) => p.relationship === "Mother")

    if (!student) {
      notFound()
    }

    return (
      <div className="space-y-6 max-w-5xl">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold tracking-tight">Student Details</h1>
            <p className="text-muted-foreground">View student information and academic records</p>
          </div>
          <Link href={`/principal/students/${resolvedParams.id}/edit`}>
            <Button>
              <Edit className="h-4 w-4 mr-2" />
              Edit Student
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
                  {student.first_name} {student.last_name}
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Admission Number</p>
                <p className="font-medium">
                  <Badge variant="outline">{student.admission_number}</Badge>
                </p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Gender</p>
                <p className="font-medium">{student.gender || "Not specified"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Date of Birth</p>
                <p className="font-medium">
                  {student.date_of_birth ? new Date(student.date_of_birth).toLocaleDateString() : "Not specified"}
                </p>
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
                <p className="font-medium">{student.phone_number || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <Mail className="h-4 w-4" />
                  Email Address
                </p>
                <p className="font-medium">{student.email || "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground flex items-center gap-2">
                  <MapPin className="h-4 w-4" />
                  Address
                </p>
                <p className="font-medium">{student.address || "Not provided"}</p>
              </div>
            </CardContent>
          </Card>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Academic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-3">
            <div>
              <p className="text-sm text-muted-foreground">School</p>
              <p className="font-medium">{student.school?.name || "Not assigned"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Current Class</p>
              <p className="font-medium">{student.current_class?.name || "Not assigned"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Roll Number</p>
              <p className="font-medium">{student.roll_number || "Not assigned"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date of Admission</p>
              <p className="font-medium">
                {student.date_of_admission ? new Date(student.date_of_admission).toLocaleDateString() : "Not specified"}
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Blood Group</p>
              <p className="font-medium">{student.blood_group || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Category</p>
              <p className="font-medium">{student.category || "Not specified"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Users className="h-5 w-5" />
              Parent Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
              <div>
                <p className="text-sm text-muted-foreground">Father's Name</p>
                <p className="font-medium">{father ? `${father.first_name} ${father.last_name}` : "Not provided"}</p>
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Mother's Name</p>
                <p className="font-medium">{mother ? `${mother.first_name} ${mother.last_name}` : "Not provided"}</p>
              </div>
            </div>
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
              <Badge variant={student.is_active ? "default" : "secondary"}>
                {student.is_active ? "Active" : "Inactive"}
              </Badge>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Created At</p>
              <p className="font-medium">{new Date(student.created_at).toLocaleString()}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Last Updated</p>
              <p className="font-medium">{new Date(student.updated_at).toLocaleString()}</p>
            </div>
          </CardContent>
        </Card>
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
