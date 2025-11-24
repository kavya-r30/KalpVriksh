"use client"

import type React from "react"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Calendar } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { InlineSelect } from "@/components/ui/inline-select"
import { useState, useEffect } from "react"
import { useRole } from "@/contexts/role-context"
import { getTeacherAssignments, getTeacherClasses } from "@/lib/api/supabase-queries"
import { createAssignment } from "@/lib/api/supabase-mutations"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

export default function AssignmentsPage() {
  const { userId } = useRole()
  const [assignments, setAssignments] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    class_id: "",
    subject_id: "",
    due_date: "",
    status: "Active",
  })

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const [assignmentsData, classesData] = await Promise.all([
          getTeacherAssignments(userId),
          getTeacherClasses(userId),
        ])

        setAssignments(assignmentsData || [])
        setClasses(classesData || [])
      } catch (error) {
        console.error("[v0] Error fetching assignment data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId) return
    setIsSubmitting(true)

    try {
      // Find the selected class to get the subject_id automatically if possible,
      // but the form asks for class_id. The class object from getTeacherClasses
      // has both class_id and subject_id.
      const selectedClassObj = classes.find((c) => c.class_id === newAssignment.class_id)

      if (!selectedClassObj) {
        // fallback or error
        return
      }

      const payload = {
        title: newAssignment.title,
        description: newAssignment.description,
        class_id: newAssignment.class_id,
        subject_id: selectedClassObj.subject_id, // Use the subject associated with this teacher's class
        due_date: newAssignment.due_date,
        status: newAssignment.status,
      }

      const created = await createAssignment(payload)

      if (created) {
        // Refresh assignments
        const fresh = await getTeacherAssignments(userId)
        setAssignments(fresh || [])
        setIsCreateOpen(false)
        setNewAssignment({
          title: "",
          description: "",
          class_id: "",
          subject_id: "",
          due_date: "",
          status: "Active",
        })
      }
    } catch (error) {
      console.error("[v0] Error creating assignment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const filteredAssignments =
    statusFilter === "all" ? assignments : assignments.filter((a) => a.status === statusFilter)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Assignments</h2>
          <p className="text-muted-foreground mt-1">Manage homework and assignments for your classes</p>
        </div>
        <div className="flex items-center gap-3">
          <InlineSelect
            label="Status"
            placeholder="All Status"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: "All Status", value: "all" },
              { label: "Active", value: "Active" },
              { label: "Completed", value: "Completed" },
              { label: "Draft", value: "Draft" },
            ]}
          />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Create Assignment
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Create New Assignment</DialogTitle>
                <DialogDescription>Add a new assignment for your students.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Title</Label>
                  <Input
                    id="title"
                    value={newAssignment.title}
                    onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class">Class</Label>
                  <Select
                    value={newAssignment.class_id}
                    onValueChange={(val) => setNewAssignment({ ...newAssignment, class_id: val })}
                    required
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((cls) => (
                        <SelectItem key={cls.class_id} value={cls.class_id}>
                          {cls.class?.name} - {cls.subject?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="due_date">Due Date</Label>
                  <Input
                    id="due_date"
                    type="date"
                    value={newAssignment.due_date}
                    onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description</Label>
                  <Textarea
                    id="description"
                    value={newAssignment.description}
                    onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                    rows={3}
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Create Assignment"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="grid gap-4">
        {filteredAssignments.map((assignment) => (
          <Card key={assignment.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
            <CardContent className="p-6">
              <div className="flex items-start justify-between gap-4">
                <div className="flex items-start gap-4 flex-1">
                  <div className="rounded-lg bg-secondary/50 p-3 ring-1 ring-border/50">
                    <FileText className="h-6 w-6 text-foreground" />
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-2">
                      <h3 className="font-semibold text-lg">{assignment.title}</h3>
                      <Badge variant={assignment.status === "Completed" ? "default" : "secondary"}>
                        {assignment.status}
                      </Badge>
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {assignment.class?.name} • {assignment.subject?.name}
                    </p>
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-muted-foreground flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm">
                    View Submissions
                  </Button>
                  <Button variant="ghost" size="sm">
                    Edit
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredAssignments.length === 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Assignments Found</p>
            <p className="text-sm text-muted-foreground mt-2">Create your first assignment to get started.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
