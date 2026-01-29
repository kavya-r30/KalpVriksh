"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Award, Eye, Printer, Plus, Clock } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { getParentChildrenByUserId } from "@/lib/api/supabase-queries"
import { getReportCardData, getCertificateData } from "@/lib/api/certificate-service"
import { createCertificateRequest, getStudentCertificateRequests } from "@/lib/api/certificate-request-service"
import { useRole } from "@/contexts/role-context"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import {
  ReportCardTemplate,
  BonafideCertificateTemplate,
  CharacterCertificateTemplate,
  LeavingCertificateTemplate,
  CasteCertificateTemplate,
} from "@/components/certificates"
import type { ReportCardData, CertificateData } from "@/lib/api/certificate-service"
import { printDocument } from "@/lib/utils/print-styles"
import { toast } from "sonner"

export default function ParentCertificatesPage() {
  const { userId } = useRole()
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState<string>("")
  const [reportCards, setReportCards] = useState<any[]>([])
  const [certificates, setCertificates] = useState<any[]>([])
  const [certificateRequests, setCertificateRequests] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Preview state
  const [previewData, setPreviewData] = useState<ReportCardData | CertificateData | null>(null)
  const [previewType, setPreviewType] = useState<string>("")
  const [showPreview, setShowPreview] = useState(false)

  // Request state
  const [showRequestDialog, setShowRequestDialog] = useState(false)
  const [requestCertType, setRequestCertType] = useState("")
  const [requestPurpose, setRequestPurpose] = useState("")
  const [submitting, setSubmitting] = useState(false)

  const printRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchChildren() {
      if (!userId) return
      try {
        const childrenData = await getParentChildrenByUserId(userId)
        setChildren(childrenData || [])
        if (childrenData && childrenData.length > 0) {
          setSelectedChild(childrenData[0].id)
        }
      } catch (error) {
        console.error("Error fetching children:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchChildren()
  }, [userId])

  useEffect(() => {
    async function fetchData() {
      if (!selectedChild) return
      try {
        // Fetch report cards
        const { data: reportCardsData } = await supabase
          .from("report_cards")
          .select("*, exam:exams(name, exam_type)")
          .eq("student_id", selectedChild)
          .order("created_at", { ascending: false })

        setReportCards(reportCardsData || [])

        // Fetch certificates
        const { data: certsData } = await supabase
          .from("certificates")
          .select("*")
          .eq("student_id", selectedChild)
          .order("issue_date", { ascending: false })

        setCertificates(certsData || [])

        // Fetch certificate requests
        const requests = await getStudentCertificateRequests(selectedChild)
        setCertificateRequests(requests)
      } catch (error) {
        console.error("Error fetching data:", error)
      }
    }
    fetchData()
  }, [selectedChild])

  const handleViewReportCard = async (examId: string) => {
    try {
      const data = await getReportCardData(selectedChild, examId)
      if (data) {
        setPreviewData(data)
        setPreviewType("report_card")
        setShowPreview(true)
      }
    } catch (error) {
      console.error("Error viewing report card:", error)
    }
  }

  const handleViewCertificate = async (cert: any) => {
    try {
      const data = await getCertificateData(selectedChild, cert.certificate_type)
      if (data) {
        data.certificate.number = cert.certificate_number
        data.certificate.issue_date = cert.issue_date
        data.certificate.verification_code = cert.verification_code
        setPreviewData(data)
        setPreviewType(cert.certificate_type)
        setShowPreview(true)
      }
    } catch (error) {
      console.error("Error viewing certificate:", error)
    }
  }

  const handlePrint = () => {
    if (printRef.current) {
      const title = previewType === "report_card" ? "Report Card" : `${previewType} Certificate`
      printDocument(printRef.current.innerHTML, title)
    }
  }

  const handleRequestCertificate = async () => {
    if (!selectedChild || !userId || !requestCertType) return
    setSubmitting(true)
    try {
      await createCertificateRequest({
        student_id: selectedChild,
        certificate_type: requestCertType,
        purpose: requestPurpose,
        requested_by: userId,
      })
      toast.success("Certificate request submitted successfully!")
      setShowRequestDialog(false)
      setRequestCertType("")
      setRequestPurpose("")

      // Refresh requests
      const requests = await getStudentCertificateRequests(selectedChild)
      setCertificateRequests(requests)
    } catch (error) {
      console.error("Error submitting request:", error)
      toast.error("Failed to submit certificate request")
    } finally {
      setSubmitting(false)
    }
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge variant="secondary">Pending</Badge>
      case "Approved":
        return <Badge variant="default" className="bg-blue-500">Approved</Badge>
      case "Generated":
        return <Badge variant="default" className="bg-green-500">Ready</Badge>
      case "Rejected":
        return <Badge variant="destructive">Rejected</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const getSelectedChildInfo = () => {
    return children.find((c) => c.id === selectedChild)
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  const selectedChildInfo = getSelectedChildInfo()

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Certificates & Report Cards</h2>
          <p className="text-muted-foreground mt-1">View and download your children&apos;s certificates and report cards</p>
        </div>

        <div className="flex items-center gap-4">
          {children.length > 1 && (
            <div className="w-64">
              <Label className="mb-2 block">Select Child</Label>
              <Select value={selectedChild} onValueChange={setSelectedChild}>
                <SelectTrigger>
                  <SelectValue placeholder="Select a child" />
                </SelectTrigger>
                <SelectContent>
                  {children.map((child) => (
                    <SelectItem key={child.id} value={child.id}>
                      {child.first_name} {child.last_name} - {child.current_class?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}

          <Dialog open={showRequestDialog} onOpenChange={setShowRequestDialog}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Request Certificate
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Request a Certificate</DialogTitle>
                <DialogDescription>
                  Submit a request for a certificate for {selectedChildInfo?.first_name}. Your request will be reviewed by the school administration.
                </DialogDescription>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Certificate Type</Label>
                  <Select value={requestCertType} onValueChange={setRequestCertType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select certificate type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Bonafide">Bonafide Certificate</SelectItem>
                      <SelectItem value="Character">Character Certificate</SelectItem>
                      <SelectItem value="Leaving">Leaving/Transfer Certificate</SelectItem>
                      <SelectItem value="Caste">Caste Certificate</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Purpose (Optional)</Label>
                  <Textarea
                    value={requestPurpose}
                    onChange={(e) => setRequestPurpose(e.target.value)}
                    placeholder="e.g., For bank account opening, scholarship application, etc."
                    rows={3}
                  />
                </div>
                <Button
                  className="w-full"
                  onClick={handleRequestCertificate}
                  disabled={!requestCertType || submitting}
                >
                  {submitting ? "Submitting..." : "Submit Request"}
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {selectedChildInfo && (
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-4">
              <div className="h-12 w-12 rounded-full bg-primary/10 flex items-center justify-center">
                <span className="text-lg font-bold text-primary">
                  {selectedChildInfo.first_name?.[0]}
                  {selectedChildInfo.last_name?.[0]}
                </span>
              </div>
              <div>
                <p className="font-semibold">
                  {selectedChildInfo.first_name} {selectedChildInfo.last_name}
                </p>
                <p className="text-sm text-muted-foreground">
                  {selectedChildInfo.current_class?.name} - {selectedChildInfo.section?.name} |{" "}
                  {selectedChildInfo.admission_number}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      <Tabs defaultValue="report-cards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="report-cards">Report Cards</TabsTrigger>
          <TabsTrigger value="certificates">Certificates</TabsTrigger>
          <TabsTrigger value="requests">
            <Clock className="h-4 w-4 mr-2" />
            Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="report-cards">
          <Card>
            <CardHeader>
              <CardTitle>Report Cards</CardTitle>
              <CardDescription>Exam-wise report cards for your child</CardDescription>
            </CardHeader>
            <CardContent>
              {reportCards.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <FileText className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No report cards available yet</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {reportCards.map((rc) => (
                    <div
                      key={rc.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-blue-100 dark:bg-blue-900/30 flex items-center justify-center">
                          <FileText className="h-5 w-5 text-blue-600" />
                        </div>
                        <div>
                          <p className="font-medium">{rc.exam?.name || "Exam"}</p>
                          <p className="text-sm text-muted-foreground">
                            {rc.exam?.exam_type} | {rc.percentage}% | Grade: {rc.grade}
                          </p>
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant={rc.percentage >= 60 ? "default" : "secondary"}>Rank #{rc.rank || "-"}</Badge>
                        <Button variant="outline" size="sm" onClick={() => handleViewReportCard(rc.exam_id)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="certificates">
          <Card>
            <CardHeader>
              <CardTitle>Certificates</CardTitle>
              <CardDescription>Generated certificates for your child</CardDescription>
            </CardHeader>
            <CardContent>
              {certificates.length === 0 ? (
                <div className="text-center py-12 text-muted-foreground">
                  <Award className="h-12 w-12 mx-auto mb-4 opacity-50" />
                  <p>No certificates generated yet</p>
                  <p className="text-sm mt-1">Use the &quot;Request Certificate&quot; button to request one</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {certificates.map((cert) => (
                    <div
                      key={cert.id}
                      className="flex items-center justify-between p-4 border rounded-lg hover:bg-muted/50 transition-colors"
                    >
                      <div className="flex items-center gap-4">
                        <div className="h-10 w-10 rounded-full bg-purple-100 dark:bg-purple-900/30 flex items-center justify-center">
                          <Award className="h-5 w-5 text-purple-600" />
                        </div>
                        <div>
                          <p className="font-medium">{cert.certificate_type} Certificate</p>
                          <p className="text-sm text-muted-foreground">
                            Issued: {new Date(cert.issue_date).toLocaleDateString()} | No: {cert.certificate_number}
                          </p>
                        </div>
                      </div>
                      <Button variant="outline" size="sm" onClick={() => handleViewCertificate(cert)}>
                        <Eye className="h-4 w-4 mr-1" />
                        View
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="requests">
          <Card>
            <CardHeader>
              <CardTitle>Certificate Requests</CardTitle>
              <CardDescription>Track the status of your certificate requests</CardDescription>
            </CardHeader>
            <CardContent>
              {certificateRequests.length === 0 ? (
                <div className="text-center py-8">
                  <Clock className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                  <p className="text-sm text-muted-foreground">
                    No certificate requests yet. Click &quot;Request Certificate&quot; to submit a request.
                  </p>
                </div>
              ) : (
                <div className="space-y-3">
                  {certificateRequests.map((request) => (
                    <div
                      key={request.id}
                      className="flex items-center justify-between p-4 border rounded-lg"
                    >
                      <div>
                        <p className="font-medium">{request.certificate_type} Certificate</p>
                        <p className="text-sm text-muted-foreground">
                          Requested: {new Date(request.created_at).toLocaleDateString()}
                          {request.purpose && ` • Purpose: ${request.purpose}`}
                        </p>
                        {request.remarks && (
                          <p className="text-sm text-muted-foreground mt-1">
                            Note: {request.remarks}
                          </p>
                        )}
                      </div>
                      {getStatusBadge(request.status)}
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] md:max-w-[900px] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>
              {previewType === "report_card" ? "Report Card" : `${previewType} Certificate`}
            </DialogTitle>
            <DialogDescription>Preview and download</DialogDescription>
          </DialogHeader>

          <div ref={printRef} className="bg-white rounded-lg overflow-hidden">
            {previewType === "report_card" && previewData && (
              <ReportCardTemplate data={previewData as ReportCardData} />
            )}
            {previewType === "Bonafide" && previewData && (
              <BonafideCertificateTemplate data={previewData as CertificateData} />
            )}
            {previewType === "Character" && previewData && (
              <CharacterCertificateTemplate data={previewData as CertificateData} />
            )}
            {previewType === "Leaving" && previewData && (
              <LeavingCertificateTemplate data={previewData as CertificateData} />
            )}
            {previewType === "Caste" && previewData && (
              <CasteCertificateTemplate data={previewData as CertificateData} />
            )}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)}>
              Close
            </Button>
            <Button onClick={handlePrint}>
              <Printer className="h-4 w-4 mr-2" />
              Print / Download PDF
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
