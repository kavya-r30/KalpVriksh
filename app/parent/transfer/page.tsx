"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Badge } from "@/components/ui/badge"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { ArrowRightLeft, Clock, CheckCircle, XCircle, Plus, FileText, User } from "lucide-react"
import { useRole } from "@/contexts/role-context"
import { getParentByUserId, getParentChildrenByUserId } from "@/lib/api/supabase-queries"
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

export default function ParentTransferPage() {
  const { userId } = useRole()
  const [parent, setParent] = useState<any>(null)
  const [children, setChildren] = useState<any[]>([])
  const [transferRequests, setTransferRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [dialogOpen, setDialogOpen] = useState(false)

  const [formData, setFormData] = useState({
    student_id: "",
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
        const parentData = await getParentByUserId(userId)
        setParent(parentData)

        const childrenData = await getParentChildrenByUserId(userId)
        setChildren(childrenData || [])

        // Fetch transfer requests for all children
        if (childrenData && childrenData.length > 0) {
          const childIds = childrenData.map((c: any) => c.id)
          const { data: requests, error } = await supabase
            .from("transfer_requests")
            .select(`
              *,
              student:students(first_name, last_name, admission_number)
            `)
            .in("student_id", childIds)
            .order("created_at", { ascending: false })

          if (error) throw error
          setTransferRequests(requests || [])
        }
      } catch (error) {
        console.error("[v0] Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId])

  const handleSubmit = async () => {
    if (!parent || !formData.student_id) return

    if (!formData.to_school_name || !formData.reason || !formData.transfer_date) {
      toast.error("Please fill in all required fields")
      return
    }

    const selectedChild = children.find((c) => c.id === formData.student_id)

    setSubmitting(true)
    try {
      const { data, error } = await supabase
        .from("transfer_requests")
        .insert({
          student_id: formData.student_id,
          from_school_id: selectedChild?.school?.id,
          to_school_name: formData.to_school_name,
          to_school_address: formData.to_school_address,
          reason: formData.reason,
          transfer_date: formData.transfer_date,
          status: "Pending",
          requested_by: parent.id,
        })
        .select(`
          *,
          student:students(first_name, last_name, admission_number)
        `)
        .single()

      if (error) throw error

      setTransferRequests([data, ...transferRequests])
      setFormData({ student_id: "", to_school_name: "", to_school_address: "", reason: "", transfer_date: "" })
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

  const getChildPendingRequests = (childId: string) => {
    return transferRequests.filter((r) => r.student_id === childId && r.status === "Pending")
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
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Transfer Requests</h2>
          <p className="text-muted-foreground mt-1">Apply for school transfer for your children</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button disabled={children.length === 0}>
              <Plus className="h-4 w-4 mr-2" />
              New Request
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>Apply for School Transfer</DialogTitle>
              <DialogDescription>Fill in the details below to request a transfer for your child.</DialogDescription>
            </DialogHeader>
            <div className="grid gap-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="child">Select Child *</Label>
                <Select
                  value={formData.student_id}
                  onValueChange={(value) => setFormData({ ...formData, student_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a child" />
                  </SelectTrigger>
                  <SelectContent>
                    {children.map((child) => (
                      <SelectItem
                        key={child.id}
                        value={child.id}
                        disabled={getChildPendingRequests(child.id).length > 0}
                      >
                        {child.first_name} {child.last_name}
                        {getChildPendingRequests(child.id).length > 0 && " (Pending request)"}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              {formData.student_id && (
                <div className="space-y-2">
                  <Label>Current School</Label>
                  <Input
                    value={children.find((c) => c.id === formData.student_id)?.school?.name || ""}
                    disabled
                    className="bg-muted"
                  />
                </div>
              )}
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
              <Button onClick={handleSubmit} disabled={submitting || !formData.student_id}>
                {submitting ? "Submitting..." : "Submit Request"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{transferRequests.length}</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {transferRequests.filter((r) => r.status === "Pending").length}
            </p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {transferRequests.filter((r) => r.status === "Approved").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Children Overview</CardTitle>
          <CardDescription>Your children's current enrollment status</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {children.length === 0 ? (
              <div className="col-span-2 text-center py-8 text-muted-foreground">
                <User className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No children found</p>
              </div>
            ) : (
              children.map((child) => {
                const pendingRequests = getChildPendingRequests(child.id)
                return (
                  <div key={child.id} className="flex items-center gap-4 p-4 rounded-lg border border-border/50">
                    <div className="p-2 bg-primary/10 rounded-full">
                      <User className="h-5 w-5 text-primary" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium">
                        {child.first_name} {child.last_name}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {child.school?.name} • {child.current_class?.name}
                      </p>
                    </div>
                    {pendingRequests.length > 0 && (
                      <Badge variant="outline" className="text-yellow-600 border-yellow-600">
                        Transfer Pending
                      </Badge>
                    )}
                  </div>
                )
              })
            )}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Transfer Request History</CardTitle>
          <CardDescription>Track the status of all transfer requests</CardDescription>
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
                      <div className="flex items-center gap-2">
                        <p className="font-medium">
                          {request.student?.first_name} {request.student?.last_name}
                        </p>
                        <ArrowRightLeft className="h-4 w-4 text-muted-foreground" />
                        <p className="font-medium">{request.to_school_name}</p>
                      </div>
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
