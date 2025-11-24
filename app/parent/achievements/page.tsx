"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InlineSelect } from "@/components/ui/inline-select"
import { getParentChildrenByUserId } from "@/lib/api/supabase-queries"
import { getSupabaseClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Award, Trophy, Star, Medal, Target } from "lucide-react"
import { useRole } from "@/contexts/role-context"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, ResponsiveContainer, PieChart, Pie, Cell } from "recharts"

export default function AchievementsPage() {
  const { userId } = useRole()
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState("")
  const [skills, setSkills] = useState<any[]>([])
  const [competitions, setCompetitions] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const childrenData = await getParentChildrenByUserId(userId)
        setChildren(childrenData || [])
        if (childrenData && childrenData.length > 0) {
          setSelectedChild(childrenData[0].id)
        }
      } catch (error) {
        console.error("[v0] Error fetching children:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  useEffect(() => {
    async function fetchAchievements() {
      if (!selectedChild) return

      try {
        const supabase = getSupabaseClient()

        const [skillsData, competitionsData] = await Promise.all([
          supabase
            .from("student_skills")
            .select(`
              *,
              skill_category:skill_categories(name, description)
            `)
            .eq("student_id", selectedChild)
            .order("created_at", { ascending: false }),
          supabase.from("competitions").select("*").eq("student_id", selectedChild).order("date", { ascending: false }),
        ])

        setSkills(skillsData.data || [])
        setCompetitions(competitionsData.data || [])
      } catch (error) {
        console.error("[v0] Error fetching achievements:", error)
      }
    }

    fetchAchievements()
  }, [selectedChild])

  // Chart data for skills by proficiency
  const skillsByProficiency = skills.reduce((acc: any, skill) => {
    const level = skill.proficiency_level || "Beginner"
    acc[level] = (acc[level] || 0) + 1
    return acc
  }, {})

  const proficiencyChartData = Object.entries(skillsByProficiency).map(([level, count]) => ({
    level,
    count,
  }))

  // Chart data for competitions by level
  const competitionsByLevel = competitions.reduce((acc: any, comp) => {
    const level = comp.level || "School"
    acc[level] = (acc[level] || 0) + 1
    return acc
  }, {})

  const competitionChartData = Object.entries(competitionsByLevel).map(([level, count]) => ({
    level,
    count,
  }))

  const COLORS = ["var(--chart-1)", "var(--chart-2)", "var(--chart-3)", "var(--chart-4)"]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Achievements & Skills</h2>
          <p className="text-muted-foreground mt-1">Track your child's accomplishments and talents</p>
        </div>
        {children.length > 0 && (
          <InlineSelect
            label="Select Child"
            value={selectedChild}
            onChange={setSelectedChild}
            options={children.map((child) => ({
              label: `${child.first_name} ${child.last_name}`,
              value: child.id,
            }))}
          />
        )}
      </div>

      {selectedChild && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-linear-to-br from-yellow-500/10 to-yellow-500/5 border-yellow-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Star className="h-4 w-4" />
                  Total Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{skills.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Acquired skills</p>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-purple-500/10 to-purple-500/5 border-purple-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Trophy className="h-4 w-4" />
                  Competitions
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{competitions.length}</div>
                <p className="text-xs text-muted-foreground mt-1">Participated</p>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Medal className="h-4 w-4" />
                  Advanced Skills
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">
                  {skills.filter((s) => s.proficiency_level === "Advanced").length}
                </div>
                <p className="text-xs text-muted-foreground mt-1">Expert level</p>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Target className="h-4 w-4" />
                  Verified
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">{skills.filter((s) => s.verified_by).length}</div>
                <p className="text-xs text-muted-foreground mt-1">Certified skills</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Skills by Proficiency</CardTitle>
                <CardDescription>Distribution of skill levels</CardDescription>
              </CardHeader>
              <CardContent>
                {proficiencyChartData.length > 0 ? (
                  <ChartContainer
                    config={{
                      count: {
                        label: "Skills",
                        color: "var(--chart-1)",
                      },
                    }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={proficiencyChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="level" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="count" fill="var(--color-count)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No skills data available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Competitions by Level</CardTitle>
                <CardDescription>Participation across different levels</CardDescription>
              </CardHeader>
              <CardContent>
                {competitionChartData.length > 0 ? (
                  <ChartContainer
                    config={{
                      count: {
                        label: "Competitions",
                        color: "var(--chart-2)",
                      },
                    }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <PieChart>
                        <Pie
                          data={competitionChartData}
                          cx="50%"
                          cy="50%"
                          labelLine={false}
                          label={({ level, percent }) => `${level} ${(percent * 100).toFixed(0)}%`}
                          outerRadius={80}
                          fill="#8884d8"
                          dataKey="count"
                        >
                          {competitionChartData.map((entry, index) => (
                            <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                          ))}
                        </Pie>
                        <ChartTooltip content={<ChartTooltipContent />} />
                      </PieChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No competition data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Skills Portfolio</CardTitle>
              <CardDescription>All acquired skills and certifications</CardDescription>
            </CardHeader>
            <CardContent>
              {skills.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No skills recorded yet</p>
              ) : (
                <div className="grid gap-4 md:grid-cols-2">
                  {skills.map((skill) => (
                    <div
                      key={skill.id}
                      className="p-4 rounded-lg border hover:bg-accent/50 transition-colors space-y-3"
                    >
                      <div className="flex items-start justify-between">
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <Award className="h-4 w-4 text-primary" />
                            <p className="font-medium">{skill.skill_name}</p>
                          </div>
                          <p className="text-sm text-muted-foreground">{skill.skill_category?.name || "General"}</p>
                        </div>
                        <Badge
                          variant={
                            skill.proficiency_level === "Advanced"
                              ? "default"
                              : skill.proficiency_level === "Intermediate"
                                ? "secondary"
                                : "outline"
                          }
                        >
                          {skill.proficiency_level}
                        </Badge>
                      </div>
                      {skill.verified_by && (
                        <div className="flex items-center gap-2 text-xs text-green-600">
                          <Star className="h-3 w-3 fill-current" />
                          <span>Verified</span>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Competition History</CardTitle>
              <CardDescription>Participation and achievements in competitions</CardDescription>
            </CardHeader>
            <CardContent>
              {competitions.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No competitions recorded yet</p>
              ) : (
                <div className="space-y-3">
                  {competitions.map((comp) => (
                    <div
                      key={comp.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="flex items-start gap-4">
                        <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                          <Trophy className="h-6 w-6 text-primary" />
                        </div>
                        <div className="space-y-1">
                          <p className="font-medium">{comp.competition_name}</p>
                          <div className="flex items-center gap-2">
                            <Badge variant="outline">{comp.level}</Badge>
                            {comp.position && (
                              <Badge variant="default" className="bg-yellow-500">
                                {comp.position}
                              </Badge>
                            )}
                          </div>
                          {comp.date && (
                            <p className="text-xs text-muted-foreground">{new Date(comp.date).toLocaleDateString()}</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
