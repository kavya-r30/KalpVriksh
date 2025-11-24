"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { getParentChildrenByUserId } from "@/lib/api/supabase-queries"
import { getSupabaseClient } from "@/lib/supabase"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { Calendar, TrendingUp, DollarSign, Award } from "lucide-react"
import { useRole } from "@/contexts/role-context"

export default function ChildrenPage() {
  const { userId } = useRole()
  const [children, setChildren] = useState<any[]>([])
  const [childrenStats, setChildrenStats] = useState<any>({})
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchChildren() {
      if (!userId) return

      try {
        const data = await getParentChildrenByUserId(userId)
        setChildren(data || [])

        // Fetch stats for each child
        const supabase = getSupabaseClient()
        const stats: any = {}

        for (const child of data || []) {
          // Fetch attendance stats
          const { data: attendanceData } = await supabase.from("attendance").select("status").eq("student_id", child.id)

          const totalDays = attendanceData?.length || 0
          const presentDays = attendanceData?.filter((a) => a.status === "Present").length || 0
          const attendanceRate = totalDays > 0 ? Math.round((presentDays / totalDays) * 100) : 0

          // Fetch skills count
          const { count: skillsCount } = await supabase
            .from("student_skills")
            .select("id", { count: "exact", head: true })
            .eq("student_id", child.id)

          // Fetch fee balance
          const { data: feeData } = await supabase
            .from("student_fees")
            .select("balance_amount")
            .eq("student_id", child.id)

          const totalBalance = feeData?.reduce((sum, fee) => sum + (fee.balance_amount || 0), 0) || 0

          stats[child.id] = {
            attendance: attendanceRate,
            skills: skillsCount || 0,
            feeBalance: totalBalance,
          }
        }

        setChildrenStats(stats)
      } catch (error) {
        console.error("[v0] Error fetching children:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchChildren()
  }, [userId])

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">My Children</h2>
        <p className="text-muted-foreground mt-1">View and manage all your children's academic information</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {children.length === 0 ? (
          <Card className="col-span-2">
            <CardContent className="flex items-center justify-center py-12">
              <p className="text-muted-foreground">No children records found</p>
            </CardContent>
          </Card>
        ) : (
          children.map((child: any) => {
            const stats = childrenStats[child.id] || {}
            return (
              <Card key={child.id} className="overflow-hidden hover:shadow-lg transition-shadow">
                <CardHeader className="bg-gradient-to-r from-primary/10 to-primary/5">
                  <div className="flex items-start gap-4">
                    <Avatar className="h-16 w-16 border-2 border-background">
                      <AvatarFallback className="bg-primary text-primary-foreground text-lg">
                        {child.first_name?.[0]}
                        {child.last_name?.[0]}
                      </AvatarFallback>
                    </Avatar>
                    <div className="flex-1">
                      <CardTitle className="text-xl">
                        {child.first_name} {child.last_name}
                      </CardTitle>
                      <CardDescription className="mt-1">Admission No: {child.admission_number}</CardDescription>
                      <div className="flex gap-2 mt-2 flex-wrap">
                        <Badge variant="secondary">
                          {child.current_class?.name} - {child.section?.name}
                        </Badge>
                        <Badge variant="outline">Roll: {child.roll_number || "N/A"}</Badge>
                      </div>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="pt-6">
                  <div className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">School</p>
                        <p className="font-medium text-sm">{child.school?.name}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Date of Birth</p>
                        <p className="font-medium text-sm">
                          {child.date_of_birth ? new Date(child.date_of_birth).toLocaleDateString() : "N/A"}
                        </p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Gender</p>
                        <p className="font-medium text-sm">{child.gender || "N/A"}</p>
                      </div>
                      <div className="space-y-1">
                        <p className="text-sm text-muted-foreground">Blood Group</p>
                        <p className="font-medium text-sm">{child.blood_group || "N/A"}</p>
                      </div>
                    </div>

                    <div className="pt-4 border-t space-y-3">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Calendar className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Attendance</span>
                        </div>
                        <span className="font-semibold text-green-600">{stats.attendance || 0}%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <TrendingUp className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Average Score</span>
                        </div>
                        <span className="font-semibold text-primary">85%</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <Award className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Skills</span>
                        </div>
                        <span className="font-semibold">{stats.skills || 0} acquired</span>
                      </div>
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 text-sm">
                          <DollarSign className="h-4 w-4 text-muted-foreground" />
                          <span className="text-muted-foreground">Fee Status</span>
                        </div>
                        {stats.feeBalance > 0 ? (
                          <Badge variant="outline" className="text-orange-600 border-orange-600">
                            ₹{stats.feeBalance.toLocaleString()} Pending
                          </Badge>
                        ) : (
                          <Badge variant="default" className="bg-green-600">
                            Paid
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="flex gap-2 pt-4">
                      <Button variant="default" className="flex-1" asChild>
                        <Link href={`/parent/progress`}>View Progress</Link>
                      </Button>
                      <Button variant="outline" asChild>
                        <Link href={`/parent/fees`}>Fees</Link>
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })
        )}
      </div>
    </div>
  )
}
