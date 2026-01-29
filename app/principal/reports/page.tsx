"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Download, BarChart3, Users, GraduationCap, TrendingUp, TrendingDown, IndianRupee, Loader2, FileText, Printer } from "lucide-react"
import { useRole } from "@/contexts/role-context"
import { getStaffByUserId, getClasses, getExams, getSchoolById } from "@/lib/api/supabase-queries"
import {
  AttendanceReportPDF,
  ExamResultsReportPDF,
  FinancialReportPDF,
  StaffStudentsReportPDF,
} from "@/components/reports/report-pdf-templates"
import {
  getDailyAttendanceReport,
  getMonthlyAttendanceReport,
  getAttendanceDefaulters,
  getExamResultsSummary,
  getTopPerformers,
  getFeeCollectionSummary,
  getPendingFeeStudents,
  getStaffSummary,
  getStudentEnrollmentSummary,
  exportToCSV,
  type AttendanceReportData,
  type StudentAttendanceSummary,
  type ExamResultSummary,
  type StudentPerformance,
  type FeeCollectionSummary,
  type PendingFeeStudent,
  type StaffSummary,
  type StudentEnrollmentSummary,
} from "@/lib/api/reports-service"
import { toast } from "sonner"

export default function ReportsPage() {
  const { userId } = useRole()
  const [schoolId, setSchoolId] = useState<string>("")
  const [schoolName, setSchoolName] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [generating, setGenerating] = useState(false)

  // PDF Dialog states
  const [pdfDialogOpen, setPdfDialogOpen] = useState(false)
  const [activePdfType, setActivePdfType] = useState<"attendance" | "academic" | "financial" | "staff" | null>(null)
  const attendanceReportRef = useRef<HTMLDivElement>(null)
  const academicReportRef = useRef<HTMLDivElement>(null)
  const financialReportRef = useRef<HTMLDivElement>(null)
  const staffReportRef = useRef<HTMLDivElement>(null)

  // Data states
  const [classes, setClasses] = useState<any[]>([])
  const [exams, setExams] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [selectedExam, setSelectedExam] = useState<string>("")

  // Report data states
  const [dailyAttendance, setDailyAttendance] = useState<AttendanceReportData | null>(null)
  const [monthlyAttendance, setMonthlyAttendance] = useState<AttendanceReportData[]>([])
  const [attendanceDefaulters, setAttendanceDefaulters] = useState<StudentAttendanceSummary[]>([])
  const [examResults, setExamResults] = useState<ExamResultSummary | null>(null)
  const [topPerformers, setTopPerformers] = useState<StudentPerformance[]>([])
  const [feeCollection, setFeeCollection] = useState<FeeCollectionSummary | null>(null)
  const [pendingFees, setPendingFees] = useState<PendingFeeStudent[]>([])
  const [staffSummary, setStaffSummary] = useState<StaffSummary | null>(null)
  const [studentEnrollment, setStudentEnrollment] = useState<StudentEnrollmentSummary | null>(null)

  useEffect(() => {
    async function fetchInitialData() {
      if (!userId) return
      setLoading(true)
      try {
        const staff = await getStaffByUserId(userId)
        if (staff?.school_id) {
          setSchoolId(staff.school_id)
          const [classesData, examsData, schoolData] = await Promise.all([
            getClasses(staff.school_id),
            getExams(staff.school_id),
            getSchoolById(staff.school_id),
          ])
          setClasses(classesData || [])
          setExams(examsData || [])
          setSchoolName(schoolData?.name || "School")

          // Load initial reports
          await loadReports(staff.school_id)
        }
      } catch (error) {
        console.error("Error loading data:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchInitialData()
  }, [userId])

  const loadReports = async (schoolIdParam?: string) => {
    const sid = schoolIdParam || schoolId
    if (!sid) return

    setGenerating(true)
    try {
      const today = new Date().toISOString().split("T")[0]
      const now = new Date()
      const currentYear = now.getFullYear()
      const currentMonth = now.getMonth() + 1
      // Academic year starts in April (month 4), so Jan-Mar is part of the previous academic year
      const academicYearStart = currentMonth >= 4 ? currentYear : currentYear - 1
      const academicYear = `${academicYearStart}-${academicYearStart + 1}`

      const [
        daily,
        monthly,
        defaulters,
        fees,
        pending,
        staff,
        enrollment,
      ] = await Promise.all([
        getDailyAttendanceReport(sid, today, selectedClass !== "all" ? selectedClass : undefined),
        getMonthlyAttendanceReport(sid, currentYear, currentMonth, selectedClass !== "all" ? selectedClass : undefined),
        getAttendanceDefaulters(sid, 75),
        getFeeCollectionSummary(sid), // No academic year filter to get all fees
        getPendingFeeStudents(sid), // No academic year filter to get all pending
        getStaffSummary(sid),
        getStudentEnrollmentSummary(sid),
      ])

      setDailyAttendance(daily)
      setMonthlyAttendance(monthly)
      setAttendanceDefaulters(defaulters)
      setFeeCollection(fees)
      setPendingFees(pending)
      setStaffSummary(staff)
      setStudentEnrollment(enrollment)

      // Load exam results if exam is selected
      if (selectedExam) {
        const [results, performers] = await Promise.all([
          getExamResultsSummary(sid, selectedExam),
          getTopPerformers(sid, selectedExam, 10),
        ])
        setExamResults(results)
        setTopPerformers(performers)
      }
    } catch (error) {
      console.error("Error loading reports:", error)
      toast.error("Failed to load some reports")
    } finally {
      setGenerating(false)
    }
  }

  const handleExamChange = async (examId: string) => {
    setSelectedExam(examId)
    if (examId && schoolId) {
      setGenerating(true)
      try {
        const [results, performers] = await Promise.all([
          getExamResultsSummary(schoolId, examId),
          getTopPerformers(schoolId, examId, 10),
        ])
        setExamResults(results)
        setTopPerformers(performers)
      } catch (error) {
        console.error("Error loading exam results:", error)
      } finally {
        setGenerating(false)
      }
    }
  }

  const downloadReport = (data: any[], filename: string) => {
    const csv = exportToCSV(data, filename)
    const blob = new Blob([csv], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${filename}.csv`
    a.click()
    URL.revokeObjectURL(url)
    toast.success(`${filename} downloaded successfully`)
  }

  const openPdfDialog = (type: "attendance" | "academic" | "financial" | "staff") => {
    setActivePdfType(type)
    setPdfDialogOpen(true)
  }

  const handlePrint = () => {
    const printContent = activePdfType === "attendance" ? attendanceReportRef.current :
                         activePdfType === "academic" ? academicReportRef.current :
                         activePdfType === "financial" ? financialReportRef.current :
                         staffReportRef.current

    if (!printContent) return

    const printWindow = window.open("", "_blank")
    if (!printWindow) {
      toast.error("Please allow popups to print the report")
      return
    }

    const reportTitle = activePdfType === "attendance" ? "Attendance Report" :
                        activePdfType === "academic" ? "Academic Report" :
                        activePdfType === "financial" ? "Financial Report" :
                        "Staff & Students Report"

    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
        <head>
          <title>${schoolName} - ${reportTitle}</title>
          <style>
            * { box-sizing: border-box; margin: 0; padding: 0; }
            body { font-family: Arial, sans-serif; }
            .text-center { text-align: center; }
            .text-right { text-align: right; }
            .text-left { text-align: left; }
            .font-bold { font-weight: bold; }
            .font-semibold { font-weight: 600; }
            .font-medium { font-weight: 500; }
            .text-2xl { font-size: 1.5rem; }
            .text-xl { font-size: 1.25rem; }
            .text-lg { font-size: 1.125rem; }
            .text-sm { font-size: 0.875rem; }
            .text-xs { font-size: 0.75rem; }
            .mb-2 { margin-bottom: 0.5rem; }
            .mb-3 { margin-bottom: 0.75rem; }
            .mb-4 { margin-bottom: 1rem; }
            .mb-6 { margin-bottom: 1.5rem; }
            .mt-1 { margin-top: 0.25rem; }
            .mt-2 { margin-top: 0.5rem; }
            .mt-3 { margin-top: 0.75rem; }
            .mt-4 { margin-top: 1rem; }
            .mt-8 { margin-top: 2rem; }
            .p-2 { padding: 0.5rem; }
            .p-3 { padding: 0.75rem; }
            .p-4 { padding: 1rem; }
            .p-8 { padding: 2rem; }
            .pt-4 { padding-top: 1rem; }
            .pb-4 { padding-bottom: 1rem; }
            .px-2 { padding-left: 0.5rem; padding-right: 0.5rem; }
            .py-1 { padding-top: 0.25rem; padding-bottom: 0.25rem; }
            .border { border: 1px solid #e5e7eb; }
            .border-b { border-bottom: 1px solid #e5e7eb; }
            .border-t { border-top: 1px solid #e5e7eb; }
            .border-b-2 { border-bottom: 2px solid #1f2937; }
            .rounded { border-radius: 0.25rem; }
            .rounded-lg { border-radius: 0.5rem; }
            .border-collapse { border-collapse: collapse; }
            .w-full { width: 100%; }
            .grid { display: grid; }
            .grid-cols-2 { grid-template-columns: repeat(2, 1fr); }
            .grid-cols-3 { grid-template-columns: repeat(3, 1fr); }
            .grid-cols-4 { grid-template-columns: repeat(4, 1fr); }
            .gap-4 { gap: 1rem; }
            .bg-white { background-color: white; }
            .bg-gray-50 { background-color: #f9fafb; }
            .bg-gray-100 { background-color: #f3f4f6; }
            .bg-gray-200 { background-color: #e5e7eb; }
            .bg-green-50 { background-color: #f0fdf4; }
            .bg-green-100 { background-color: #dcfce7; }
            .bg-green-500 { background-color: #22c55e; }
            .bg-red-50 { background-color: #fef2f2; }
            .bg-red-100 { background-color: #fee2e2; }
            .bg-red-500 { background-color: #ef4444; }
            .bg-blue-50 { background-color: #eff6ff; }
            .bg-blue-100 { background-color: #dbeafe; }
            .bg-blue-500 { background-color: #3b82f6; }
            .bg-yellow-50 { background-color: #fefce8; }
            .bg-yellow-500 { background-color: #eab308; }
            .bg-pink-50 { background-color: #fdf2f8; }
            .bg-purple-50 { background-color: #faf5ff; }
            .bg-orange-50 { background-color: #fff7ed; }
            .text-gray-500 { color: #6b7280; }
            .text-gray-600 { color: #4b5563; }
            .text-gray-800 { color: #1f2937; }
            .text-green-600 { color: #16a34a; }
            .text-green-800 { color: #166534; }
            .text-red-500 { color: #ef4444; }
            .text-red-600 { color: #dc2626; }
            .text-red-800 { color: #991b1b; }
            .text-blue-600 { color: #2563eb; }
            .text-blue-800 { color: #1e40af; }
            .text-yellow-600 { color: #ca8a04; }
            .text-yellow-700 { color: #a16207; }
            .text-pink-600 { color: #db2777; }
            .text-purple-600 { color: #9333ea; }
            .text-orange-600 { color: #ea580c; }
            .text-orange-700 { color: #c2410c; }
            .text-white { color: white; }
            .uppercase { text-transform: uppercase; }
            .tracking-wide { letter-spacing: 0.025em; }
            table { border-collapse: collapse; width: 100%; }
            th, td { border: 1px solid #e5e7eb; padding: 0.5rem; }
            th { background-color: #e5e7eb; }
            @media print {
              body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
              .page-break { page-break-after: always; }
            }
          </style>
        </head>
        <body>
          ${printContent.innerHTML}
        </body>
      </html>
    `)
    printWindow.document.close()
    printWindow.focus()
    setTimeout(() => {
      printWindow.print()
      printWindow.close()
    }, 250)
    toast.success("Report generated successfully")
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Reports</h2>
          <p className="text-muted-foreground mt-1">Generate and download school reports from database</p>
        </div>
        <div className="flex items-center gap-2">
          <Select value={selectedClass} onValueChange={setSelectedClass}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter by class" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Classes</SelectItem>
              {classes.map((cls) => (
                <SelectItem key={cls.id} value={cls.id}>
                  {cls.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button onClick={() => loadReports()} disabled={generating}>
            {generating ? <Loader2 className="h-4 w-4 mr-2 animate-spin" /> : <BarChart3 className="h-4 w-4 mr-2" />}
            Refresh Reports
          </Button>
        </div>
      </div>

      <Tabs defaultValue="attendance" className="space-y-4">
        <TabsList className="grid grid-cols-4 w-full max-w-2xl">
          <TabsTrigger value="attendance">Attendance</TabsTrigger>
          <TabsTrigger value="academic">Academic</TabsTrigger>
          <TabsTrigger value="financial">Financial</TabsTrigger>
          <TabsTrigger value="staff">Staff & Students</TabsTrigger>
        </TabsList>

        {/* ATTENDANCE REPORTS */}
        <TabsContent value="attendance" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => openPdfDialog("attendance")}>
              <FileText className="h-4 w-4 mr-2" />
              Generate PDF Report
            </Button>
          </div>
          {/* Daily Summary */}
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Today&apos;s Attendance</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{dailyAttendance?.attendancePercentage || 0}%</div>
                <p className="text-xs text-muted-foreground">
                  {dailyAttendance?.present || 0} present of {dailyAttendance?.totalStudents || 0}
                </p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Present</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">{dailyAttendance?.present || 0}</div>
                <p className="text-xs text-muted-foreground">Students present today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Absent</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">{dailyAttendance?.absent || 0}</div>
                <p className="text-xs text-muted-foreground">Students absent today</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Late</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-yellow-600">{dailyAttendance?.late || 0}</div>
                <p className="text-xs text-muted-foreground">Students late today</p>
              </CardContent>
            </Card>
          </div>

          {/* Monthly Trend & Defaulters */}
          <div className="grid gap-4 md:grid-cols-2">
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>Monthly Attendance Trend</CardTitle>
                    <CardDescription>Day-wise attendance for this month</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadReport(monthlyAttendance, "monthly-attendance")}
                    disabled={monthlyAttendance.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {monthlyAttendance.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No attendance data for this month</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {monthlyAttendance.slice(-10).map((day) => (
                      <div key={day.date} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <span className="text-sm">{new Date(day.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}</span>
                        <div className="flex items-center gap-2">
                          <Badge variant={day.attendancePercentage >= 75 ? "default" : "destructive"}>
                            {day.attendancePercentage}%
                          </Badge>
                          <span className="text-xs text-muted-foreground">{day.present}/{day.totalStudents}</span>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <TrendingDown className="h-5 w-5 text-red-500" />
                      Attendance Defaulters
                    </CardTitle>
                    <CardDescription>Students below 75% attendance</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadReport(attendanceDefaulters, "attendance-defaulters")}
                    disabled={attendanceDefaulters.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {attendanceDefaulters.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No defaulters found</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {attendanceDefaulters.slice(0, 10).map((student) => (
                      <div key={student.studentId} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{student.studentName}</p>
                          <p className="text-xs text-muted-foreground">{student.className} | {student.admissionNumber}</p>
                        </div>
                        <Badge variant="destructive">{student.percentage}%</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* ACADEMIC REPORTS */}
        <TabsContent value="academic" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => openPdfDialog("academic")} disabled={!selectedExam}>
              <FileText className="h-4 w-4 mr-2" />
              Generate PDF Report
            </Button>
          </div>
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle>Exam Results Analysis</CardTitle>
                  <CardDescription>Select an exam to view results</CardDescription>
                </div>
                <Select value={selectedExam} onValueChange={handleExamChange}>
                  <SelectTrigger className="w-[200px]">
                    <SelectValue placeholder="Select exam" />
                  </SelectTrigger>
                  <SelectContent>
                    {exams.map((exam) => (
                      <SelectItem key={exam.id} value={exam.id}>
                        {exam.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </CardHeader>
            <CardContent>
              {!selectedExam ? (
                <p className="text-sm text-muted-foreground text-center py-8">Select an exam to view results</p>
              ) : examResults ? (
                <div className="grid gap-4 md:grid-cols-4">
                  <div className="p-4 rounded-lg bg-muted/50 text-center">
                    <div className="text-2xl font-bold">{examResults.totalStudents}</div>
                    <p className="text-xs text-muted-foreground">Total Students</p>
                  </div>
                  <div className="p-4 rounded-lg bg-green-50 text-center">
                    <div className="text-2xl font-bold text-green-600">{examResults.passed}</div>
                    <p className="text-xs text-muted-foreground">Passed ({examResults.passPercentage}%)</p>
                  </div>
                  <div className="p-4 rounded-lg bg-red-50 text-center">
                    <div className="text-2xl font-bold text-red-600">{examResults.failed}</div>
                    <p className="text-xs text-muted-foreground">Failed</p>
                  </div>
                  <div className="p-4 rounded-lg bg-blue-50 text-center">
                    <div className="text-2xl font-bold text-blue-600">{examResults.averageMarks}%</div>
                    <p className="text-xs text-muted-foreground">Class Average</p>
                  </div>
                </div>
              ) : (
                <p className="text-sm text-muted-foreground text-center py-8">No results found for this exam</p>
              )}
            </CardContent>
          </Card>

          {/* Top Performers */}
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="flex items-center gap-2">
                    <TrendingUp className="h-5 w-5 text-green-500" />
                    Top Performers
                  </CardTitle>
                  <CardDescription>Highest scoring students</CardDescription>
                </div>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => downloadReport(topPerformers, "top-performers")}
                  disabled={topPerformers.length === 0}
                >
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              </div>
            </CardHeader>
            <CardContent>
              {topPerformers.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">Select an exam to view top performers</p>
              ) : (
                <div className="space-y-2">
                  {topPerformers.map((student, index) => (
                    <div key={student.studentId} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-full flex items-center justify-center text-sm font-bold ${
                          index === 0 ? "bg-yellow-100 text-yellow-700" :
                          index === 1 ? "bg-gray-100 text-gray-700" :
                          index === 2 ? "bg-orange-100 text-orange-700" :
                          "bg-muted text-muted-foreground"
                        }`}>
                          {student.rank}
                        </div>
                        <div>
                          <p className="font-medium">{student.studentName}</p>
                          <p className="text-xs text-muted-foreground">{student.className} | {student.admissionNumber}</p>
                        </div>
                      </div>
                      <div className="text-right">
                        <Badge variant="default">{student.percentage}%</Badge>
                        <p className="text-xs text-muted-foreground mt-1">Grade: {student.grade}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {/* FINANCIAL REPORTS */}
        <TabsContent value="financial" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => openPdfDialog("financial")}>
              <FileText className="h-4 w-4 mr-2" />
              Generate PDF Report
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-4">
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Total Expected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{(feeCollection?.totalExpected || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">For current year</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Collected</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{(feeCollection?.totalCollected || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">{feeCollection?.collectionPercentage || 0}% collected</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Pending</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-red-600">₹{(feeCollection?.totalPending || 0).toLocaleString()}</div>
                <p className="text-xs text-muted-foreground">Yet to be collected</p>
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium">Defaulters</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">{pendingFees.length}</div>
                <p className="text-xs text-muted-foreground">Students with pending fees</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            {/* Fee by Type */}
            <Card>
              <CardHeader>
                <CardTitle>Collection by Fee Type</CardTitle>
                <CardDescription>Breakdown of fee collection</CardDescription>
              </CardHeader>
              <CardContent>
                {feeCollection?.byFeeType && feeCollection.byFeeType.length > 0 ? (
                  <div className="space-y-3">
                    {feeCollection.byFeeType.map((item) => (
                      <div key={item.feeType} className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span>{item.feeType}</span>
                          <span>₹{item.collected.toLocaleString()} / ₹{item.expected.toLocaleString()}</span>
                        </div>
                        <div className="h-2 bg-muted rounded-full overflow-hidden">
                          <div
                            className="h-full bg-primary rounded-full"
                            style={{ width: `${item.expected > 0 ? (item.collected / item.expected) * 100 : 0}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-8">No fee data available</p>
                )}
              </CardContent>
            </Card>

            {/* Pending Fees */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle className="flex items-center gap-2">
                      <IndianRupee className="h-5 w-5 text-red-500" />
                      Pending Fee Students
                    </CardTitle>
                    <CardDescription>Students with overdue payments</CardDescription>
                  </div>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => downloadReport(pendingFees, "pending-fees")}
                    disabled={pendingFees.length === 0}
                  >
                    <Download className="h-4 w-4 mr-2" />
                    Export
                  </Button>
                </div>
              </CardHeader>
              <CardContent>
                {pendingFees.length === 0 ? (
                  <p className="text-sm text-muted-foreground text-center py-8">No pending fees</p>
                ) : (
                  <div className="space-y-2 max-h-[300px] overflow-y-auto">
                    {pendingFees.slice(0, 10).map((student) => (
                      <div key={`${student.studentId}-${student.feeType}`} className="flex items-center justify-between p-2 rounded-lg bg-muted/50">
                        <div>
                          <p className="text-sm font-medium">{student.studentName}</p>
                          <p className="text-xs text-muted-foreground">{student.className} | {student.feeType}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-sm font-medium text-red-600">₹{student.pendingAmount.toLocaleString()}</p>
                          {student.daysOverdue > 0 && (
                            <p className="text-xs text-red-500">{student.daysOverdue} days overdue</p>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        {/* STAFF & STUDENTS REPORTS */}
        <TabsContent value="staff" className="space-y-4">
          <div className="flex justify-end">
            <Button variant="outline" onClick={() => openPdfDialog("staff")}>
              <FileText className="h-4 w-4 mr-2" />
              Generate PDF Report
            </Button>
          </div>
          <div className="grid gap-4 md:grid-cols-2">
            {/* Staff Summary */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Users className="h-5 w-5" />
                  Staff Summary
                </CardTitle>
                <CardDescription>Overview of school staff</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-3 gap-4 mb-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{staffSummary?.totalStaff || 0}</div>
                    <p className="text-xs text-muted-foreground">Total Staff</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{staffSummary?.teachers || 0}</div>
                    <p className="text-xs text-muted-foreground">Teachers</p>
                  </div>
                  <div className="text-center p-3 bg-purple-50 rounded-lg">
                    <div className="text-2xl font-bold text-purple-600">{staffSummary?.adminStaff || 0}</div>
                    <p className="text-xs text-muted-foreground">Admin Staff</p>
                  </div>
                </div>
                {staffSummary?.byDepartment && staffSummary.byDepartment.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">By Department</p>
                    {staffSummary.byDepartment.slice(0, 5).map((item) => (
                      <div key={item.department} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                        <span>{item.department}</span>
                        <Badge variant="outline">{item.count}</Badge>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Student Enrollment */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <GraduationCap className="h-5 w-5" />
                  Student Enrollment
                </CardTitle>
                <CardDescription>Overview of student population</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-4 gap-4 mb-4">
                  <div className="text-center p-3 bg-muted/50 rounded-lg">
                    <div className="text-2xl font-bold">{studentEnrollment?.totalStudents || 0}</div>
                    <p className="text-xs text-muted-foreground">Total</p>
                  </div>
                  <div className="text-center p-3 bg-blue-50 rounded-lg">
                    <div className="text-2xl font-bold text-blue-600">{studentEnrollment?.male || 0}</div>
                    <p className="text-xs text-muted-foreground">Male</p>
                  </div>
                  <div className="text-center p-3 bg-pink-50 rounded-lg">
                    <div className="text-2xl font-bold text-pink-600">{studentEnrollment?.female || 0}</div>
                    <p className="text-xs text-muted-foreground">Female</p>
                  </div>
                  <div className="text-center p-3 bg-gray-50 rounded-lg">
                    <div className="text-2xl font-bold text-gray-600">{studentEnrollment?.other || 0}</div>
                    <p className="text-xs text-muted-foreground">Other</p>
                  </div>
                </div>
                {studentEnrollment?.byClass && studentEnrollment.byClass.length > 0 && (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">By Class</p>
                    <div className="max-h-[200px] overflow-y-auto space-y-1">
                      {studentEnrollment.byClass.map((item) => (
                        <div key={item.className} className="flex justify-between text-sm p-2 bg-muted/30 rounded">
                          <span>{item.className}</span>
                          <Badge variant="outline">{item.count} students</Badge>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* PDF Preview Dialog - Horizontal like certificates */}
      <Dialog open={pdfDialogOpen} onOpenChange={setPdfDialogOpen}>
        <DialogContent className="max-w-[95vw] md:max-w-[900px] max-h-[90vh] overflow-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span>
                {activePdfType === "attendance" && "Attendance Report Preview"}
                {activePdfType === "academic" && "Academic Report Preview"}
                {activePdfType === "financial" && "Financial Report Preview"}
                {activePdfType === "staff" && "Staff & Students Report Preview"}
              </span>
              <Button onClick={() => handlePrint()} className="no-print">
                <Printer className="h-4 w-4 mr-2" />
                Print / Save PDF
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="border rounded-lg overflow-hidden">
            {activePdfType === "attendance" && (
              <AttendanceReportPDF
                ref={attendanceReportRef}
                schoolName={schoolName}
                dailyData={dailyAttendance || undefined}
                monthlyData={monthlyAttendance}
                defaulters={attendanceDefaulters}
                month={new Date().toLocaleDateString("en-US", { month: "long" })}
                year={new Date().getFullYear()}
              />
            )}
            {activePdfType === "academic" && (
              <ExamResultsReportPDF
                ref={academicReportRef}
                schoolName={schoolName}
                examSummary={examResults || undefined}
                topPerformers={topPerformers}
                examName={exams.find(e => e.id === selectedExam)?.name}
              />
            )}
            {activePdfType === "financial" && (
              <FinancialReportPDF
                ref={financialReportRef}
                schoolName={schoolName}
                feeCollection={feeCollection || undefined}
                pendingFees={pendingFees}
                academicYear={`${new Date().getFullYear()}-${new Date().getFullYear() + 1}`}
              />
            )}
            {activePdfType === "staff" && (
              <StaffStudentsReportPDF
                ref={staffReportRef}
                schoolName={schoolName}
                staffSummary={staffSummary || undefined}
                studentEnrollment={studentEnrollment || undefined}
              />
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
