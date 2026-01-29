"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { getSchools } from "@/lib/api/supabase-queries"
import { createTeacher, updateTeacher } from "@/lib/api/supabase-mutations"
import { Loader2, ArrowLeft, User, Briefcase, Calendar, Hash, Phone, Mail, GraduationCap } from "lucide-react"
import { toast } from "sonner"

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
    phone: initialData?.phone || "",
    email: initialData?.email || "",
    designation: initialData?.designation || "",
    department: initialData?.department || "",
    qualification: initialData?.qualification || "",
    experience_years: initialData?.experience_years || "",
    subject_specialization: initialData?.subject_specialization || "",
    joining_date: initialData?.joining_date || "",
    address: initialData?.address || "",
    school_id: initialData?.school_id || fixedSchoolId || "",
    role: initialData?.role || "Teacher",
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
  }, [isEditing, fixedSchoolId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.first_name.trim()) {
      toast.error("First name is required")
      return
    }
    if (!formData.last_name.trim()) {
      toast.error("Last name is required")
      return
    }
    if (!formData.staff_code.trim()) {
      toast.error("Staff code is required")
      return
    }
    if (!formData.school_id) {
      toast.error("Please select a school")
      return
    }

    setLoading(true)

    try {
      // Clean data - remove empty strings and convert to null
      const cleanData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          value === "" ? null : value
        ])
      )

      // Convert experience_years to number if present
      if (cleanData.experience_years) {
        cleanData.experience_years = parseInt(cleanData.experience_years as string, 10)
      }

      if (isEditing) {
        await updateTeacher(initialData.id, cleanData)
        toast.success("Teacher updated successfully!")
      } else {
        await createTeacher(cleanData)
        toast.success("Teacher created successfully!")
      }

      if (fixedSchoolId) {
        router.push("/principal/teachers")
      } else {
        router.push("/admin/teachers")
      }
      router.refresh()
    } catch (error: any) {
      console.error("Error saving teacher:", error)
      if (error.message?.includes("duplicate")) {
        toast.error("A teacher with this staff code already exists")
      } else {
        toast.error("Failed to save teacher. Please try again.")
      }
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <div className="space-y-6">
        {/* Personal Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <User className="h-5 w-5" />
              Personal Information
            </CardTitle>
            <CardDescription>Basic details about the teacher</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="first_name">First Name *</Label>
                <Input
                  id="first_name"
                  placeholder="Enter first name"
                  value={formData.first_name}
                  onChange={(e) => setFormData({ ...formData, first_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="last_name">Last Name *</Label>
                <Input
                  id="last_name"
                  placeholder="Enter last name"
                  value={formData.last_name}
                  onChange={(e) => setFormData({ ...formData, last_name: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="gender">Gender</Label>
                <Select value={formData.gender} onValueChange={(value) => setFormData({ ...formData, gender: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select gender" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Male">Male</SelectItem>
                    <SelectItem value="Female">Female</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="dob" className="flex items-center gap-1">
                  <Calendar className="h-3 w-3" />
                  Date of Birth
                </Label>
                <Input
                  id="dob"
                  type="date"
                  value={formData.date_of_birth}
                  onChange={(e) => setFormData({ ...formData, date_of_birth: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="phone" className="flex items-center gap-1">
                  <Phone className="h-3 w-3" />
                  Phone Number
                </Label>
                <Input
                  id="phone"
                  placeholder="10 digit phone number"
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value.replace(/\D/g, "").slice(0, 10) })}
                  maxLength={10}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="email" className="flex items-center gap-1">
                  <Mail className="h-3 w-3" />
                  Email
                </Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="email@example.com"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Residential address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>
          </CardContent>
        </Card>

        {/* Professional Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Briefcase className="h-5 w-5" />
              Professional Information
            </CardTitle>
            <CardDescription>Employment and professional details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="staff_code" className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Staff Code *
                </Label>
                <Input
                  id="staff_code"
                  placeholder="e.g., TCH2024001"
                  value={formData.staff_code}
                  onChange={(e) => setFormData({ ...formData, staff_code: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="role">Role</Label>
                <Select value={formData.role} onValueChange={(value) => setFormData({ ...formData, role: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select role" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Teacher">Teacher</SelectItem>
                    <SelectItem value="Principal">Principal</SelectItem>
                    <SelectItem value="Vice Principal">Vice Principal</SelectItem>
                    <SelectItem value="HOD">Head of Department</SelectItem>
                    <SelectItem value="Coordinator">Coordinator</SelectItem>
                    <SelectItem value="Admin Staff">Admin Staff</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="designation">Designation</Label>
                <Input
                  id="designation"
                  placeholder="e.g., Senior Teacher, PGT"
                  value={formData.designation}
                  onChange={(e) => setFormData({ ...formData, designation: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {!fixedSchoolId && (
                <div className="space-y-2">
                  <Label htmlFor="school">School *</Label>
                  <Select
                    value={formData.school_id}
                    onValueChange={(value) => setFormData({ ...formData, school_id: value })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select school" />
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
                <Label htmlFor="department">Department</Label>
                <Select value={formData.department} onValueChange={(value) => setFormData({ ...formData, department: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select department" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Science">Science</SelectItem>
                    <SelectItem value="Mathematics">Mathematics</SelectItem>
                    <SelectItem value="English">English</SelectItem>
                    <SelectItem value="Social Studies">Social Studies</SelectItem>
                    <SelectItem value="Languages">Languages</SelectItem>
                    <SelectItem value="Computer Science">Computer Science</SelectItem>
                    <SelectItem value="Physical Education">Physical Education</SelectItem>
                    <SelectItem value="Arts">Arts</SelectItem>
                    <SelectItem value="Administration">Administration</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="joining_date">Joining Date</Label>
                <Input
                  id="joining_date"
                  type="date"
                  value={formData.joining_date}
                  onChange={(e) => setFormData({ ...formData, joining_date: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Qualification Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <GraduationCap className="h-5 w-5" />
              Qualification & Expertise
            </CardTitle>
            <CardDescription>Educational background and specialization</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="qualification">Qualification</Label>
                <Input
                  id="qualification"
                  placeholder="e.g., M.Sc, B.Ed"
                  value={formData.qualification}
                  onChange={(e) => setFormData({ ...formData, qualification: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="subject_specialization">Subject Specialization</Label>
                <Input
                  id="subject_specialization"
                  placeholder="e.g., Physics, Mathematics"
                  value={formData.subject_specialization}
                  onChange={(e) => setFormData({ ...formData, subject_specialization: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="experience_years">Experience (Years)</Label>
                <Input
                  id="experience_years"
                  type="number"
                  min="0"
                  max="50"
                  placeholder="Years of experience"
                  value={formData.experience_years}
                  onChange={(e) => setFormData({ ...formData, experience_years: e.target.value })}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Form Actions */}
        <Card>
          <CardFooter className="flex justify-between pt-6">
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
      </div>
    </form>
  )
}
