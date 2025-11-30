"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { ArrowRightLeft, Clock, CheckCircle, XCircle, Plus, FileText, School } from "lucide-react"
import { useRole } from "@/contexts/role-context"
import { getStudentByUserId } from "@/lib/api/supabase-queries"
import { getSupabaseClient } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { toast } from "sonner"

export default function StudentTransferPage() {
  const { userId } = useRole()
  const [student, setStudent] = useState<any>(null)
  const [transferRequests, setTransferRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    to_school_name: "",
    to_school_address: "",
    reason: "",
    transfer_date: "",
  })

  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchData() {
      if (!userId) return
      try {
        const studentData = await getStudentByUserId(userId)
        setStudent(studentData)

        // Fetch existing transfer requests
        const { data: requests, error } = await supabase
          .from("transfer_requests")
          .select("*")
          .eq("student_id", studentData.id)
          .order("created_at", { ascending: false })

        if (error) throw error
        setTransferRequests(requests || [])
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId])

  const handleSubmit = async () => {
    if (!student) return

    if (!formData.to_school_name || !formData.reason || !formData.transfer_date) {
      toast.error("Please fill in all required fields")
      return
    }

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from("transfer_requests")
        .insert({
          student_id: student.id,
          from_school_id: student.school?.id,
          to_school_name: formData.to_school_name,
          to_school_address: formData.to_school_address,
          reason: formData.reason,
          transfer_date: formData.transfer_date,
          status: "Pending",
        })
        .select()
        .single()

      if (error) throw error

      setTransferRequests([data, ...transferRequests])
      setFormData({ to_school_name: "", to_school_address: "", reason: "", transfer_date: "" })
      setDialogOpen(false)
      toast.success("Transfer request submitted successfully")
    } catch (error) {
      console.error("[v0] Error submitting transfer request:", error)
      toast.error("Failed to submit transfer request")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusIcon = (status: string) => {
    switch (status) {
      case "Pending":
        return <Clock className="h-4 w-4 text-yellow-500" />
      case "Approved":
        return <CheckCircle className="h-4 w-4 text-green-500" />
      case "Rejected":
        return <XCircle className="h-4 w-4 text-red-500" />
      case "Completed":
        return <CheckCircle className="h-4 w-4 text-blue-500" />
      default:
        return <Clock className="h-4 w-4" />
    }
  }

  const getStatusVariant = (status: string) => {
    switch (status) {
      case "Pending":
        return "outline"
      case "Approved":
        return "default"
      case "Rejected":
        return "destructive"
      case "Completed":
        return "secondary"
      default:
        return "outline"
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const hasPendingRequest = transferRequests.some((r) => r.status === "Pending")

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transfer Request</h2>
          <p className="text-muted-foreground mt-1">Apply for school transfer or check status</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={hasPendingRequest}>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Apply for School Transfer</DialogTitle>
              <DialogDescription>Fill in the details below to request a transfer to another school.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="current-school">Current School</Label>
                <Input id="current-school" value={student?.school?.name || ""} disabled className="bg-muted" />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-school">Transfer To (School Name) *</Label>
                <Input
                  id="to-school"
                  placeholder="Enter destination school name"
                  value={formData.to_school_name}
                  onChange={(e) => setFormData({ ...formData, to_school_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="to-address">School Address</Label>
                <Input
                  id="to-address"
                  placeholder="Enter destination school address"
                  value={formData.to_school_address}
                  onChange={(e) => setFormData({ ...formData, to_school_address: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="transfer-date">Preferred Transfer Date *</Label>
                <Input
                  id="transfer-date"
                  type="date"
                  value={formData.transfer_date}
                  onChange={(e) => setFormData({ ...formData, transfer_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="reason">Reason for Transfer *</Label>
                <Textarea
                  id="reason"
                  placeholder="Please explain why you are requesting a transfer..."
                  value={formData.reason}
                  onChange={(e) => setFormData({ ...formData, reason: e.target.value })}
                  rows={4}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleSubmit} disabled={submitting}>
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {hasPendingRequest && (
        <Card className="border-yellow-500/50 bg-yellow-500/5">
          <CardContent className="flex items-center gap-3 py-4">
            <Clock className="h-5 w-5 text-yellow-500" />
            <p className="text-sm">
              You have a pending transfer request. Please wait for it to be processed before submitting a new one.
            </p>
          </CardContent>
        </Card>
      )}

      <div className="grid gap-4 md:grid-cols-2">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <School className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Current School</CardTitle>
                <CardDescription>Your enrollment details</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <p className="text-sm text-muted-foreground">School Name</p>
              <p className="font-medium">{student?.school?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Class</p>
              <p className="font-medium">{student?.current_class?.name || "N/A"}</p>
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Admission Number</p>
              <p className="font-medium">{student?.admission_number || "N/A"}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="p-2 bg-primary/10 rounded-lg">
                <ArrowRightLeft className="h-6 w-6 text-primary" />
              </div>
              <div>
                <CardTitle>Transfer Summary</CardTitle>
                <CardDescription>Your transfer request history</CardDescription>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Total Requests</span>
              <span className="font-medium">{transferRequests.length}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Pending</span>
              <span className="font-medium text-yellow-600">
                {transferRequests.filter((r) => r.status === "Pending").length}
              </span>
            </div>
            <div className="flex justify-between">
              <span className="text-sm text-muted-foreground">Approved</span>
              <span className="font-medium text-green-600">
                {transferRequests.filter((r) => r.status === "Approved").length}
              </span>
            </div>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Request History</CardTitle>
          <CardDescription>Track the status of your transfer requests</CardDescription>
        </CardHeader>
        <CardContent>
          {transferRequests.length === 0 ? (
            <div className="text-center py-12 text-muted-foreground">
              <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p>No transfer requests found</p>
              <p className="text-sm">Click "New Request" to apply for a school transfer</p>
            </div>
          ) : (
            <div className="space-y-4">
              {transferRequests.map((request) => (
                <div
                  key={request.id}
                  className="flex items-start justify-between p-4 rounded-lg border border-border/50 hover:bg-secondary/30 transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="mt-1">{getStatusIcon(request.status)}</div>
                    <div className="space-y-1">
                      <p className="font-medium">{request.to_school_name}</p>
                      <p className="text-sm text-muted-foreground">
                        {request.to_school_address || "Address not provided"}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        Requested: {new Date(request.created_at).toLocaleDateString()}
                      </p>
                      {request.transfer_date && (
                        <p className="text-sm text-muted-foreground">
                          Preferred Date: {new Date(request.transfer_date).toLocaleDateString()}
                        </p>
                      )}
                      <p className="text-sm mt-2">{request.reason}</p>
                    </div>
                  </div>
                  <div className="flex flex-col items-end gap-2">
                    <Badge variant={getStatusVariant(request.status) as any}>{request.status}</Badge>
                    {request.tc_number && (
                      <span className="text-xs text-muted-foreground">TC: {request.tc_number}</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
