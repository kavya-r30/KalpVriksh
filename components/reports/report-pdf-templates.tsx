"use client"

import { forwardRef } from "react"
import type {
  AttendanceReportData,
  StudentAttendanceSummary,
  ExamResultSummary,
  StudentPerformance,
  FeeCollectionSummary,
  PendingFeeStudent,
  StaffSummary,
  StudentEnrollmentSummary,
} from "@/lib/api/reports-service"

// Shared styles for PDF printing
const pdfStyles = `
  @media print {
    body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
    .no-print { display: none !important; }
    .page-break { page-break-after: always; }
  }
`

interface ReportHeaderProps {
  schoolName: string
  reportTitle: string
  subtitle?: string
  date?: string
}

export function ReportHeader({ schoolName, reportTitle, subtitle, date }: ReportHeaderProps) {
  return (
    <div className="text-center mb-6 border-b-2 border-gray-800 pb-4">
      <h1 className="text-2xl font-bold uppercase tracking-wide">{schoolName}</h1>
      <h2 className="text-xl font-semibold mt-2">{reportTitle}</h2>
      {subtitle && <p className="text-gray-600 mt-1">{subtitle}</p>}
      {date && <p className="text-sm text-gray-500 mt-2">Generated on: {date}</p>}
    </div>
  )
}

interface ReportFooterProps {
  pageNumber?: number
  totalPages?: number
}

export function ReportFooter({ pageNumber, totalPages }: ReportFooterProps) {
  return (
    <div className="mt-8 pt-4 border-t border-gray-300 text-center text-sm text-gray-500">
      <p>This is a computer-generated report and does not require a signature.</p>
      {pageNumber && totalPages && (
        <p className="mt-1">Page {pageNumber} of {totalPages}</p>
      )}
    </div>
  )
}

// =============================================
// ATTENDANCE REPORT PDF
// =============================================

interface AttendanceReportPDFProps {
  schoolName: string
  dailyData?: AttendanceReportData
  monthlyData?: AttendanceReportData[]
  defaulters?: StudentAttendanceSummary[]
  month?: string
  year?: number
}

export const AttendanceReportPDF = forwardRef<HTMLDivElement, AttendanceReportPDFProps>(
  ({ schoolName, dailyData, monthlyData, defaulters, month, year }, ref) => {
    const today = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    return (
      <div ref={ref} className="p-8 bg-white text-black min-h-[297mm] w-[210mm] mx-auto">
        <style>{pdfStyles}</style>

        <ReportHeader
          schoolName={schoolName}
          reportTitle="Attendance Report"
          subtitle={month && year ? `${month} ${year}` : undefined}
          date={today}
        />

        {/* Daily Summary */}
        {dailyData && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 bg-gray-100 p-2">Daily Attendance Summary</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 border rounded">
                <div className="text-2xl font-bold">{dailyData.totalStudents}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
              <div className="p-3 border rounded bg-green-50">
                <div className="text-2xl font-bold text-green-600">{dailyData.present}</div>
                <div className="text-sm text-gray-600">Present</div>
              </div>
              <div className="p-3 border rounded bg-red-50">
                <div className="text-2xl font-bold text-red-600">{dailyData.absent}</div>
                <div className="text-sm text-gray-600">Absent</div>
              </div>
              <div className="p-3 border rounded bg-yellow-50">
                <div className="text-2xl font-bold text-yellow-600">{dailyData.late}</div>
                <div className="text-sm text-gray-600">Late</div>
              </div>
            </div>
            <div className="mt-3 text-center">
              <span className="text-lg font-semibold">Attendance Rate: {dailyData.attendancePercentage}%</span>
            </div>
          </div>
        )}

        {/* Monthly Trend */}
        {monthlyData && monthlyData.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 bg-gray-100 p-2">Monthly Attendance Trend</h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2 text-left">Date</th>
                  <th className="border p-2 text-center">Total</th>
                  <th className="border p-2 text-center">Present</th>
                  <th className="border p-2 text-center">Absent</th>
                  <th className="border p-2 text-center">Late</th>
                  <th className="border p-2 text-center">Rate</th>
                </tr>
              </thead>
              <tbody>
                {monthlyData.map((day) => (
                  <tr key={day.date} className="hover:bg-gray-50">
                    <td className="border p-2">
                      {new Date(day.date).toLocaleDateString("en-IN", { weekday: "short", day: "numeric", month: "short" })}
                    </td>
                    <td className="border p-2 text-center">{day.totalStudents}</td>
                    <td className="border p-2 text-center text-green-600">{day.present}</td>
                    <td className="border p-2 text-center text-red-600">{day.absent}</td>
                    <td className="border p-2 text-center text-yellow-600">{day.late}</td>
                    <td className="border p-2 text-center font-semibold">{day.attendancePercentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Defaulters List */}
        {defaulters && defaulters.length > 0 && (
          <div className="mb-6 page-break">
            <h3 className="text-lg font-semibold mb-3 bg-red-100 p-2 text-red-800">
              Attendance Defaulters (Below 75%)
            </h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2 text-left">S.No</th>
                  <th className="border p-2 text-left">Student Name</th>
                  <th className="border p-2 text-left">Adm. No.</th>
                  <th className="border p-2 text-left">Class</th>
                  <th className="border p-2 text-center">Present</th>
                  <th className="border p-2 text-center">Absent</th>
                  <th className="border p-2 text-center">Attendance %</th>
                </tr>
              </thead>
              <tbody>
                {defaulters.map((student, index) => (
                  <tr key={student.studentId} className="hover:bg-gray-50">
                    <td className="border p-2">{index + 1}</td>
                    <td className="border p-2 font-medium">{student.studentName}</td>
                    <td className="border p-2">{student.admissionNumber}</td>
                    <td className="border p-2">{student.className}</td>
                    <td className="border p-2 text-center text-green-600">{student.presentDays}</td>
                    <td className="border p-2 text-center text-red-600">{student.absentDays}</td>
                    <td className="border p-2 text-center font-bold text-red-600">{student.percentage}%</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ReportFooter />
      </div>
    )
  }
)
AttendanceReportPDF.displayName = "AttendanceReportPDF"

// =============================================
// EXAM RESULTS REPORT PDF
// =============================================

interface ExamResultsReportPDFProps {
  schoolName: string
  examSummary?: ExamResultSummary
  topPerformers?: StudentPerformance[]
  examName?: string
}

export const ExamResultsReportPDF = forwardRef<HTMLDivElement, ExamResultsReportPDFProps>(
  ({ schoolName, examSummary, topPerformers, examName }, ref) => {
    const today = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    return (
      <div ref={ref} className="p-8 bg-white text-black min-h-[297mm] w-[210mm] mx-auto">
        <style>{pdfStyles}</style>

        <ReportHeader
          schoolName={schoolName}
          reportTitle="Examination Results Report"
          subtitle={examName || examSummary?.examName}
          date={today}
        />

        {/* Exam Summary */}
        {examSummary && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 bg-gray-100 p-2">Results Summary</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 border rounded">
                <div className="text-2xl font-bold">{examSummary.totalStudents}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
              <div className="p-3 border rounded bg-green-50">
                <div className="text-2xl font-bold text-green-600">{examSummary.passed}</div>
                <div className="text-sm text-gray-600">Passed ({examSummary.passPercentage}%)</div>
              </div>
              <div className="p-3 border rounded bg-red-50">
                <div className="text-2xl font-bold text-red-600">{examSummary.failed}</div>
                <div className="text-sm text-gray-600">Failed</div>
              </div>
              <div className="p-3 border rounded bg-blue-50">
                <div className="text-2xl font-bold text-blue-600">{examSummary.averageMarks}%</div>
                <div className="text-sm text-gray-600">Class Average</div>
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-4 text-center">
              <div className="p-3 border rounded">
                <span className="text-gray-600">Highest Marks: </span>
                <span className="font-bold text-green-600">{examSummary.highestMarks}%</span>
              </div>
              <div className="p-3 border rounded">
                <span className="text-gray-600">Lowest Marks: </span>
                <span className="font-bold text-red-600">{examSummary.lowestMarks}%</span>
              </div>
            </div>
          </div>
        )}

        {/* Top Performers */}
        {topPerformers && topPerformers.length > 0 && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 bg-green-100 p-2 text-green-800">
              Top Performers
            </h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2 text-center">Rank</th>
                  <th className="border p-2 text-left">Student Name</th>
                  <th className="border p-2 text-left">Adm. No.</th>
                  <th className="border p-2 text-left">Class</th>
                  <th className="border p-2 text-center">Marks</th>
                  <th className="border p-2 text-center">Percentage</th>
                  <th className="border p-2 text-center">Grade</th>
                </tr>
              </thead>
              <tbody>
                {topPerformers.map((student) => (
                  <tr key={student.studentId} className={student.rank <= 3 ? "bg-yellow-50" : "hover:bg-gray-50"}>
                    <td className="border p-2 text-center font-bold">
                      {student.rank <= 3 ? (
                        <span className={
                          student.rank === 1 ? "text-yellow-600" :
                          student.rank === 2 ? "text-gray-500" :
                          "text-orange-600"
                        }>
                          {student.rank === 1 ? "🥇" : student.rank === 2 ? "🥈" : "🥉"} {student.rank}
                        </span>
                      ) : student.rank}
                    </td>
                    <td className="border p-2 font-medium">{student.studentName}</td>
                    <td className="border p-2">{student.admissionNumber}</td>
                    <td className="border p-2">{student.className}</td>
                    <td className="border p-2 text-center">{student.marksObtained}/{student.totalMarks}</td>
                    <td className="border p-2 text-center font-bold">{student.percentage}%</td>
                    <td className="border p-2 text-center">
                      <span className={`px-2 py-1 rounded text-white text-xs ${
                        student.grade === "A+" || student.grade === "A" ? "bg-green-500" :
                        student.grade === "B+" || student.grade === "B" ? "bg-blue-500" :
                        student.grade === "C+" || student.grade === "C" ? "bg-yellow-500" :
                        "bg-red-500"
                      }`}>
                        {student.grade}
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        <ReportFooter />
      </div>
    )
  }
)
ExamResultsReportPDF.displayName = "ExamResultsReportPDF"

// =============================================
// FINANCIAL REPORT PDF
// =============================================

interface FinancialReportPDFProps {
  schoolName: string
  feeCollection?: FeeCollectionSummary
  pendingFees?: PendingFeeStudent[]
  academicYear?: string
}

export const FinancialReportPDF = forwardRef<HTMLDivElement, FinancialReportPDFProps>(
  ({ schoolName, feeCollection, pendingFees, academicYear }, ref) => {
    const today = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    return (
      <div ref={ref} className="p-8 bg-white text-black min-h-[297mm] w-[210mm] mx-auto">
        <style>{pdfStyles}</style>

        <ReportHeader
          schoolName={schoolName}
          reportTitle="Financial Report"
          subtitle={academicYear ? `Academic Year: ${academicYear}` : undefined}
          date={today}
        />

        {/* Fee Collection Summary */}
        {feeCollection && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 bg-gray-100 p-2">Fee Collection Summary</h3>
            <div className="grid grid-cols-4 gap-4 text-center">
              <div className="p-3 border rounded">
                <div className="text-2xl font-bold">₹{feeCollection.totalExpected.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Total Expected</div>
              </div>
              <div className="p-3 border rounded bg-green-50">
                <div className="text-2xl font-bold text-green-600">₹{feeCollection.totalCollected.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Collected</div>
              </div>
              <div className="p-3 border rounded bg-red-50">
                <div className="text-2xl font-bold text-red-600">₹{feeCollection.totalPending.toLocaleString()}</div>
                <div className="text-sm text-gray-600">Pending</div>
              </div>
              <div className="p-3 border rounded bg-blue-50">
                <div className="text-2xl font-bold text-blue-600">{feeCollection.collectionPercentage}%</div>
                <div className="text-sm text-gray-600">Collection Rate</div>
              </div>
            </div>

            {/* By Fee Type */}
            {feeCollection.byFeeType.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Collection by Fee Type</h4>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2 text-left">Fee Type</th>
                      <th className="border p-2 text-right">Expected</th>
                      <th className="border p-2 text-right">Collected</th>
                      <th className="border p-2 text-right">Pending</th>
                      <th className="border p-2 text-center">Rate</th>
                    </tr>
                  </thead>
                  <tbody>
                    {feeCollection.byFeeType.map((item) => (
                      <tr key={item.feeType} className="hover:bg-gray-50">
                        <td className="border p-2 font-medium">{item.feeType}</td>
                        <td className="border p-2 text-right">₹{item.expected.toLocaleString()}</td>
                        <td className="border p-2 text-right text-green-600">₹{item.collected.toLocaleString()}</td>
                        <td className="border p-2 text-right text-red-600">₹{item.pending.toLocaleString()}</td>
                        <td className="border p-2 text-center font-semibold">
                          {item.expected > 0 ? Math.round((item.collected / item.expected) * 100) : 0}%
                        </td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td className="border p-2">Total</td>
                      <td className="border p-2 text-right">₹{feeCollection.totalExpected.toLocaleString()}</td>
                      <td className="border p-2 text-right text-green-600">₹{feeCollection.totalCollected.toLocaleString()}</td>
                      <td className="border p-2 text-right text-red-600">₹{feeCollection.totalPending.toLocaleString()}</td>
                      <td className="border p-2 text-center">{feeCollection.collectionPercentage}%</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Pending Fee Students */}
        {pendingFees && pendingFees.length > 0 && (
          <div className="mb-6 page-break">
            <h3 className="text-lg font-semibold mb-3 bg-red-100 p-2 text-red-800">
              Students with Pending Fees ({pendingFees.length})
            </h3>
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border p-2 text-left">S.No</th>
                  <th className="border p-2 text-left">Student Name</th>
                  <th className="border p-2 text-left">Adm. No.</th>
                  <th className="border p-2 text-left">Class</th>
                  <th className="border p-2 text-left">Fee Type</th>
                  <th className="border p-2 text-right">Pending</th>
                  <th className="border p-2 text-center">Overdue</th>
                </tr>
              </thead>
              <tbody>
                {pendingFees.map((student, index) => (
                  <tr key={`${student.studentId}-${student.feeType}-${index}`} className="hover:bg-gray-50">
                    <td className="border p-2">{index + 1}</td>
                    <td className="border p-2 font-medium">{student.studentName}</td>
                    <td className="border p-2">{student.admissionNumber}</td>
                    <td className="border p-2">{student.className}</td>
                    <td className="border p-2">{student.feeType}</td>
                    <td className="border p-2 text-right font-bold text-red-600">
                      ₹{student.pendingAmount.toLocaleString()}
                    </td>
                    <td className="border p-2 text-center">
                      {student.daysOverdue > 0 ? (
                        <span className="text-red-600 font-semibold">{student.daysOverdue} days</span>
                      ) : (
                        <span className="text-green-600">Not due</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="bg-gray-100 font-bold">
                  <td colSpan={5} className="border p-2 text-right">Total Pending Amount:</td>
                  <td className="border p-2 text-right text-red-600">
                    ₹{pendingFees.reduce((sum, s) => sum + s.pendingAmount, 0).toLocaleString()}
                  </td>
                  <td className="border p-2"></td>
                </tr>
              </tfoot>
            </table>
          </div>
        )}

        <ReportFooter />
      </div>
    )
  }
)
FinancialReportPDF.displayName = "FinancialReportPDF"

// =============================================
// STAFF & STUDENTS REPORT PDF
// =============================================

interface StaffStudentsReportPDFProps {
  schoolName: string
  staffSummary?: StaffSummary
  studentEnrollment?: StudentEnrollmentSummary
}

export const StaffStudentsReportPDF = forwardRef<HTMLDivElement, StaffStudentsReportPDFProps>(
  ({ schoolName, staffSummary, studentEnrollment }, ref) => {
    const today = new Date().toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    })

    return (
      <div ref={ref} className="p-8 bg-white text-black min-h-[297mm] w-[210mm] mx-auto">
        <style>{pdfStyles}</style>

        <ReportHeader
          schoolName={schoolName}
          reportTitle="Staff & Student Report"
          date={today}
        />

        {/* Staff Summary */}
        {staffSummary && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 bg-blue-100 p-2 text-blue-800">Staff Summary</h3>
            <div className="grid grid-cols-3 gap-4 text-center mb-4">
              <div className="p-3 border rounded">
                <div className="text-2xl font-bold">{staffSummary.totalStaff}</div>
                <div className="text-sm text-gray-600">Total Staff</div>
              </div>
              <div className="p-3 border rounded bg-blue-50">
                <div className="text-2xl font-bold text-blue-600">{staffSummary.teachers}</div>
                <div className="text-sm text-gray-600">Teachers</div>
              </div>
              <div className="p-3 border rounded bg-purple-50">
                <div className="text-2xl font-bold text-purple-600">{staffSummary.adminStaff}</div>
                <div className="text-sm text-gray-600">Admin Staff</div>
              </div>
            </div>

            {staffSummary.byDepartment.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Staff by Department</h4>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2 text-left">Department</th>
                      <th className="border p-2 text-center">Count</th>
                    </tr>
                  </thead>
                  <tbody>
                    {staffSummary.byDepartment.map((item) => (
                      <tr key={item.department} className="hover:bg-gray-50">
                        <td className="border p-2">{item.department}</td>
                        <td className="border p-2 text-center font-semibold">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Student Enrollment */}
        {studentEnrollment && (
          <div className="mb-6">
            <h3 className="text-lg font-semibold mb-3 bg-green-100 p-2 text-green-800">Student Enrollment</h3>
            <div className="grid grid-cols-4 gap-4 text-center mb-4">
              <div className="p-3 border rounded">
                <div className="text-2xl font-bold">{studentEnrollment.totalStudents}</div>
                <div className="text-sm text-gray-600">Total Students</div>
              </div>
              <div className="p-3 border rounded bg-blue-50">
                <div className="text-2xl font-bold text-blue-600">{studentEnrollment.male}</div>
                <div className="text-sm text-gray-600">Male</div>
              </div>
              <div className="p-3 border rounded bg-pink-50">
                <div className="text-2xl font-bold text-pink-600">{studentEnrollment.female}</div>
                <div className="text-sm text-gray-600">Female</div>
              </div>
              <div className="p-3 border rounded bg-gray-50">
                <div className="text-2xl font-bold text-gray-600">{studentEnrollment.other}</div>
                <div className="text-sm text-gray-600">Other</div>
              </div>
            </div>

            {studentEnrollment.byClass.length > 0 && (
              <div className="mt-4">
                <h4 className="font-semibold mb-2">Students by Class</h4>
                <table className="w-full border-collapse text-sm">
                  <thead>
                    <tr className="bg-gray-200">
                      <th className="border p-2 text-left">Class</th>
                      <th className="border p-2 text-center">Students</th>
                    </tr>
                  </thead>
                  <tbody>
                    {studentEnrollment.byClass.map((item) => (
                      <tr key={item.className} className="hover:bg-gray-50">
                        <td className="border p-2">{item.className}</td>
                        <td className="border p-2 text-center font-semibold">{item.count}</td>
                      </tr>
                    ))}
                  </tbody>
                  <tfoot>
                    <tr className="bg-gray-100 font-bold">
                      <td className="border p-2">Total</td>
                      <td className="border p-2 text-center">{studentEnrollment.totalStudents}</td>
                    </tr>
                  </tfoot>
                </table>
              </div>
            )}
          </div>
        )}

        <ReportFooter />
      </div>
    )
  }
)
StaffStudentsReportPDF.displayName = "StaffStudentsReportPDF"
