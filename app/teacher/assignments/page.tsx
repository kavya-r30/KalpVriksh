"use client"

import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, FileText, Calendar, Users, CheckCircle, Clock, Edit2, Trash2, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { InlineSelect } from "@/components/ui/inline-select"
import { useState, useEffect } from "react"
import { useRole } from "@/contexts/role-context"
import { getTeacherAssignments, getTeacherClasses, getAssignmentSubmissions, getStaffByUserId } from "@/lib/api/supabase-queries"
import { createAssignment, updateAssignment, deleteAssignment, gradeSubmission } from "@/lib/api/supabase-mutations"
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
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface Assignment {
  id: string
  title: string
  description: string
  class_id: string
  subject_id: string
  due_date: string
  status: string
  max_marks?: number
  class?: { name: string }
  subject?: { name: string }
}

interface Submission {
  id: string
  student: {
    id: string
    first_name: string
    last_name: string
    roll_number: string
  }
  submission_text?: string
  submission_file_url?: string
  submitted_at: string
  marks_obtained?: number
  status: string
  feedback?: string
}

export default function AssignmentsPage() {
  const { userId } = useRole()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)
  const [staffId, setStaffId] = useState<string>("")

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSubmissionsOpen, setIsSubmissionsOpen] = useState(false)
  const [isGradeOpen, setIsGradeOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Selected items
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissions, setSubmissions] = useState<Submission[]>([])
  const [selectedSubmission, setSelectedSubmission] = useState<Submission | null>(null)

  // Form states
  const [newAssignment, setNewAssignment] = useState({
    title: "",
    description: "",
    class_id: "",
    subject_id: "",
    due_date: "",
    status: "Active",
    max_marks: 100,
  })

  const [gradeData, setGradeData] = useState({
    marks_obtained: 0,
    feedback: "",
  })

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const [assignmentsData, classesData, staffData] = await Promise.all([
          getTeacherAssignments(userId),
          getTeacherClasses(userId),
          getStaffByUserId(userId),
        ])

        setAssignments(assignmentsData || [])
        setClasses(classesData || [])
        setStaffId(staffData?.id || "")
      } catch (error) {
        console.error("Error fetching assignment data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!userId || !staffId) return
    setIsSubmitting(true)

    try {
      const selectedClassObj = classes.find((c) => c.class_id === newAssignment.class_id)
      if (!selectedClassObj) return

      const payload = {
        title: newAssignment.title,
        description: newAssignment.description,
        class_id: newAssignment.class_id,
        subject_id: selectedClassObj.subject_id,
        due_date: newAssignment.due_date,
        status: newAssignment.status,
        max_marks: newAssignment.max_marks,
        teacher_id: staffId,
      }

      await createAssignment(payload)
      const fresh = await getTeacherAssignments(userId)
      setAssignments(fresh || [])
      setIsCreateOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error creating assignment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAssignment) return
    setIsSubmitting(true)

    try {
      const selectedClassObj = classes.find((c) => c.class_id === newAssignment.class_id)

      const payload = {
        title: newAssignment.title,
        description: newAssignment.description,
        class_id: newAssignment.class_id,
        subject_id: selectedClassObj?.subject_id || selectedAssignment.subject_id,
        due_date: newAssignment.due_date,
        status: newAssignment.status,
        max_marks: newAssignment.max_marks,
      }

      await updateAssignment(selectedAssignment.id, payload)
      const fresh = await getTeacherAssignments(userId!)
      setAssignments(fresh || [])
      setIsEditOpen(false)
      setSelectedAssignment(null)
      resetForm()
    } catch (error) {
      console.error("Error updating assignment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (assignmentId: string) => {
    if (!confirm("Are you sure you want to delete this assignment?")) return

    try {
      await deleteAssignment(assignmentId)
      const fresh = await getTeacherAssignments(userId!)
      setAssignments(fresh || [])
    } catch (error) {
      console.error("Error deleting assignment:", error)
    }
  }

  const openEditDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setNewAssignment({
      title: assignment.title,
      description: assignment.description || "",
      class_id: assignment.class_id,
      subject_id: assignment.subject_id,
      due_date: assignment.due_date,
      status: assignment.status || "Active",
      max_marks: assignment.max_marks || 100,
    })
    setIsEditOpen(true)
  }

  const openSubmissionsDialog = async (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    try {
      const data = await getAssignmentSubmissions(assignment.id)
      setSubmissions(data || [])
      setIsSubmissionsOpen(true)
    } catch (error) {
      console.error("Error fetching submissions:", error)
    }
  }

  const openGradeDialog = (submission: Submission) => {
    setSelectedSubmission(submission)
    setGradeData({
      marks_obtained: submission.marks_obtained || 0,
      feedback: submission.feedback || "",
    })
    setIsGradeOpen(true)
  }

  const handleGrade = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedSubmission || !staffId) return
    setIsSubmitting(true)

    try {
      await gradeSubmission(selectedSubmission.id, {
        marks_obtained: gradeData.marks_obtained,
        feedback: gradeData.feedback,
        graded_by: staffId,
      })

      // Refresh submissions
      if (selectedAssignment) {
        const data = await getAssignmentSubmissions(selectedAssignment.id)
        setSubmissions(data || [])
      }
      setIsGradeOpen(false)
      setSelectedSubmission(null)
    } catch (error) {
      console.error("Error grading submission:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const resetForm = () => {
    setNewAssignment({
      title: "",
      description: "",
      class_id: "",
      subject_id: "",
      due_date: "",
      status: "Active",
      max_marks: 100,
    })
  }

  const filteredAssignments =
    statusFilter === "all" ? assignments : assignments.filter((a) => a.status === statusFilter)

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Completed":
        return <Badge className="bg-green-500/10 text-green-500 hover:bg-green-500/20">Completed</Badge>
      case "Draft":
        return <Badge variant="outline">Draft</Badge>
      default:
        return <Badge className="bg-blue-500/10 text-blue-500 hover:bg-blue-500/20">Active</Badge>
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
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
                  <Label htmlFor="class">Class & Subject</Label>
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
                <div className="grid grid-cols-2 gap-4">
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
                    <Label htmlFor="max_marks">Max Marks</Label>
                    <Input
                      id="max_marks"
                      type="number"
                      value={newAssignment.max_marks}
                      onChange={(e) => setNewAssignment({ ...newAssignment, max_marks: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="status">Status</Label>
                  <Select
                    value={newAssignment.status}
                    onValueChange={(val) => setNewAssignment({ ...newAssignment, status: val })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Active">Active</SelectItem>
                      <SelectItem value="Draft">Draft</SelectItem>
                    </SelectContent>
                  </Select>
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

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <FileText className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.length}</p>
                <p className="text-sm text-muted-foreground">Total Assignments</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <CheckCircle className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.filter(a => a.status === "Active").length}</p>
                <p className="text-sm text-muted-foreground">Active</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Clock className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{assignments.filter(a => a.status === "Draft").length}</p>
                <p className="text-sm text-muted-foreground">Drafts</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{classes.length}</p>
                <p className="text-sm text-muted-foreground">Classes</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Assignments List */}
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
                      {getStatusBadge(assignment.status)}
                    </div>
                    <p className="text-sm text-muted-foreground mt-1">
                      {assignment.class?.name} • {assignment.subject?.name}
                    </p>
                    {assignment.description && (
                      <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{assignment.description}</p>
                    )}
                    <div className="flex items-center gap-4 mt-3 text-sm">
                      <span className="text-muted-foreground flex items-center">
                        <Calendar className="h-3 w-3 mr-1" />
                        Due: {new Date(assignment.due_date).toLocaleDateString()}
                      </span>
                      {assignment.max_marks && (
                        <span className="text-muted-foreground">Max Marks: {assignment.max_marks}</span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="flex gap-2">
                  <Button variant="outline" size="sm" onClick={() => openSubmissionsDialog(assignment)}>
                    <Eye className="h-4 w-4 mr-1" />
                    Submissions
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => openEditDialog(assignment)}>
                    <Edit2 className="h-4 w-4" />
                  </Button>
                  <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(assignment.id)}>
                    <Trash2 className="h-4 w-4" />
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

      {/* Edit Assignment Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Assignment</DialogTitle>
            <DialogDescription>Update assignment details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Title</Label>
              <Input
                id="edit-title"
                value={newAssignment.title}
                onChange={(e) => setNewAssignment({ ...newAssignment, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-class">Class & Subject</Label>
              <Select
                value={newAssignment.class_id}
                onValueChange={(val) => setNewAssignment({ ...newAssignment, class_id: val })}
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
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-due_date">Due Date</Label>
                <Input
                  id="edit-due_date"
                  type="date"
                  value={newAssignment.due_date}
                  onChange={(e) => setNewAssignment({ ...newAssignment, due_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-max_marks">Max Marks</Label>
                <Input
                  id="edit-max_marks"
                  type="number"
                  value={newAssignment.max_marks}
                  onChange={(e) => setNewAssignment({ ...newAssignment, max_marks: parseInt(e.target.value) })}
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-status">Status</Label>
              <Select
                value={newAssignment.status}
                onValueChange={(val) => setNewAssignment({ ...newAssignment, status: val })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="Active">Active</SelectItem>
                  <SelectItem value="Completed">Completed</SelectItem>
                  <SelectItem value="Draft">Draft</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description</Label>
              <Textarea
                id="edit-description"
                value={newAssignment.description}
                onChange={(e) => setNewAssignment({ ...newAssignment, description: e.target.value })}
                rows={3}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Submissions Dialog */}
      <Dialog open={isSubmissionsOpen} onOpenChange={setIsSubmissionsOpen}>
        <DialogContent className="max-w-4xl">
          <DialogHeader>
            <DialogTitle>Submissions - {selectedAssignment?.title}</DialogTitle>
            <DialogDescription>
              View and grade student submissions. Max Marks: {selectedAssignment?.max_marks || 100}
            </DialogDescription>
          </DialogHeader>
          <div className="max-h-[60vh] overflow-auto">
            {submissions.length > 0 ? (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Roll No</TableHead>
                    <TableHead>Student Name</TableHead>
                    <TableHead>Submitted At</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Marks</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {submissions.map((submission) => (
                    <TableRow key={submission.id}>
                      <TableCell>{submission.student?.roll_number}</TableCell>
                      <TableCell>
                        {submission.student?.first_name} {submission.student?.last_name}
                      </TableCell>
                      <TableCell>{new Date(submission.submitted_at).toLocaleString()}</TableCell>
                      <TableCell>
                        <Badge variant={submission.status === "Graded" ? "default" : "secondary"}>
                          {submission.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {submission.marks_obtained !== null && submission.marks_obtained !== undefined
                          ? `${submission.marks_obtained}/${selectedAssignment?.max_marks || 100}`
                          : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button size="sm" variant="outline" onClick={() => openGradeDialog(submission)}>
                          {submission.status === "Graded" ? "Edit Grade" : "Grade"}
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                No submissions yet for this assignment.
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>

      {/* Grade Dialog */}
      <Dialog open={isGradeOpen} onOpenChange={setIsGradeOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Grade Submission</DialogTitle>
            <DialogDescription>
              Student: {selectedSubmission?.student?.first_name} {selectedSubmission?.student?.last_name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleGrade} className="space-y-4">
            {selectedSubmission?.submission_text && (
              <div className="space-y-2">
                <Label>Submission</Label>
                <div className="p-3 bg-muted rounded-lg text-sm max-h-40 overflow-auto">
                  {selectedSubmission.submission_text}
                </div>
              </div>
            )}
            {selectedSubmission?.submission_file_url && (
              <div className="space-y-2">
                <Label>Attached File</Label>
                <a
                  href={selectedSubmission.submission_file_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary underline text-sm"
                >
                  View Attachment
                </a>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="marks">Marks (out of {selectedAssignment?.max_marks || 100})</Label>
              <Input
                id="marks"
                type="number"
                min={0}
                max={selectedAssignment?.max_marks || 100}
                value={gradeData.marks_obtained}
                onChange={(e) => setGradeData({ ...gradeData, marks_obtained: parseInt(e.target.value) || 0 })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="feedback">Feedback (Optional)</Label>
              <Textarea
                id="feedback"
                value={gradeData.feedback}
                onChange={(e) => setGradeData({ ...gradeData, feedback: e.target.value })}
                rows={3}
                placeholder="Add feedback for the student..."
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Saving..." : "Save Grade"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
