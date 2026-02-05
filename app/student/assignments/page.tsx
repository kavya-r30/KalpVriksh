"use client"

import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Calendar, Clock, CheckCircle, AlertCircle, Send, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { InlineSelect } from "@/components/ui/inline-select"
import { useState, useEffect } from "react"
import { useRole } from "@/contexts/role-context"
import { getStudentByUserId } from "@/lib/api/supabase-queries"
import { submitAssignment } from "@/lib/api/supabase-mutations"
import { getSupabaseClient } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"

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
  submission?: {
    id: string
    status: string
    marks_obtained?: number
    submitted_at: string
    feedback?: string
  }[]
}

export default function StudentAssignmentsPage() {
  const { userId } = useRole()
  const [assignments, setAssignments] = useState<Assignment[]>([])
  const [studentId, setStudentId] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [isSubmitOpen, setIsSubmitOpen] = useState(false)
  const [isViewOpen, setIsViewOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)

  // Selected assignment
  const [selectedAssignment, setSelectedAssignment] = useState<Assignment | null>(null)
  const [submissionText, setSubmissionText] = useState("")

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const student = await getStudentByUserId(userId)
        setStudentId(student.id)

        const supabase = getSupabaseClient()

        // Get assignments for the student's class
        const { data: assignmentsData, error } = await supabase
          .from("assignments")
          .select(`
            *,
            class:classes(name),
            subject:subjects(name)
          `)
          .eq("class_id", student.current_class_id)
          .eq("status", "Active")
          .order("due_date", { ascending: true })

        if (error) throw error

        // Get submissions for each assignment
        const assignmentsWithSubmissions = await Promise.all(
          (assignmentsData || []).map(async (assignment) => {
            const { data: submissions } = await supabase
              .from("assignment_submissions")
              .select("*")
              .eq("assignment_id", assignment.id)
              .eq("student_id", student.id)

            return {
              ...assignment,
              submission: submissions || [],
            }
          })
        )

        setAssignments(assignmentsWithSubmissions)
      } catch (error) {
        console.error("Error fetching assignments:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedAssignment || !studentId) return
    setIsSubmitting(true)

    try {
      await submitAssignment({
        assignment_id: selectedAssignment.id,
        student_id: studentId,
        submission_text: submissionText,
      })

      // Refresh assignments
      const supabase = getSupabaseClient()
      const student = await getStudentByUserId(userId!)

      const { data: assignmentsData } = await supabase
        .from("assignments")
        .select(`
          *,
          class:classes(name),
          subject:subjects(name)
        `)
        .eq("class_id", student.current_class_id)
        .eq("status", "Active")
        .order("due_date", { ascending: true })

      const assignmentsWithSubmissions = await Promise.all(
        (assignmentsData || []).map(async (assignment) => {
          const { data: submissions } = await supabase
            .from("assignment_submissions")
            .select("*")
            .eq("assignment_id", assignment.id)
            .eq("student_id", student.id)

          return {
            ...assignment,
            submission: submissions || [],
          }
        })
      )

      setAssignments(assignmentsWithSubmissions)
      setIsSubmitOpen(false)
      setSelectedAssignment(null)
      setSubmissionText("")
    } catch (error) {
      console.error("Error submitting assignment:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const openSubmitDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setSubmissionText("")
    setIsSubmitOpen(true)
  }

  const openViewDialog = (assignment: Assignment) => {
    setSelectedAssignment(assignment)
    setIsViewOpen(true)
  }

  const getSubmissionStatus = (assignment: Assignment) => {
    if (!assignment.submission || assignment.submission.length === 0) {
      const dueDate = new Date(assignment.due_date)
      const now = new Date()
      if (dueDate < now) {
        return "overdue"
      }
      return "pending"
    }
    return assignment.submission[0].status.toLowerCase()
  }

  const filteredAssignments = assignments.filter((a) => {
    if (statusFilter === "all") return true
    const status = getSubmissionStatus(a)
    return status === statusFilter
  })

  const stats = {
    total: assignments.length,
    pending: assignments.filter((a) => getSubmissionStatus(a) === "pending").length,
    submitted: assignments.filter((a) => ["submitted", "graded"].includes(getSubmissionStatus(a))).length,
    graded: assignments.filter((a) => getSubmissionStatus(a) === "graded").length,
  }

  const completionRate = stats.total > 0 ? Math.round((stats.submitted / stats.total) * 100) : 0

  const getStatusBadge = (assignment: Assignment) => {
    const status = getSubmissionStatus(assignment)
    switch (status) {
      case "graded":
        return <Badge className="bg-green-500/10 text-green-500">Graded</Badge>
      case "submitted":
        return <Badge className="bg-blue-500/10 text-blue-500">Submitted</Badge>
      case "overdue":
        return <Badge className="bg-red-500/10 text-red-500">Overdue</Badge>
      default:
        return <Badge className="bg-yellow-500/10 text-yellow-500">Pending</Badge>
    }
  }

  const getDaysRemaining = (dueDate: string) => {
    const due = new Date(dueDate)
    const now = new Date()
    const diff = Math.ceil((due.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
    if (diff < 0) return "Overdue"
    if (diff === 0) return "Due today"
    if (diff === 1) return "Due tomorrow"
    return `${diff} days left`
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
          <h2 className="text-3xl font-bold tracking-tight">My Assignments</h2>
          <p className="text-muted-foreground mt-1">View and submit your class assignments</p>
        </div>
        <InlineSelect
          label="Status"
          placeholder="All"
          value={statusFilter}
          onChange={setStatusFilter}
          options={[
            { label: "All", value: "all" },
            { label: "Pending", value: "pending" },
            { label: "Submitted", value: "submitted" },
            { label: "Graded", value: "graded" },
            { label: "Overdue", value: "overdue" },
          ]}
        />
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
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total</p>
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
                <p className="text-2xl font-bold">{stats.pending}</p>
                <p className="text-sm text-muted-foreground">Pending</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Send className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.submitted}</p>
                <p className="text-sm text-muted-foreground">Submitted</p>
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
                <p className="text-2xl font-bold">{stats.graded}</p>
                <p className="text-sm text-muted-foreground">Graded</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Completion Progress */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center justify-between mb-2">
            <span className="text-sm font-medium">Completion Progress</span>
            <span className="text-sm text-muted-foreground">{completionRate}%</span>
          </div>
          <Progress value={completionRate} className="h-2" />
        </CardContent>
      </Card>

      {/* Assignments List */}
      <div className="grid gap-4">
        {filteredAssignments.map((assignment) => {
          const status = getSubmissionStatus(assignment)
          const isSubmitted = status === "submitted" || status === "graded"
          const submission = assignment.submission?.[0]

          return (
            <Card key={assignment.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`rounded-lg p-3 ring-1 ring-border/50 ${
                      status === "overdue" ? "bg-red-500/10" :
                      status === "graded" ? "bg-green-500/10" :
                      status === "submitted" ? "bg-blue-500/10" :
                      "bg-secondary/50"
                    }`}>
                      <FileText className={`h-6 w-6 ${
                        status === "overdue" ? "text-red-500" :
                        status === "graded" ? "text-green-500" :
                        status === "submitted" ? "text-blue-500" :
                        "text-foreground"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{assignment.title}</h3>
                        {getStatusBadge(assignment)}
                      </div>
                      <p className="text-sm text-muted-foreground mt-1">
                        {assignment.subject?.name}
                      </p>
                      {assignment.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{assignment.description}</p>
                      )}
                      <div className="flex items-center gap-4 mt-3 text-sm">
                        <span className="text-muted-foreground flex items-center">
                          <Calendar className="h-3 w-3 mr-1" />
                          Due: {new Date(assignment.due_date).toLocaleDateString()}
                        </span>
                        <span className={`flex items-center ${
                          status === "overdue" ? "text-red-500" : "text-muted-foreground"
                        }`}>
                          <Clock className="h-3 w-3 mr-1" />
                          {getDaysRemaining(assignment.due_date)}
                        </span>
                        {assignment.max_marks && (
                          <span className="text-muted-foreground">Max: {assignment.max_marks} marks</span>
                        )}
                      </div>
                      {submission?.marks_obtained !== undefined && submission?.marks_obtained !== null && (
                        <div className="mt-3 p-2 bg-green-500/10 rounded-lg inline-block">
                          <span className="text-sm font-medium text-green-600">
                            Score: {submission.marks_obtained}/{assignment.max_marks || 100}
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="flex gap-2">
                    {isSubmitted ? (
                      <Button variant="outline" size="sm" onClick={() => openViewDialog(assignment)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    ) : (
                      <Button size="sm" onClick={() => openSubmitDialog(assignment)} disabled={status === "overdue"}>
                        <Send className="h-4 w-4 mr-1" />
                        Submit
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredAssignments.length === 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <FileText className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Assignments Found</p>
            <p className="text-sm text-muted-foreground mt-2">
              {statusFilter === "all"
                ? "No assignments have been given yet."
                : `No ${statusFilter} assignments.`}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Submit Dialog */}
      <Dialog open={isSubmitOpen} onOpenChange={setIsSubmitOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submit Assignment</DialogTitle>
            <DialogDescription>
              {selectedAssignment?.title} - {selectedAssignment?.subject?.name}
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleSubmit} className="space-y-4">
            {selectedAssignment?.description && (
              <div className="space-y-2">
                <Label>Instructions</Label>
                <div className="p-3 bg-muted rounded-lg text-sm">
                  {selectedAssignment.description}
                </div>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="submission">Your Answer</Label>
              <Textarea
                id="submission"
                value={submissionText}
                onChange={(e) => setSubmissionText(e.target.value)}
                rows={6}
                placeholder="Enter your answer here..."
                required
              />
            </div>
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <AlertCircle className="h-4 w-4" />
              <span>
                Due: {selectedAssignment && new Date(selectedAssignment.due_date).toLocaleDateString()}
              </span>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setIsSubmitOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Submitting..." : "Submit Assignment"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* View Submission Dialog */}
      <Dialog open={isViewOpen} onOpenChange={setIsViewOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Submission Details</DialogTitle>
            <DialogDescription>
              {selectedAssignment?.title}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4">
            {selectedAssignment?.submission?.[0] && (
              <>
                <div className="space-y-2">
                  <Label>Your Submission</Label>
                  <div className="p-3 bg-muted rounded-lg text-sm">
                    {selectedAssignment.submission[0].submission_text || "No text submitted"}
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Submitted At</Label>
                  <p className="text-sm">
                    {new Date(selectedAssignment.submission[0].submitted_at).toLocaleString()}
                  </p>
                </div>
                {selectedAssignment.submission[0].marks_obtained !== undefined &&
                  selectedAssignment.submission[0].marks_obtained !== null && (
                    <div className="space-y-2">
                      <Label>Marks Obtained</Label>
                      <p className="text-lg font-bold text-green-600">
                        {selectedAssignment.submission[0].marks_obtained}/{selectedAssignment.max_marks || 100}
                      </p>
                    </div>
                  )}
                {selectedAssignment.submission[0].feedback && (
                  <div className="space-y-2">
                    <Label>Teacher Feedback</Label>
                    <div className="p-3 bg-blue-500/10 rounded-lg text-sm">
                      {selectedAssignment.submission[0].feedback}
                    </div>
                  </div>
                )}
              </>
            )}
          </div>
          <DialogFooter>
            <Button onClick={() => setIsViewOpen(false)}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
