"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { getSchools, getClasses } from "@/lib/api/supabase-queries"
import { createStudent, updateStudent } from "@/lib/api/supabase-mutations"
import { Loader2, ArrowLeft } from "lucide-react"

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

  // Form State
  const [formData, setFormData] = useState({
    first_name: initialData?.first_name || "",
    last_name: initialData?.last_name || "",
    admission_number: initialData?.admission_number || "",
    gender: initialData?.gender || "",
    date_of_birth: initialData?.date_of_birth || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    school_id: initialData?.school_id || fixedSchoolId || "",
    current_class_id: initialData?.current_class_id || "",
  })

  useEffect(() => {
    async function loadOptions() {
      try {
        // If fixedSchoolId is provided, we don't need to fetch all schools, just classes for that school
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
          // Pre-select first school for new entries if none selected
          setFormData((prev) => ({ ...prev, school_id: schoolsData[0].id }))
          const classesData = await getClasses(schoolsData[0].id)
          setClasses(classesData || [])
        }
      } catch (error) {
        console.error("Failed to load options:", error)
      }
    }
    loadOptions()
  }, [isEditing, formData.school_id, fixedSchoolId])

  const handleSchoolChange = async (value: string) => {
    setFormData({ ...formData, school_id: value, current_class_id: "" })
    const classesData = await getClasses(value)
    setClasses(classesData || [])
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      const { email, phone, ...studentData } = formData

      if (isEditing) {
        await updateStudent(initialData.id, studentData)
      } else {
        await createStudent(studentData)
      }
      router.push("/admin/students")
      router.refresh()
    } catch (error) {
      console.error("Error saving student:", error)
      alert("Failed to save student. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Student" : "Add New Student"}</CardTitle>
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
              <Label htmlFor="admission_number">Admission Number</Label>
              <Input
                id="admission_number"
                value={formData.admission_number}
                onChange={(e) => setFormData({ ...formData, admission_number: e.target.value })}
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
                <Select value={formData.school_id} onValueChange={handleSchoolChange} disabled={loading}>
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
              <Label htmlFor="class">Class</Label>
              <Select
                value={formData.current_class_id}
                onValueChange={(value) => setFormData({ ...formData, current_class_id: value })}
                disabled={!formData.school_id || classes.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Class" />
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
          </div>

          <div className="space-y-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
            />
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
            {isEditing ? "Update Student" : "Create Student"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
