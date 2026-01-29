"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Download, FileText, Award, GraduationCap, Shield, Printer, Eye, Users, Building2 } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { getSchools, getClasses, getExams } from "@/lib/api/supabase-queries"
import { getReportCardData, getCertificateData, saveCertificate, getStudentsByClass } from "@/lib/api/certificate-service"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ReportCardTemplate, BonafideCertificateTemplate, CharacterCertificateTemplate, LeavingCertificateTemplate, CasteCertificateTemplate } from "@/components/certificates"
import type { ReportCardData, CertificateData } from "@/lib/api/certificate-service"
import { toast } from "sonner"
import { printDocument } from "@/lib/utils/print-styles"
import {
  getAllCertificateRequests,
  approveCertificateRequest,
  rejectCertificateRequest,
  markCertificateRequestAsGenerated,
  type CertificateRequest
} from "@/lib/api/certificate-request-service"
import { CheckCircle, XCircle, Clock, Loader2 } from "lucide-react"

export default function AdminCertificatesPage() {
  const [certificates, setCertificates] = useState<any[]>([])
  const [schools, setSchools] = useState<any[]>([])
  const [selectedSchool, setSelectedSchool] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [classes, setClasses] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [students, setStudents] = useState<any[]>([])

  // Generation state
  const [selectedClass, setSelectedClass] = useState<string>("")
  const [selectedExam, setSelectedExam] = useState<string>("")
  const [selectedStudent, setSelectedStudent] = useState<string>("")
  const [selectedCertType, setSelectedCertType] = useState<string>("")
  const [generating, setGenerating] = useState(false)

  // Preview state
  const [previewData, setPreviewData] = useState<ReportCardData | CertificateData | null>(null)
  const [previewType, setPreviewType] = useState<string>("")
  const [showPreview, setShowPreview] = useState(false)

  // Additional fields for certificates
  const [purpose, setPurpose] = useState("")
  const [conduct, setConduct] = useState("Excellent")
  const [caste, setCaste] = useState("")
  const [religion, setReligion] = useState("")
  const [leavingReason, setLeavingReason] = useState("")

  // Certificate requests state
  const [certificateRequests, setCertificateRequests] = useState<CertificateRequest[]>([])
  const [requestsLoading, setRequestsLoading] = useState(false)
  const [processingRequestId, setProcessingRequestId] = useState<string | null>(null)
  const [rejectDialogOpen, setRejectDialogOpen] = useState(false)
  const [rejectRemarks, setRejectRemarks] = useState("")
  const [selectedRequestForReject, setSelectedRequestForReject] = useState<CertificateRequest | null>(null)

  const printRef = useRef<HTMLDivElement>(null)
  const supabase = getSupabaseClient()

  // Load schools on mount
  useEffect(() => {
    async function fetchSchools() {
      try {
        const schoolsData = await getSchools()
        setSchools(schoolsData || [])
        if (schoolsData && schoolsData.length > 0) {
          setSelectedSchool(schoolsData[0].id)
        }
      } catch (error) {
        console.error("Error fetching schools:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchSchools()
  }, [])

  // Load data when school changes
  useEffect(() => {
    async function fetchSchoolData() {
      if (!selectedSchool) return
      setLoading(true)
      try {
        const [certsData, classesData, examsData] = await Promise.all([
          supabase
            .from("certificates")
            .select("*, students(first_name, last_name, admission_number, school_id)")
            .order("issue_date", { ascending: false }),
          getClasses(selectedSchool),
          getExams(selectedSchool)
        ])

        // Filter certificates by school
        const filteredCerts = (certsData.data || []).filter(
          (c: any) => c.students?.school_id === selectedSchool
        )
        setCertificates(filteredCerts)
        setClasses(classesData || [])
        setExams(examsData || [])

        // Reset selections
        setSelectedClass("")
        setSelectedStudent("")
        setSelectedExam("")
        setStudents([])

        // Fetch certificate requests
        const requests = await getAllCertificateRequests(selectedSchool)
        setCertificateRequests(requests)
      } catch (error) {
        console.error("Error fetching data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSchoolData()
  }, [selectedSchool])

  // Function to refresh certificate requests
  const refreshCertificateRequests = async () => {
    if (!selectedSchool) return
    setRequestsLoading(true)
    try {
      const requests = await getAllCertificateRequests(selectedSchool)
      setCertificateRequests(requests)
    } catch (error) {
      console.error("Error refreshing requests:", error)
    } finally {
      setRequestsLoading(false)
    }
  }

  // Fetch students when class changes
  useEffect(() => {
    async function fetchStudents() {
      if (!selectedClass) {
        setStudents([])
        return
      }
      try {
        const data = await getStudentsByClass(selectedClass)
        setStudents(data || [])
      } catch (error) {
        console.error("Error fetching students:", error)
      }
    }
    fetchStudents()
  }, [selectedClass])

  const handleGenerateReportCard = async () => {
    if (!selectedStudent || !selectedExam) return
    setGenerating(true)
    try {
      const data = await getReportCardData(selectedStudent, selectedExam)
      if (data) {
        setPreviewData(data)
        setPreviewType("report_card")
        setShowPreview(true)
      }
    } catch (error) {
      console.error("Error generating report card:", error)
    } finally {
      setGenerating(false)
    }
  }

  const handleGenerateCertificate = async (type: string) => {
    if (!selectedStudent) return
    setGenerating(true)
    try {
      const data = await getCertificateData(selectedStudent, type)
      if (data) {
        setPreviewData(data)
        setPreviewType(type)
        setShowPreview(true)
      }
    } catch (error) {
      console.error("Error generating certificate:", error)
    } finally {
      setGenerating(false)
    }
  }

  const handlePrint = async () => {
    if (printRef.current) {
      const title = previewType === "report_card" ? "Report Card" : `${previewType} Certificate`
      printDocument(printRef.current.innerHTML, title)
      toast.success("Document sent to print!")
    }
  }

  // Handle approve certificate request
  const handleApproveRequest = async (request: CertificateRequest) => {
    setProcessingRequestId(request.id)
    try {
      await approveCertificateRequest(request.id, "", "Approved by admin")
      toast.success("Certificate request approved!")
      await refreshCertificateRequests()
    } catch (error) {
      console.error("Error approving request:", error)
      toast.error("Failed to approve request")
    } finally {
      setProcessingRequestId(null)
    }
  }

  // Handle reject certificate request
  const handleRejectRequest = async () => {
    if (!selectedRequestForReject || !rejectRemarks.trim()) {
      toast.error("Please provide remarks for rejection")
      return
    }
    setProcessingRequestId(selectedRequestForReject.id)
    try {
      await rejectCertificateRequest(selectedRequestForReject.id, "", rejectRemarks)
      toast.success("Certificate request rejected")
      setRejectDialogOpen(false)
      setRejectRemarks("")
      setSelectedRequestForReject(null)
      await refreshCertificateRequests()
    } catch (error) {
      console.error("Error rejecting request:", error)
      toast.error("Failed to reject request")
    } finally {
      setProcessingRequestId(null)
    }
  }

  // Handle generate from approved request
  const handleGenerateFromRequest = async (request: CertificateRequest) => {
    if (!request.student) return
    setProcessingRequestId(request.id)
    try {
      setSelectedStudent(request.student.id)
      const certType = request.certificate_type
      const data = await getCertificateData(request.student.id, certType)
      if (data) {
        setPreviewData(data)
        setPreviewType(certType)
        setShowPreview(true)
        await markCertificateRequestAsGenerated(request.id)
        await refreshCertificateRequests()
      }
    } catch (error) {
      console.error("Error generating certificate:", error)
      toast.error("Failed to generate certificate")
    } finally {
      setProcessingRequestId(null)
    }
  }

  // Get status badge for requests
  const getStatusBadge = (status: string) => {
    switch (status) {
      case "Pending":
        return <Badge variant="outline" className="text-yellow-600 border-yellow-600"><Clock className="h-3 w-3 mr-1" /> Pending</Badge>
      case "Approved":
        return <Badge variant="outline" className="text-blue-600 border-blue-600"><CheckCircle className="h-3 w-3 mr-1" /> Approved</Badge>
      case "Rejected":
        return <Badge variant="outline" className="text-red-600 border-red-600"><XCircle className="h-3 w-3 mr-1" /> Rejected</Badge>
      case "Generated":
        return <Badge variant="outline" className="text-green-600 border-green-600"><CheckCircle className="h-3 w-3 mr-1" /> Generated</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  const handleSaveCertificate = async () => {
    if (!previewData || previewType === "report_card") return
    const certData = previewData as CertificateData
    try {
      await saveCertificate(
        certData.student.id,
        previewType,
        certData.certificate.number,
        certData.certificate.verification_code,
        ""
      )
      toast.success("Certificate saved!")

      // Refresh certificates list
      const { data } = await supabase
        .from("certificates")
        .select("*, students(first_name, last_name, admission_number, school_id)")
        .order("issue_date", { ascending: false })
      const filteredCerts = (data || []).filter(
        (c: any) => c.students?.school_id === selectedSchool
      )
      setCertificates(filteredCerts)
      setShowPreview(false)
    } catch (error) {
      console.error("Error saving certificate:", error)
    }
  }

  const certificateTypes = [
    { title: "Report Card", description: "Generate exam report cards", icon: GraduationCap, type: "report_card", color: "bg-blue-500" },
    { title: "Bonafide Certificate", description: "Proof of student enrollment", icon: Award, type: "Bonafide", color: "bg-green-500" },
    { title: "Character Certificate", description: "Certifying student conduct", icon: Shield, type: "Character", color: "bg-indigo-500" },
    { title: "Leaving/Transfer Certificate", description: "For students transferring", icon: FileText, type: "Leaving", color: "bg-amber-500" },
    { title: "Caste Certificate", description: "Caste/community certificate", icon: Users, type: "Caste", color: "bg-purple-500" }
  ]

  if (loading && schools.length === 0) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <Loader2 className="h-12 w-12 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Certificates & Report Cards</h2>
          <p className="text-muted-foreground mt-1">Generate and manage student certificates across schools</p>
        </div>
        <Select value={selectedSchool} onValueChange={setSelectedSchool}>
          <SelectTrigger className="w-[250px]">
            <Building2 className="h-4 w-4 mr-2" />
            <SelectValue placeholder="Select school" />
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

      {loading ? (
        <div className="flex items-center justify-center h-64">
          <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
      ) : (
        <Tabs defaultValue="generate" className="space-y-4">
          <TabsList>
            <TabsTrigger value="generate">Generate New</TabsTrigger>
            <TabsTrigger value="requests">
              Requests
              {certificateRequests.filter(r => r.status === "Pending").length > 0 && (
                <span className="ml-1">({certificateRequests.filter(r => r.status === "Pending").length})</span>
              )}
            </TabsTrigger>
            <TabsTrigger value="history">History</TabsTrigger>
          </TabsList>

          <TabsContent value="generate" className="space-y-6">
            {/* Selection Card */}
            <Card>
              <CardHeader>
                <CardTitle>Select Student</CardTitle>
                <CardDescription>Choose a class and student to generate certificates</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid gap-4 md:grid-cols-3">
                  <div className="space-y-2">
                    <Label>Select Class</Label>
                    <Select value={selectedClass} onValueChange={setSelectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose a class" />
                      </SelectTrigger>
                      <SelectContent>
                        {classes.map((cls) => (
                          <SelectItem key={cls.id} value={cls.id}>{cls.name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Student</Label>
                    <Select value={selectedStudent} onValueChange={setSelectedStudent} disabled={!selectedClass}>
                      <SelectTrigger>
                        <SelectValue placeholder={selectedClass ? "Choose a student" : "Select class first"} />
                      </SelectTrigger>
                      <SelectContent>
                        {students.map((student) => (
                          <SelectItem key={student.id} value={student.id}>
                            {student.first_name} {student.last_name} ({student.admission_number})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Select Exam (for Report Card)</Label>
                    <Select value={selectedExam} onValueChange={setSelectedExam}>
                      <SelectTrigger>
                        <SelectValue placeholder="Choose an exam" />
                      </SelectTrigger>
                      <SelectContent>
                        {exams.map((exam) => (
                          <SelectItem key={exam.id} value={exam.id}>
                            {exam.name} ({exam.exam_type})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Certificate Types Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {certificateTypes.map((cert) => {
                const Icon = cert.icon
                const isReportCard = cert.type === "report_card"
                const canGenerate = selectedStudent && (isReportCard ? selectedExam : true)

                return (
                  <Card key={cert.type} className="hover:shadow-md transition-shadow">
                    <CardHeader>
                      <div className="flex items-start gap-4">
                        <div className={`rounded-lg ${cert.color} p-3`}>
                          <Icon className="h-6 w-6 text-white" />
                        </div>
                        <div className="flex-1">
                          <CardTitle className="text-lg">{cert.title}</CardTitle>
                          <CardDescription className="mt-1 text-xs">{cert.description}</CardDescription>
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            className="w-full"
                            disabled={!canGenerate || generating}
                            onClick={() => {
                              if (isReportCard) handleGenerateReportCard()
                              else setSelectedCertType(cert.type)
                            }}
                          >
                            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <FileText className="h-4 w-4 mr-2" />}
                            Generate
                          </Button>
                        </DialogTrigger>
                        {!isReportCard && (
                          <DialogContent className="max-w-md">
                            <DialogHeader>
                              <DialogTitle>Generate {cert.title}</DialogTitle>
                              <DialogDescription>Fill in additional details</DialogDescription>
                            </DialogHeader>
                            <div className="space-y-4 py-4">
                              {cert.type === "Bonafide" && (
                                <div className="space-y-2">
                                  <Label>Purpose</Label>
                                  <Textarea value={purpose} onChange={(e) => setPurpose(e.target.value)} placeholder="e.g., for bank account opening" />
                                </div>
                              )}
                              {(cert.type === "Character" || cert.type === "Leaving") && (
                                <div className="space-y-2">
                                  <Label>Conduct Grade</Label>
                                  <Select value={conduct} onValueChange={setConduct}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                      <SelectItem value="Excellent">Excellent</SelectItem>
                                      <SelectItem value="Very Good">Very Good</SelectItem>
                                      <SelectItem value="Good">Good</SelectItem>
                                      <SelectItem value="Satisfactory">Satisfactory</SelectItem>
                                    </SelectContent>
                                  </Select>
                                </div>
                              )}
                              {cert.type === "Leaving" && (
                                <div className="space-y-2">
                                  <Label>Reason for Leaving</Label>
                                  <Input value={leavingReason} onChange={(e) => setLeavingReason(e.target.value)} placeholder="e.g., Parent's transfer" />
                                </div>
                              )}
                              {cert.type === "Caste" && (
                                <>
                                  <div className="space-y-2">
                                    <Label>Caste</Label>
                                    <Input value={caste} onChange={(e) => setCaste(e.target.value)} placeholder="Enter caste" />
                                  </div>
                                  <div className="space-y-2">
                                    <Label>Religion</Label>
                                    <Input value={religion} onChange={(e) => setReligion(e.target.value)} placeholder="Enter religion" />
                                  </div>
                                </>
                              )}
                              <Button className="w-full" onClick={() => handleGenerateCertificate(cert.type)} disabled={generating}>
                                {generating ? "Generating..." : "Generate Certificate"}
                              </Button>
                            </div>
                          </DialogContent>
                        )}
                      </Dialog>
                    </CardContent>
                  </Card>
                )
              })}
            </div>
          </TabsContent>

          <TabsContent value="requests" className="space-y-4">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Certificate Requests</CardTitle>
                    <CardDescription>Manage certificate requests from students and parents</CardDescription>
                  </div>
                  <Button variant="outline" size="sm" onClick={refreshCertificateRequests} disabled={requestsLoading}>
                    {requestsLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : "Refresh"}
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {certificateRequests.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No certificate requests</p>
                ) : (
                  <div className="space-y-3">
                    {certificateRequests.map((request) => (
                      <div key={request.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-secondary/30 transition-colors">
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <p className="font-medium text-sm">{request.student?.first_name} {request.student?.last_name}</p>
                            {getStatusBadge(request.status)}
                          </div>
                          <div className="flex items-center gap-2 mt-1 text-xs text-muted-foreground">
                            <span>Adm: {request.student?.admission_number}</span>
                            <span>|</span>
                            <span>Class: {request.student?.current_class?.name || "N/A"}</span>
                          </div>
                          <Badge variant="secondary" className="text-xs mt-2">{request.certificate_type}</Badge>
                        </div>
                        <div className="flex gap-2">
                          {request.status === "Pending" && (
                            <>
                              <Button variant="outline" size="sm" className="text-green-600 border-green-600" onClick={() => handleApproveRequest(request)} disabled={processingRequestId === request.id}>
                                {processingRequestId === request.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <><CheckCircle className="h-4 w-4 mr-1" /> Approve</>}
                              </Button>
                              <Button variant="outline" size="sm" className="text-red-600 border-red-600" onClick={() => { setSelectedRequestForReject(request); setRejectDialogOpen(true) }}>
                                <XCircle className="h-4 w-4 mr-1" /> Reject
                              </Button>
                            </>
                          )}
                          {request.status === "Approved" && (
                            <Button size="sm" onClick={() => handleGenerateFromRequest(request)} disabled={processingRequestId === request.id}>
                              {processingRequestId === request.id ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <FileText className="h-4 w-4 mr-1" />}
                              Generate
                            </Button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>

          <TabsContent value="history">
            <Card>
              <CardHeader>
                <CardTitle>Certificate History</CardTitle>
                <CardDescription>All certificates issued to students</CardDescription>
              </CardHeader>
              <CardContent>
                {certificates.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No certificates issued yet</p>
                ) : (
                  <div className="space-y-3">
                    {certificates.map((cert) => (
                      <div key={cert.id} className="flex items-center justify-between p-4 rounded-lg border hover:bg-secondary/30 transition-colors">
                        <div className="flex-1">
                          <p className="font-medium text-sm">{cert.students?.first_name} {cert.students?.last_name}</p>
                          <div className="flex items-center gap-2 mt-1">
                            <Badge variant="outline" className="text-xs">{cert.certificate_type}</Badge>
                            <span className="text-xs text-muted-foreground">#{cert.certificate_number}</span>
                            <span className="text-xs text-muted-foreground">| Issued: {new Date(cert.issue_date).toLocaleDateString()}</span>
                          </div>
                        </div>
                        <div className="flex gap-2">
                          <Button variant="ghost" size="sm"><Eye className="h-4 w-4 mr-1" /> View</Button>
                          <Button variant="ghost" size="sm"><Download className="h-4 w-4 mr-1" /> Download</Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </TabsContent>
        </Tabs>
      )}

      {/* Reject Dialog */}
      <Dialog open={rejectDialogOpen} onOpenChange={setRejectDialogOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Reject Certificate Request</DialogTitle>
            <DialogDescription>
              Provide a reason for rejecting this request for {selectedRequestForReject?.student?.first_name} {selectedRequestForReject?.student?.last_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label>Reason for Rejection</Label>
              <Textarea value={rejectRemarks} onChange={(e) => setRejectRemarks(e.target.value)} placeholder="Enter reason..." rows={3} />
            </div>
            <div className="flex justify-end gap-2">
              <Button variant="outline" onClick={() => { setRejectDialogOpen(false); setRejectRemarks(""); setSelectedRequestForReject(null) }}>Cancel</Button>
              <Button variant="destructive" onClick={handleRejectRequest} disabled={!rejectRemarks.trim() || processingRequestId !== null}>
                {processingRequestId ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <XCircle className="h-4 w-4 mr-2" />}
                Reject Request
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Preview Dialog */}
      <Dialog open={showPreview} onOpenChange={setShowPreview}>
        <DialogContent className="max-w-[95vw] md:max-w-[900px] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle>{previewType === "report_card" ? "Report Card Preview" : `${previewType} Certificate Preview`}</DialogTitle>
            <DialogDescription>Review before printing or saving</DialogDescription>
          </DialogHeader>

          <div ref={printRef} className="bg-white rounded-lg overflow-hidden">
            {previewType === "report_card" && previewData && <ReportCardTemplate data={previewData as ReportCardData} />}
            {previewType === "Bonafide" && previewData && <BonafideCertificateTemplate data={previewData as CertificateData} purpose={purpose} />}
            {previewType === "Character" && previewData && <CharacterCertificateTemplate data={previewData as CertificateData} conduct={conduct} />}
            {previewType === "Leaving" && previewData && <LeavingCertificateTemplate data={previewData as CertificateData} conduct={conduct} reason={leavingReason} />}
            {previewType === "Caste" && previewData && <CasteCertificateTemplate data={previewData as CertificateData} caste={caste} religion={religion} />}
          </div>

          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setShowPreview(false)}>Cancel</Button>
            {previewType !== "report_card" && (
              <Button variant="secondary" onClick={handleSaveCertificate}><FileText className="h-4 w-4 mr-2" /> Save to Records</Button>
            )}
            <Button onClick={handlePrint}><Printer className="h-4 w-4 mr-2" /> Print / Download PDF</Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
