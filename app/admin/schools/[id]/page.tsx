import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getSchoolById } from "@/lib/api/supabase-queries"
import { notFound } from "next/navigation"
import { School, MapPin, Phone, Mail, Calendar, Users, Edit } from "lucide-react"
import Link from "next/link"

export default async function ViewSchoolPage({ params }: { params: Promise<{ id: string }> }) {
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
    <div className="space-y-6 max-w-5xl">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{school.name}</h1>
          <p className="text-muted-foreground">School details and information</p>
        </div>
        <Link href={`/admin/schools/${id}/edit`}>
          <Button>
            <Edit className="h-4 w-4 mr-2" />
            Edit School
          </Button>
        </Link>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Basic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Basic Information
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm text-muted-foreground">School Name</p>
              <p className="font-medium">{school.name}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">UDISE Code</p>
              <p className="font-medium">
                <Badge variant="outline">{school.udise_code}</Badge>
              </p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">School Type</p>
              <p className="font-medium">{school.school_type || "Not specified"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Affiliation</p>
              <p className="font-medium">{school.affiliation || "Not specified"}</p>
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
              <p className="font-medium">{school.phone_number || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Email Address
              </p>
              <p className="font-medium">{school.email || "Not provided"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground flex items-center gap-2">
                <MapPin className="h-4 w-4" />
                Address
              </p>
              <p className="font-medium">{school.address || "Not provided"}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Location Details */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <MapPin className="h-5 w-5" />
            Location Details
          </CardTitle>
        </CardHeader>
        <CardContent className="grid gap-4 md:grid-cols-3">
          <div>
            <p className="text-sm text-muted-foreground">District</p>
            <p className="font-medium">{school.district || "Not specified"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Block</p>
            <p className="font-medium">{school.block || "Not specified"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">State</p>
            <p className="font-medium">{school.state || "Not specified"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Pin Code</p>
            <p className="font-medium">{school.pin_code || "Not specified"}</p>
          </div>
        </CardContent>
      </Card>

      {/* Principal Information */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Users className="h-5 w-5" />
            Principal Information
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <p className="text-sm text-muted-foreground">Principal Name</p>
            <p className="font-medium">{school.principal_name || "Not assigned"}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Principal Contact</p>
            <p className="font-medium">{school.principal_contact || "Not provided"}</p>
          </div>
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
            <p className="text-sm text-muted-foreground">Establishment Date</p>
            <p className="font-medium">
              {school.established_date ? new Date(school.established_date).toLocaleDateString() : "Not specified"}
            </p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Status</p>
            <Badge variant={school.is_active ? "default" : "secondary"}>
              {school.is_active ? "Active" : "Inactive"}
            </Badge>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Created At</p>
            <p className="font-medium">{new Date(school.created_at).toLocaleString()}</p>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Last Updated</p>
            <p className="font-medium">{new Date(school.updated_at).toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
