"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Award, Trophy, Medal, BookOpen } from "lucide-react"
import { useRole } from "@/contexts/role-context"
import { getStudentByUserId, getStudentSkills } from "@/lib/api/supabase-queries"
import { getSupabaseClient } from "@/lib/supabase"

export default function StudentSkillsPage() {
  const { userId } = useRole()
  const [loading, setLoading] = useState(true)
  const [skills, setSkills] = useState<any[]>([])
  const [achievements, setAchievements] = useState<any[]>([])
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const student = await getStudentByUserId(userId)

        if (!student) {
          setLoading(false)
          return
        }

        const skillsData = await getStudentSkills(student.id)

        const { data: competitionsData, error } = await supabase
          .from("competitions")
          .select("*")
          .eq("student_id", student.id)
          .order("date", { ascending: false })

        if (error) throw error

        setSkills(skillsData || [])
        setAchievements(competitionsData || [])
      } catch (error) {
        console.error("[v0] Error fetching skills data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const getSkillIcon = (proficiency: string) => {
    switch (proficiency) {
      case "Advanced":
        return { Icon: Trophy, color: "text-yellow-500", bg: "bg-yellow-500/10" }
      case "Intermediate":
        return { Icon: Medal, color: "text-blue-500", bg: "bg-blue-500/10" }
      case "Beginner":
        return { Icon: BookOpen, color: "text-green-500", bg: "bg-green-500/10" }
      default:
        return { Icon: Award, color: "text-gray-500", bg: "bg-gray-500/10" }
    }
  }

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
        <h2 className="text-3xl font-bold tracking-tight">Skills & Achievements</h2>
        <p className="text-muted-foreground mt-1">Your verified skills and extracurricular achievements</p>
      </div>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {skills.length > 0 ? (
          skills.map((skill, i) => {
            const { Icon, color, bg } = getSkillIcon(skill.proficiency_level)
            return (
              <Card key={i} className="overflow-hidden">
                <div className={`h-2 w-full ${bg.replace("/10", "")}`} />
                <CardHeader className="pb-2">
                  <div className={`w-10 h-10 rounded-full ${bg} flex items-center justify-center mb-2`}>
                    <Icon className={`h-5 w-5 ${color}`} />
                  </div>
                  <CardTitle>{skill.skill_name}</CardTitle>
                  <p className="text-xs text-muted-foreground">{skill.skill_category?.name}</p>
                </CardHeader>
                <CardContent>
                  <Badge variant="secondary">{skill.proficiency_level}</Badge>
                  {skill.certificate_url && (
                    <a
                      href={skill.certificate_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline mt-2 block"
                    >
                      View Certificate
                    </a>
                  )}
                </CardContent>
              </Card>
            )
          })
        ) : (
          <div className="col-span-full text-center py-12">
            <Award className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
            <h3 className="text-lg font-semibold mb-2">No Skills Added Yet</h3>
            <p className="text-sm text-muted-foreground">
              Your verified skills and certifications will appear here once added by your teacher.
            </p>
          </div>
        )}
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Achievements & Competitions</CardTitle>
          <CardDescription>Awards and recognition received</CardDescription>
        </CardHeader>
        <CardContent>
          {achievements.length > 0 ? (
            <div className="space-y-4">
              {achievements.map((achievement, i) => {
                const levelColors: Record<string, string> = {
                  International: "bg-purple-500/10 text-purple-500",
                  National: "bg-red-500/10 text-red-500",
                  State: "bg-blue-500/10 text-blue-500",
                  District: "bg-green-500/10 text-green-500",
                  School: "bg-yellow-500/10 text-yellow-500",
                }
                const levelColor = levelColors[achievement.level] || "bg-gray-500/10 text-gray-500"

                return (
                  <div key={i} className="flex items-start gap-4 p-4 rounded-lg border bg-card">
                    <div className={`w-10 h-10 rounded-full ${levelColor} flex items-center justify-center shrink-0`}>
                      <Trophy className="h-5 w-5" />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-start justify-between gap-4">
                        <div>
                          <h4 className="font-semibold">{achievement.competition_name}</h4>
                          <p className="text-sm text-muted-foreground mt-1">
                            {achievement.position && `Position: ${achievement.position} | `}
                            {achievement.level} Level
                          </p>
                          {achievement.date && (
                            <p className="text-xs text-muted-foreground mt-2">
                              {new Date(achievement.date).toLocaleDateString()}
                            </p>
                          )}
                        </div>
                        {achievement.certificate_url && (
                          <a
                            href={achievement.certificate_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-xs text-primary hover:underline whitespace-nowrap"
                          >
                            View Certificate
                          </a>
                        )}
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          ) : (
            <div className="text-center py-8">
              <Trophy className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
              <h3 className="text-lg font-semibold mb-2">No Achievements Yet</h3>
              <p className="text-sm text-muted-foreground">
                Your competition results and awards will be displayed here once recorded.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
