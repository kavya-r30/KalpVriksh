"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createExam, updateExam } from "@/lib/api/supabase-mutations"
import { Loader2, ArrowLeft } from "lucide-react"

interface ExamFormProps {
  initialData?: any
  isEditing?: boolean
  schoolId: string
}

export function ExamForm({ initialData, isEditing = false, schoolId }: ExamFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    exam_type: initialData?.exam_type || "",
    academic_year: initialData?.academic_year || new Date().getFullYear().toString(),
    start_date: initialData?.start_date || "",
    end_date: initialData?.end_date || "",
    school_id: schoolId,
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isEditing) {
        await updateExam(initialData.id, formData)
      } else {
        await createExam(formData)
      }
      router.push("/principal/exams")
      router.refresh()
    } catch (error) {
      console.error("Error saving exam:", error)
      alert("Failed to save exam. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit Exam" : "Schedule New Exam"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">Exam Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
                placeholder="e.g. Mid Term 2024"
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="exam_type">Exam Type</Label>
              <Select
                value={formData.exam_type}
                onValueChange={(value) => setFormData({ ...formData, exam_type: value })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select Type" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Term">Term</SelectItem>
                  <SelectItem value="Unit Test">Unit Test</SelectItem>
                  <SelectItem value="Final">Final</SelectItem>
                  <SelectItem value="Practical">Practical</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="academic_year">Academic Year</Label>
              <Input
                id="academic_year"
                value={formData.academic_year}
                onChange={(e) => setFormData({ ...formData, academic_year: e.target.value })}
                required
                placeholder="e.g. 2024-2025"
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="start_date">Start Date</Label>
              <Input
                id="start_date"
                type="date"
                value={formData.start_date}
                onChange={(e) => setFormData({ ...formData, start_date: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="end_date">End Date</Label>
              <Input
                id="end_date"
                type="date"
                value={formData.end_date}
                onChange={(e) => setFormData({ ...formData, end_date: e.target.value })}
                required
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
            {isEditing ? "Update Exam" : "Schedule Exam"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
