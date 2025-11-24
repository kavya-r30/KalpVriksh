"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, Award, GraduationCap, Shield } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { getPrincipalDashboardStatsForUser } from "@/lib/api/supabase-queries"
import { useRole } from "@/contexts/role-context"
import { Badge } from "@/components/ui/badge"

export default function CertificatesPage() {
  const { userId } = useRole()
  const [certificates, setCertificates] = useState<any[]>([])
  const [schoolId, setSchoolId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchData() {
      if (!userId) return
      try {
        const stats = await getPrincipalDashboardStatsForUser(userId)
        setSchoolId(stats.schoolId)

        const { data, error } = await supabase
          .from("certificates")
          .select("*, students(first_name, last_name, admission_number)")
          .eq("school_id", stats.schoolId)
          .order("issue_date", { ascending: false })

        if (error) throw error
        setCertificates(data || [])
      } catch (error) {
        console.error("[v0] Error fetching certificates:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const certificateTypes = [
    {
      title: "Transfer Certificate",
      description: "For students transferring to other schools",
      icon: FileText,
      count: certificates.filter((c) => c.certificate_type === "Transfer Certificate").length,
    },
    {
      title: "Character Certificate",
      description: "Certifying student conduct and character",
      icon: Shield,
      count: certificates.filter((c) => c.certificate_type === "Character Certificate").length,
    },
    {
      title: "Bonafide Certificate",
      description: "Proof of student enrollment",
      icon: Award,
      count: certificates.filter((c) => c.certificate_type === "Bonafide Certificate").length,
    },
    {
      title: "Course Completion",
      description: "For completed academic courses",
      icon: GraduationCap,
      count: certificates.filter((c) => c.certificate_type === "Course Completion").length,
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Certificates</h2>
        <p className="text-muted-foreground mt-1">Generate and manage student certificates</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {certificateTypes.map((cert, index) => {
          const Icon = cert.icon
          return (
            <Card key={index} className="border-border/50 shadow-sm">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <div className="rounded-lg bg-secondary/50 p-3 ring-1 ring-border/50">
                    <Icon className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <CardTitle className="text-xl">{cert.title}</CardTitle>
                    <CardDescription className="mt-1">{cert.description}</CardDescription>
                  </div>
                  <Badge variant="secondary" className="text-lg font-semibold">
                    {cert.count}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <Button className="w-full">
                  <FileText className="h-4 w-4 mr-2" />
                  Generate Certificate
                </Button>
              </CardContent>
            </Card>
          )
        })}
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <CardTitle>Recent Certificates</CardTitle>
          <CardDescription>Latest certificates issued to students</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {certificates.slice(0, 10).map((cert, index) => (
              <div
                key={index}
                className="flex items-center justify-between p-4 rounded-lg border border-border/50 hover:bg-secondary/30 transition-colors"
              >
                <div className="flex-1">
                  <p className="font-medium text-sm">
                    {cert.students?.first_name} {cert.students?.last_name}
                  </p>
                  <div className="flex items-center gap-2 mt-1">
                    <Badge variant="outline" className="text-xs">
                      {cert.certificate_type}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      Issued: {new Date(cert.issue_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
                <Button variant="ghost" size="sm">
                  <Download className="h-4 w-4 mr-2" />
                  Download
                </Button>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
