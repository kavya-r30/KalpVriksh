"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Award, Save, Loader2 } from "lucide-react"
import { getTeacherClasses, getSupabaseClient, addStudentSkill, getSkillCategories } from "@/lib/api/supabase-queries"
import { useRole } from "@/contexts/role-context"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function SkillsPage() {
  const { userId } = useRole()
  const [selectedClass, setSelectedClass] = useState("")
  const [students, setStudents] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [entries, setEntries] = useState<Record<string, { skill: string; description: string; category: string }>>({})
  const [loading, setLoading] = useState(false)
  const [saving, setSaving] = useState(false)
  const [categories, setCategories] = useState<any[]>([])
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchData() {
      if (!userId) return
      try {
        const [classesData, categoriesData] = await Promise.all([getTeacherClasses(userId), getSkillCategories()])
        setClasses(classesData || [])
        setCategories(categoriesData || [])
      } catch (error) {
        console.error("[v0] Error fetching initial data:", error)
      }
    }
    fetchData()
  }, [userId])

  useEffect(() => {
    async function fetchStudents() {
      if (!selectedClass) return

      setLoading(true)
      try {
        const { data } = await supabase
          .from("students")
          .select("*")
          .eq("current_class_id", selectedClass)
          .order("roll_number")

        setStudents(data || [])
      } catch (error) {
        console.error("[v0] Error fetching students:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchStudents()
  }, [selectedClass])

  const handleEntryChange = (studentId: string, field: string, value: string) => {
    setEntries((prev) => ({
      ...prev,
      [studentId]: {
        ...(prev[studentId] || { skill: "", description: "", category: "" }),
        [field]: value,
      },
    }))
  }

  const handleSave = async (studentId: string) => {
    const entry = entries[studentId]
    if (!entry || !entry.skill || !entry.category) {
      alert("Please fill in Skill Name and Category")
      return
    }

    setSaving(true)
    try {
      await addStudentSkill({
        student_id: studentId,
        skill_category_id: entry.category,
        skill_name: entry.skill,
        proficiency_level: "Intermediate", // Default
        verified_by: null, // Should be teacher ID
      })
      alert("Skill added successfully!")
      // Clear entry
      setEntries((prev) => {
        const next = { ...prev }
        delete next[studentId]
        return next
      })
    } catch (e) {
      console.error(e)
      alert("Failed to save skill")
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Student Skills</h2>
        <p className="text-muted-foreground mt-1">Record and track student skills and achievements</p>
      </div>

      <Card className="border-border/50 shadow-sm">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Select Class</CardTitle>
              <CardDescription>Choose a class to record student skills</CardDescription>
            </div>
            <div className="w-[300px]">
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
                </SelectTrigger>
                <SelectContent>
                  {classes.map((cls) => (
                    <SelectItem key={cls.class_id} value={cls.class_id}>
                      {cls.classes?.name} - {cls.subjects?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {loading && (
            <div className="flex justify-center py-8">
              <div className="h-8 w-8 rounded-full border-4 border-primary border-t-transparent animate-spin" />
            </div>
          )}

          {!loading && students.length > 0 && (
            <div className="space-y-4">
              {students.map((student) => (
                <Card key={student.id} className="border-border/50">
                  <CardHeader>
                    <div className="flex items-center gap-3">
                      <div className="rounded-lg bg-secondary/50 p-2 ring-1 ring-border/50">
                        <Award className="h-5 w-5 text-foreground" />
                      </div>
                      <div>
                        <CardTitle className="text-base">
                          {student.first_name} {student.last_name}
                        </CardTitle>
                        <CardDescription className="text-xs">
                          Roll No: {student.roll_number || "-"} • {student.admission_number}
                        </CardDescription>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Category</label>
                        <Select
                          value={entries[student.id]?.category || ""}
                          onValueChange={(val) => handleEntryChange(student.id, "category", val)}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select Category" />
                          </SelectTrigger>
                          <SelectContent>
                            {categories.map((c) => (
                              <SelectItem key={c.id} value={c.id}>
                                {c.name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                      <div className="space-y-2">
                        <label className="text-sm font-medium">Skill Name</label>
                        <Input
                          placeholder="e.g., Chess Champion"
                          value={entries[student.id]?.skill || ""}
                          onChange={(e) => handleEntryChange(student.id, "skill", e.target.value)}
                        />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Description</label>
                      <Textarea
                        placeholder="Detailed description..."
                        value={entries[student.id]?.description || ""}
                        onChange={(e) => handleEntryChange(student.id, "description", e.target.value)}
                        className="min-h-[80px] resize-none"
                      />
                    </div>
                    <div className="flex justify-end">
                      <Button size="sm" onClick={() => handleSave(student.id)} disabled={saving}>
                        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4 mr-2" />}
                        Save Skill
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}

          {!loading && students.length === 0 && selectedClass && (
            <div className="text-center py-12 text-muted-foreground">No students found in this class</div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
