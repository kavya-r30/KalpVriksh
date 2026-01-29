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
import { getSchools, getClasses } from "@/lib/api/supabase-queries"
import { createStudent, updateStudent } from "@/lib/api/supabase-mutations"
import { getSupabaseClient } from "@/lib/supabase"
import { Loader2, ArrowLeft, User, School, MapPin, Calendar, Hash } from "lucide-react"
import { toast } from "sonner"

interface StudentFormProps {
  initialData?: any
  isEditing?: boolean
  fixedSchoolId?: string
}

export function StudentForm({ initialData, isEditing = false, fixedSchoolId }: StudentFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)
  const [schools, setSchools] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])

  const supabase = getSupabaseClient()

  // Form State
  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    admission_number: initialData?.admission_number || "",
    roll_number: initialData?.roll_number || "",
    gender: initialData?.gender || "",
    date_of_birth: initialData?.date_of_birth || "",
    blood_group: initialData?.blood_group || "",
    aadhar_number: initialData?.aadhar_number || "",
    address: initialData?.address || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    pincode: initialData?.pincode || "",
    school_id: initialData?.school_id || fixedSchoolId || "",
    current_class_id: initialData?.current_class_id || "",
    section_id: initialData?.section_id || "",
  })

  useEffect(() => {
    async function loadOptions() {
      try {
        if (fixedSchoolId) {
          const classesData = await getClasses(fixedSchoolId)
          setClasses(classesData || [])
          return
        }

        const schoolsData = await getSchools()
        setSchools(schoolsData || [])

        if (formData.school_id) {
          const classesData = await getClasses(formData.school_id)
          setClasses(classesData || [])
        } else if (schoolsData && schoolsData.length > 0 && !isEditing) {
          setFormData((prev) => ({ ...prev, school_id: schoolsData[0].id }))
          const classesData = await getClasses(schoolsData[0].id)
          setClasses(classesData || [])
        }
      } catch (error) {
        console.error("Failed to load options:", error)
      }
    }
    loadOptions()
  }, [isEditing, fixedSchoolId])

  // Fetch sections when class changes
  useEffect(() => {
    async function loadSections() {
      if (!formData.current_class_id) {
        setSections([])
        return
      }

      try {
        const { data: sectionsData } = await supabase
          .from("sections")
          .select("*")
          .eq("class_id", formData.current_class_id)
          .order("name")

        setSections(sectionsData || [])
      } catch (error) {
        console.error("Failed to load sections:", error)
      }
    }
    loadSections()
  }, [formData.current_class_id])

  const handleSchoolChange = async (value: string) => {
    setFormData({ ...formData, school_id: value, current_class_id: "", section_id: "" })
    const classesData = await getClasses(value)
    setClasses(classesData || [])
    setSections([])
  }

  const handleClassChange = (value: string) => {
    setFormData({ ...formData, current_class_id: value, section_id: "" })
  }

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
    if (!formData.admission_number.trim()) {
      toast.error("Admission number is required")
      return
    }
    if (!formData.school_id) {
      toast.error("Please select a school")
      return
    }

    setLoading(true)

    try {
      const cleanData = Object.fromEntries(
        Object.entries(formData).map(([key, value]) => [
          key,
          value === "" ? null : value
        ])
      )

      if (isEditing) {
        await updateStudent(initialData.id, cleanData)
        toast.success("Student updated successfully!")
      } else {
        await createStudent(cleanData)
        toast.success("Student created successfully!")
      }

      if (fixedSchoolId) {
        router.push("/principal/students")
      } else {
        router.push("/admin/students")
      }
      router.refresh()
    } catch (error: any) {
      console.error("Error saving student:", error)
      if (error.message?.includes("duplicate")) {
        toast.error("A student with this admission number already exists")
      } else {
        toast.error("Failed to save student. Please try again.")
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
            <CardDescription>Basic details about the student</CardDescription>
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
                <Label htmlFor="blood_group">Blood Group</Label>
                <Select value={formData.blood_group} onValueChange={(value) => setFormData({ ...formData, blood_group: value })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select blood group" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="A+">A+</SelectItem>
                    <SelectItem value="A-">A-</SelectItem>
                    <SelectItem value="B+">B+</SelectItem>
                    <SelectItem value="B-">B-</SelectItem>
                    <SelectItem value="AB+">AB+</SelectItem>
                    <SelectItem value="AB-">AB-</SelectItem>
                    <SelectItem value="O+">O+</SelectItem>
                    <SelectItem value="O-">O-</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label htmlFor="aadhar_number">Aadhar Number</Label>
                <Input
                  id="aadhar_number"
                  placeholder="12 digit Aadhar number"
                  value={formData.aadhar_number}
                  onChange={(e) => setFormData({ ...formData, aadhar_number: e.target.value.replace(/\D/g, "").slice(0, 12) })}
                  maxLength={12}
                />
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Academic Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <School className="h-5 w-5" />
              Academic Information
            </CardTitle>
            <CardDescription>School and class details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div className="space-y-2">
                <Label htmlFor="admission_number" className="flex items-center gap-1">
                  <Hash className="h-3 w-3" />
                  Admission Number *
                </Label>
                <Input
                  id="admission_number"
                  placeholder="e.g., ADM2024001"
                  value={formData.admission_number}
                  onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="roll_number">Roll Number</Label>
                <Input
                  id="roll_number"
                  placeholder="Class roll number"
                  value={formData.roll_number}
                  onChange={(e) => setFormData({ ...formData, roll_number: e.target.value })}
                />
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {!fixedSchoolId && (
                <div className="space-y-2">
                  <Label htmlFor="school">School *</Label>
                  <Select value={formData.school_id} onValueChange={handleSchoolChange} disabled={loading}>
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
                <Label htmlFor="class">Class</Label>
                <Select
                  value={formData.current_class_id}
                  onValueChange={handleClassChange}
                  disabled={!formData.school_id && !fixedSchoolId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.school_id || fixedSchoolId ? "Select class" : "Select school first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="section">Section</Label>
                <Select
                  value={formData.section_id}
                  onValueChange={(value) => setFormData({ ...formData, section_id: value })}
                  disabled={!formData.current_class_id || sections.length === 0}
                >
                  <SelectTrigger>
                    <SelectValue placeholder={formData.current_class_id ? (sections.length > 0 ? "Select section" : "No sections") : "Select class first"} />
                  </SelectTrigger>
                  <SelectContent>
                    {sections.map((section) => (
                      <SelectItem key={section.id} value={section.id}>
                        {section.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Address Information */}
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <MapPin className="h-5 w-5" />
              Address Information
            </CardTitle>
            <CardDescription>Residential address details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Textarea
                id="address"
                placeholder="Street address, house number, landmark, etc."
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
                rows={2}
              />
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              <div className="space-y-2">
                <Label htmlFor="city">City</Label>
                <Input
                  id="city"
                  placeholder="City name"
                  value={formData.city}
                  onChange={(e) => setFormData({ ...formData, city: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="state">State</Label>
                <Input
                  id="state"
                  placeholder="State name"
                  value={formData.state}
                  onChange={(e) => setFormData({ ...formData, state: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="pincode">Pincode</Label>
                <Input
                  id="pincode"
                  placeholder="6 digit pincode"
                  value={formData.pincode}
                  onChange={(e) => setFormData({ ...formData, pincode: e.target.value.replace(/\D/g, "").slice(0, 6) })}
                  maxLength={6}
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
              {isEditing ? "Update Student" : "Create Student"}
            </Button>
          </CardFooter>
        </Card>
      </div>
    </form>
  )
}
