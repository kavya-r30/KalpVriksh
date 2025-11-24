"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSchools } from "@/lib/api/supabase-queries"
import { createTeacher, updateTeacher } from "@/lib/api/supabase-mutations"
import { Loader2, ArrowLeft } from "lucide-react"

interface TeacherFormProps {
  initialData?: any
  isEditing?: boolean
  fixedSchoolId?: string
}

export function TeacherForm({ initialData, isEditing = false, fixedSchoolId }: TeacherFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [schools, setSchools] = useState<any[]>([])

  // Form State
  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    staff_code: initialData?.staff_code || "",
    gender: initialData?.gender || "",
    date_of_birth: initialData?.date_of_birth || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    designation: initialData?.designation || "",
    subject_specialization: initialData?.subject_specialization || "",
    school_id: initialData?.school_id || fixedSchoolId || "",
  })

  useEffect(() => {
    async function loadSchools() {
      try {
        if (fixedSchoolId) return

        const schoolsData = await getSchools()
        setSchools(schoolsData || [])
        if (schoolsData && schoolsData.length > 0 && !isEditing && !formData.school_id) {
          setFormData((prev) => ({ ...prev, school_id: schoolsData[0].id }))
        }
      } catch (error) {
        console.error("Failed to load schools:", error)
      }
    }
    loadSchools()
  }, [isEditing, formData.school_id, fixedSchoolId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      // Exclude email/phone as they belong to user/other tables if not in staff
      const { email, phone, ...teacherData } = formData

      if (isEditing) {
        await updateTeacher(initialData.id, teacherData)
      } else {
        await createTeacher(teacherData)
      }
      router.push("/admin/teachers")
      router.refresh()
    } catch (error) {
      console.error("Error saving teacher:", error)
      alert("Failed to save teacher. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Teacher" : "Add New Teacher"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="first_name">First Name</Label>
              <Input
                id="first_name"
                value={formData.first_name}
                onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="last_name">Last Name</Label>
              <Input
                id="last_name"
                value={formData.last_name}
                onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="staff_code">Staff Code</Label>
              <Input
                id="staff_code"
                value={formData.staff_code}
                onChange={(e) => setFormData({ ...formData, staff_code: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="gender">Gender</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Gender" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Male">Male</SelectItem>
                  <SelectItem value="Female">Female</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="dob">Date of Birth</Label>
              <Input
                id="dob"
                type="date"
                value={formData.date_of_birth}
                onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
              />
            </div>

            {!fixedSchoolId && (
              <div className="space-y-2">
                <Label htmlFor="school">School</Label>
                <Select
                  value={formData.school_id}
                  onValueChange={(value) => setFormData({ ...formData, school_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select School" />
                  </SelectTrigger>
                  <SelectContent>
                    {schools.map((school) => (
                      <SelectItem key={school.id} value={school.id}>
                        {school.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                value={formData.designation}
                onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="subject">Subject Specialization</Label>
              <Input
                id="subject"
                value={formData.subject_specialization}
                onChange={(e) => setFormData({ ...formData, subject_specialization: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="email">Email (Optional)</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone (Optional)</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update Teacher" : "Create Teacher"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
