"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Users, BookOpen, Calendar } from "lucide-react"
import { getTeacherClasses, getSupabaseClient } from "@/lib/api/supabase-queries"
import { useRole } from "@/contexts/role-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"

export default function ClassesPage() {
  const { userId } = useRole()
  const [classes, setClasses] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchClasses() {
      if (!userId) return
      try {
        const data = await getTeacherClasses(userId)

        const classesWithStudentCount = await Promise.all(
          (data || []).map(async (cls) => {
            const { count } = await supabase
              .from("students")
              .select("*", { count: "exact", head: true })
              .eq("class_id", cls.class_id)

            return { ...cls, studentCount: count || 0 }
          }),
        )

        setClasses(classesWithStudentCount)
      } catch (error) {
        console.error("[v0] Error fetching classes:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchClasses()
  }, [userId])

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
        <h2 className="text-3xl font-bold tracking-tight">My Classes</h2>
        <p className="text-muted-foreground mt-1">Classes you're teaching this semester</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls, index) => (
          <Card key={index} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardHeader>
              <div className="flex items-start gap-4">
                <Avatar className="h-12 w-12 border-2 border-border">
                  <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                    {cls.classes?.name?.substring(0, 2) || "CL"}
                  </AvatarFallback>
                </Avatar>
                <div className="flex-1">
                  <CardTitle className="text-lg">{cls.classes?.name}</CardTitle>
                  <CardDescription className="mt-1">{cls.subjects?.name}</CardDescription>
                </div>
              </div>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="flex items-center gap-2">
                  <Users className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Students</p>
                    <p className="text-sm font-semibold">{cls.studentCount}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="text-xs text-muted-foreground">Subject</p>
                    <p className="text-sm font-semibold">{cls.subjects?.code || "N/A"}</p>
                  </div>
                </div>
              </div>

              <div className="flex gap-2">
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  <Calendar className="h-4 w-4 mr-2" />
                  Attendance
                </Button>
                <Button variant="outline" size="sm" className="flex-1 bg-transparent">
                  View Details
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {classes.length === 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Classes Assigned</p>
            <p className="text-sm text-muted-foreground mt-2">You don't have any classes assigned yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
