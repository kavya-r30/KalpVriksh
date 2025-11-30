"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Clock, CheckCircle, XCircle, Search, User, School, Calendar, ArrowRightLeft } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { toast } from "sonner"

export default function AdminTransfersPage() {
  const [transferRequests, setTransferRequests] = useState<any[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [processing, setProcessing] = useState(false)
  const [searchQuery, setSearchQuery] = useState("")
  const [schoolFilter, setSchoolFilter] = useState("all")
  const [selectedRequest, setSelectedRequest] = useState<any>(null)
  const [actionDialogOpen, setActionDialogOpen] = useState(false)
  const [actionType, setActionType] = useState<"approve" | "reject" | null>(null)
  const [tcNumber, setTcNumber] = useState("")
  const [rejectionReason, setRejectionReason] = useState("")

  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchData() {
      try {
        // Fetch all schools for filter
        const { data: schoolsData } = await supabase.from("schools").select("id, name").order("name")

        setSchools(schoolsData || [])

        // Fetch all transfer requests across all schools
        const { data: requests, error } = await supabase
          .from("transfer_requests")
          .select(`
            *,
            student:students(
              first_name, 
              last_name, 
              admission_number,
              current_class:classes(name),
              section:sections(name)
            ),
            from_school:schools!from_school_id(id, name),
            requested_by_parent:parents!requested_by(first_name, last_name, phone, email)
          `)
          .order("created_at", { ascending: false })

        if (error) throw error
        setTransferRequests(requests || [])
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [])

  const handleAction = async () => {
    if (!selectedRequest || !actionType) return

    setProcessing(true)
    try {
      if (actionType === "approve") {
        if (!tcNumber.trim()) {
          toast.error("Please enter a TC number")
          setProcessing(false)
          return
        }

        const { error } = await supabase
          .from("transfer_requests")
          .update({
            status: "Approved",
            tc_number: tcNumber,
          })
          .eq("id", selectedRequest.id)

        if (error) throw error
        toast.success("Transfer request approved successfully")
      } else {
        const { error } = await supabase
          .from("transfer_requests")
          .update({
            status: "Rejected",
          })
          .eq("id", selectedRequest.id)

        if (error) throw error
        toast.success("Transfer request rejected")
      }

      // Refresh the list
      setTransferRequests(
        transferRequests.map((r) =>
          r.id === selectedRequest.id
            ? {
                ...r,
                status: actionType === "approve" ? "Approved" : "Rejected",
                tc_number: actionType === "approve" ? tcNumber : r.tc_number,
              }
            : r,
        ),
      )

      setActionDialogOpen(false)
      setSelectedRequest(null)
      setTcNumber("")
      setRejectionReason("")
    } catch (error) {
      console.error("Error processing request:", error)
      toast.error("Failed to process request")
    } finally {
      setProcessing(false)
    }
  }

  const openActionDialog = (request: any, type: "approve" | "reject") => {
    setSelectedRequest(request)
    setActionType(type)
    setActionDialogOpen(true)
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

  const filteredRequests = transferRequests.filter((request) => {
    const searchLower = searchQuery.toLowerCase()
    const matchesSearch =
      request.student?.first_name?.toLowerCase().includes(searchLower) ||
      request.student?.last_name?.toLowerCase().includes(searchLower) ||
      request.student?.admission_number?.toLowerCase().includes(searchLower) ||
      request.to_school_name?.toLowerCase().includes(searchLower) ||
      request.from_school?.name?.toLowerCase().includes(searchLower)

    const matchesSchool = schoolFilter === "all" || request.from_school_id === schoolFilter

    return matchesSearch && matchesSchool
  })

  const pendingRequests = filteredRequests.filter((r) => r.status === "Pending")
  const approvedRequests = filteredRequests.filter((r) => r.status === "Approved")
  const rejectedRequests = filteredRequests.filter((r) => r.status === "Rejected")

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const RequestCard = ({ request }: { request: any }) => (
    <div className="p-4 rounded-lg border border-border/50 hover:bg-secondary/30 transition-colors space-y-4">
      <div className="flex items-start justify-between">
        <div className="flex gap-4">
          <div className="p-2 bg-primary/10 rounded-full h-fit">
            <User className="h-5 w-5 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="font-semibold text-lg">
              {request.student?.first_name} {request.student?.last_name}
            </p>
            <p className="text-sm text-muted-foreground">Admission No: {request.student?.admission_number}</p>
            <p className="text-sm text-muted-foreground">
              Class: {request.student?.current_class?.name} - {request.student?.section?.name || "N/A"}
            </p>
          </div>
        </div>
        <Badge variant={getStatusVariant(request.status) as any}>{request.status}</Badge>
      </div>

      <div className="grid gap-3 md:grid-cols-2 pt-2 border-t border-border/50">
        <div className="flex items-start gap-2">
          <ArrowRightLeft className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium">From School</p>
            <p className="text-sm text-muted-foreground">{request.from_school?.name || "N/A"}</p>
          </div>
        </div>
        <div className="flex items-start gap-2">
          <School className="h-4 w-4 text-muted-foreground mt-0.5" />
          <div>
            <p className="text-sm font-medium">To School</p>
            <p className="text-sm text-muted-foreground">{request.to_school_name}</p>
            {request.to_school_address && <p className="text-xs text-muted-foreground">{request.to_school_address}</p>}
          </div>
        </div>
      </div>

      <div className="flex items-start gap-2 pt-2 border-t border-border/50">
        <Calendar className="h-4 w-4 text-muted-foreground mt-0.5" />
        <div>
          <p className="text-sm font-medium">Dates</p>
          <p className="text-sm text-muted-foreground">
            Requested: {new Date(request.created_at).toLocaleDateString()}
          </p>
          {request.transfer_date && (
            <p className="text-sm text-muted-foreground">
              Preferred: {new Date(request.transfer_date).toLocaleDateString()}
            </p>
          )}
        </div>
      </div>

      <div className="pt-2">
        <p className="text-sm font-medium mb-1">Reason</p>
        <p className="text-sm text-muted-foreground">{request.reason}</p>
      </div>

      {request.requested_by_parent && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-sm font-medium mb-1">Requested By</p>
          <p className="text-sm text-muted-foreground">
            {request.requested_by_parent.first_name} {request.requested_by_parent.last_name}
            {request.requested_by_parent.phone && ` • ${request.requested_by_parent.phone}`}
          </p>
        </div>
      )}

      {request.tc_number && (
        <div className="pt-2 border-t border-border/50">
          <p className="text-sm font-medium">TC Number: {request.tc_number}</p>
        </div>
      )}

      {request.status === "Pending" && (
        <div className="flex gap-2 pt-2">
          <Button variant="default" className="flex-1" onClick={() => openActionDialog(request, "approve")}>
            <CheckCircle className="h-4 w-4 mr-2" />
            Approve
          </Button>
          <Button
            variant="outline"
            className="flex-1 bg-transparent"
            onClick={() => openActionDialog(request, "reject")}
          >
            <XCircle className="h-4 w-4 mr-2" />
            Reject
          </Button>
        </div>
      )}
    </div>
  )

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Transfer Requests</h2>
        <p className="text-muted-foreground mt-1">Manage student transfer requests across all schools</p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Requests</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold">{transferRequests.length}</p>
          </CardContent>
        </Card>
        <Card className="border-yellow-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-yellow-600">
              {transferRequests.filter((r) => r.status === "Pending").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-green-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Approved</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-green-600">
              {transferRequests.filter((r) => r.status === "Approved").length}
            </p>
          </CardContent>
        </Card>
        <Card className="border-red-500/30">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Rejected</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-3xl font-bold text-red-600">
              {transferRequests.filter((r) => r.status === "Rejected").length}
            </p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <CardTitle>All Transfer Requests</CardTitle>
              <CardDescription>Review and process transfer applications from all schools</CardDescription>
            </div>
            <div className="flex flex-col sm:flex-row gap-2">
              <Select value={schoolFilter} onValueChange={setSchoolFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <SelectValue placeholder="Filter by school" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Schools</SelectItem>
                  {schools.map((school) => (
                    <SelectItem key={school.id} value={school.id}>
                      {school.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <div className="relative w-full sm:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or school..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <Tabs defaultValue="pending" className="w-full">
            <TabsList className="grid w-full grid-cols-3 mb-6">
              <TabsTrigger value="pending" className="gap-2">
                <Clock className="h-4 w-4" />
                Pending ({pendingRequests.length})
              </TabsTrigger>
              <TabsTrigger value="approved" className="gap-2">
                <CheckCircle className="h-4 w-4" />
                Approved ({approvedRequests.length})
              </TabsTrigger>
              <TabsTrigger value="rejected" className="gap-2">
                <XCircle className="h-4 w-4" />
                Rejected ({rejectedRequests.length})
              </TabsTrigger>
            </TabsList>

            <TabsContent value="pending">
              {pendingRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No pending transfer requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {pendingRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="approved">
              {approvedRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <CheckCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No approved transfer requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {approvedRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </TabsContent>

            <TabsContent value="rejected">
              {rejectedRequests.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <XCircle className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No rejected transfer requests</p>
                </div>
              ) : (
                <div className="space-y-4">
                  {rejectedRequests.map((request) => (
                    <RequestCard key={request.id} request={request} />
                  ))}
                </div>
              )}
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      <Dialog open={actionDialogOpen} onOpenChange={setActionDialogOpen}>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle>
              {actionType === "approve" ? "Approve Transfer Request" : "Reject Transfer Request"}
            </DialogTitle>
            <DialogDescription>
              {actionType === "approve"
                ? "Enter the Transfer Certificate (TC) number to approve this request."
                : "Are you sure you want to reject this transfer request?"}
            </DialogDescription>
          </DialogHeader>
          {selectedRequest && (
            <div className="py-4">
              <div className="p-3 bg-secondary/50 rounded-lg mb-4">
                <p className="font-medium">
                  {selectedRequest.student?.first_name} {selectedRequest.student?.last_name}
                </p>
                <p className="text-sm text-muted-foreground">From: {selectedRequest.from_school?.name || "N/A"}</p>
                <p className="text-sm text-muted-foreground">To: {selectedRequest.to_school_name}</p>
              </div>
              {actionType === "approve" && (
                <div className="space-y-2">
                  <Label htmlFor="tc-number">TC Number *</Label>
                  <Input
                    id="tc-number"
                    placeholder="Enter Transfer Certificate number"
                    value={tcNumber}
                    onChange={(e) => setTcNumber(e.target.value)}
                  />
                </div>
              )}
              {actionType === "reject" && (
                <div className="space-y-2">
                  <Label htmlFor="rejection-reason">Reason for Rejection (Optional)</Label>
                  <Textarea
                    id="rejection-reason"
                    placeholder="Enter reason for rejection..."
                    value={rejectionReason}
                    onChange={(e) => setRejectionReason(e.target.value)}
                    rows={3}
                  />
                </div>
              )}
            </div>
          )}
          <DialogFooter>
            <Button variant="outline" onClick={() => setActionDialogOpen(false)}>
              Cancel
            </Button>
            <Button
              variant={actionType === "approve" ? "default" : "destructive"}
              onClick={handleAction}
              disabled={processing}
            >
              {processing ? "Processing..." : actionType === "approve" ? "Approve Request" : "Reject Request"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  )
}
