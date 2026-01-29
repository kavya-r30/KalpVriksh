"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Eye, GraduationCap, Award, Shield, Printer, Plus, Clock } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useRole } from "@/contexts/role-context"
import { getStudentByUserId, getStudentCertificates } from "@/lib/api/supabase-queries"
import { getSupabaseClient } from "@/lib/supabase"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { ReportCardTemplate, BonafideCertificateTemplate, CharacterCertificateTemplate, LeavingCertificateTemplate, CasteCertificateTemplate } from "@/components/certificates"
import { getReportCardData, getCertificateData } from "@/lib/api/certificate-service"
import { createCertificateRequest, getStudentCertificateRequests } from "@/lib/api/certificate-request-service"
import type { ReportCardData, CertificateData } from "@/lib/api/certificate-service"
import { printDocument } from "@/lib/utils/print-styles"
import { toast } from "sonner"

export default function StudentCertificatesPage() {
  const { userId } = useRole()
  const [student, setStudent] = useState<any>(null)
  const [certificates, setCertificates] = useState<any[]>([])
  const [reportCards, setReportCards] = useState<any[]>([])
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
    async function fetchData() {
      if (!userId) return

      try {
        const studentData = await getStudentByUserId(userId)
        setStudent(studentData)

        if (studentData) {
          // Fetch certificates
          const certsData = await getStudentCertificates(studentData.id)
          setCertificates(certsData || [])

          // Fetch report cards
          const { data: reportCardsData } = await supabase
            .from("report_cards")
            .select(`
              *,
              exam:exams(name, exam_type, academic_year)
            `)
            .eq("student_id", studentData.id)
            .order("created_at", { ascending: false })

          setReportCards(reportCardsData || [])

          // Fetch certificate requests
          const requests = await getStudentCertificateRequests(studentData.id)
          setCertificateRequests(requests)
        }
      } catch (error) {
        console.error("Error fetching certificates:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const handleViewReportCard = async (examId: string) => {
    if (!student) return
    try {
      const data = await getReportCardData(student.id, examId)
      if (data) {
        setPreviewData(data)
        setPreviewType("report_card")
        setShowPreview(true)
      }
    } catch (error) {
      console.error("Error fetching report card:", error)
    }
  }

  const handleViewCertificate = async (cert: any) => {
    if (!student) return
    try {
      const data = await getCertificateData(student.id, cert.certificate_type)
      if (data) {
        // Override with actual certificate data
        data.certificate.number = cert.certificate_number
        data.certificate.issue_date = cert.issue_date
        data.certificate.verification_code = cert.verification_code
        setPreviewData(data)
        setPreviewType(cert.certificate_type)
        setShowPreview(true)
      }
    } catch (error) {
      console.error("Error fetching certificate:", error)
    }
  }

  const handlePrint = () => {
    if (printRef.current) {
      const title = previewType === "report_card" ? "Report Card" : `${previewType} Certificate`
      printDocument(printRef.current.innerHTML, title)
    }
  }

  const handleRequestCertificate = async () => {
    if (!student || !userId || !requestCertType) return
    setSubmitting(true)
    try {
      await createCertificateRequest({
        student_id: student.id,
        certificate_type: requestCertType,
        purpose: requestPurpose,
        requested_by: userId,
      })
      toast.success("Certificate request submitted successfully!")
      setShowRequestDialog(false)
      setRequestCertType("")
      setRequestPurpose("")

      // Refresh requests
      const requests = await getStudentCertificateRequests(student.id)
      setCertificateRequests(requests)
    } catch (error) {
      console.error("Error submitting request:", error)
      toast.error("Failed to submit certificate request")
    } finally {
      setSubmitting(false)
    }
  }

  const getCertificateIcon = (type: string) => {
    switch (type) {
      case "Bonafide":
        return Award
      case "Character":
        return Shield
      case "Transfer":
      case "Leaving":
        return FileText
      default:
        return FileText
    }
  }

  const getCertificateColor = (type: string) => {
    switch (type) {
      case "Bonafide":
        return "bg-green-500"
      case "Character":
        return "bg-blue-500"
      case "Transfer":
      case "Leaving":
        return "bg-amber-500"
      case "Caste":
        return "bg-purple-500"
      default:
        return "bg-gray-500"
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

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Certificates</h2>
          <p className="text-muted-foreground mt-1">View and download your official documents and report cards</p>
        </div>
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
                Submit a request for a certificate. Your request will be reviewed by the school administration.
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

      <Tabs defaultValue="report-cards" className="space-y-4">
        <TabsList>
          <TabsTrigger value="report-cards">
            <GraduationCap className="h-4 w-4 mr-2" />
            Report Cards
          </TabsTrigger>
          <TabsTrigger value="certificates">
            <Award className="h-4 w-4 mr-2" />
            Certificates
          </TabsTrigger>
          <TabsTrigger value="requests">
            <Clock className="h-4 w-4 mr-2" />
            My Requests
          </TabsTrigger>
        </TabsList>

        <TabsContent value="report-cards">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {reportCards.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8">
                  <p className="text-sm text-muted-foreground text-center">
                    No report cards available yet. Report cards will appear here after examinations.
                  </p>
                </CardContent>
              </Card>
            ) : (
              reportCards.map((rc) => (
                <Card key={rc.id} className="hover:shadow-md transition-shadow">
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between">
                      <div className="p-2 bg-blue-500 rounded-lg">
                        <GraduationCap className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant={rc.percentage >= 60 ? "default" : rc.percentage >= 33 ? "secondary" : "destructive"}>
                        {rc.grade}
                      </Badge>
                    </div>
                    <CardTitle className="mt-4">{rc.exam?.name || "Examination"}</CardTitle>
                    <CardDescription>
                      {rc.exam?.exam_type} - {rc.exam?.academic_year}
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-4">
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Percentage</span>
                        <span className="font-semibold">{rc.percentage}%</span>
                      </div>
                      <div className="flex justify-between text-sm">
                        <span className="text-muted-foreground">Marks</span>
                        <span className="font-semibold">{rc.marks_obtained}/{rc.total_marks}</span>
                      </div>
                      {rc.rank && (
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Class Rank</span>
                          <span className="font-semibold">#{rc.rank}</span>
                        </div>
                      )}
                    </div>
                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleViewReportCard(rc.exam_id)}
                      >
                        <Eye className="mr-2 h-4 w-4" /> View
                      </Button>
                      <Button
                        variant="outline"
                        className="flex-1"
                        onClick={() => handleViewReportCard(rc.exam_id)}
                      >
                        <Download className="mr-2 h-4 w-4" /> PDF
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))
            )}
          </div>
        </TabsContent>

        <TabsContent value="certificates">
          <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
            {certificates.length === 0 ? (
              <Card className="col-span-full">
                <CardContent className="py-8">
                  <div className="text-center">
                    <Award className="h-12 w-12 mx-auto text-muted-foreground/50 mb-4" />
                    <p className="text-sm text-muted-foreground">
                      No certificates issued yet. Use the &quot;Request Certificate&quot; button to request one.
                    </p>
                  </div>
                </CardContent>
              </Card>
            ) : (
              certificates.map((cert) => {
                const Icon = getCertificateIcon(cert.certificate_type)
                return (
                  <Card key={cert.id} className="hover:shadow-md transition-shadow">
                    <CardHeader className="pb-3">
                      <div className="flex items-start justify-between">
                        <div className={`p-2 ${getCertificateColor(cert.certificate_type)} rounded-lg`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <Badge variant="default">Issued</Badge>
                      </div>
                      <CardTitle className="mt-4">{cert.certificate_type} Certificate</CardTitle>
                      <CardDescription>#{cert.certificate_number}</CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2 mb-4">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Issue Date</span>
                          <span className="font-semibold">
                            {new Date(cert.issue_date).toLocaleDateString()}
                          </span>
                        </div>
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Verification</span>
                          <span className="font-mono text-xs">{cert.verification_code}</span>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleViewCertificate(cert)}
                        >
                          <Eye className="mr-2 h-4 w-4" /> View
                        </Button>
                        <Button
                          variant="outline"
                          className="flex-1"
                          onClick={() => handleViewCertificate(cert)}
                        >
                          <Download className="mr-2 h-4 w-4" /> PDF
                        </Button>
                      </div>
                    </CardContent>
                  </Card>
                )
              })
            )}
          </div>
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
            <DialogDescription>View and print your document</DialogDescription>
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
            {(previewType === "Leaving" || previewType === "Transfer") && previewData && (
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
