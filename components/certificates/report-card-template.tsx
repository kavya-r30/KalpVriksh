"use client"

import { ReportCardData } from "@/lib/api/certificate-service"
import { forwardRef } from "react"

interface ReportCardTemplateProps {
  data: ReportCardData
}

export const ReportCardTemplate = forwardRef<HTMLDivElement, ReportCardTemplateProps>(
  ({ data }, ref) => {
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric"
      })
    }

    return (
      <div
        ref={ref}
        className="bg-white text-black p-8 min-h-[1100px] w-[800px] mx-auto font-serif"
        style={{ fontFamily: "Times New Roman, serif" }}
      >
        {/* Header with School Info */}
        <div className="border-4 border-double border-gray-800 p-6">
          {/* School Header */}
          <div className="text-center border-b-2 border-gray-400 pb-4 mb-4">
            <div className="flex items-center justify-center gap-4">
              <div className="w-20 h-20 border-2 border-gray-400 rounded-full flex items-center justify-center">
                <span className="text-xs text-gray-500">School Logo</span>
              </div>
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wider text-gray-900">
                  {data.school.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {data.school.address}, {data.school.city}, {data.school.state}
                </p>
                <p className="text-sm text-gray-600">
                  Phone: {data.school.phone} | Email: {data.school.email}
                </p>
                <p className="text-sm font-semibold text-gray-700">
                  Affiliated to {data.school.board} Board
                </p>
              </div>
            </div>
          </div>

          {/* Report Card Title */}
          <div className="text-center mb-6">
            <h2 className="text-xl font-bold uppercase tracking-widest bg-gray-100 py-2 border border-gray-300">
              {data.exam.exam_type === "Midterm" ? "Mid-Semester" : "End-Semester"} Examination Report Card
            </h2>
            <p className="text-sm mt-2 text-gray-600">
              {data.exam.name} | Academic Year: {data.exam.academic_year}
            </p>
          </div>

          {/* Student Information */}
          <div className="grid grid-cols-2 gap-4 mb-6 text-sm border border-gray-300 p-4 bg-gray-50">
            <div className="space-y-2">
              <p><span className="font-semibold">Student Name:</span> {data.student.first_name} {data.student.last_name}</p>
              <p><span className="font-semibold">Admission No:</span> {data.student.admission_number}</p>
              <p><span className="font-semibold">Roll Number:</span> {data.student.roll_number}</p>
              <p><span className="font-semibold">Date of Birth:</span> {formatDate(data.student.date_of_birth)}</p>
            </div>
            <div className="space-y-2">
              <p><span className="font-semibold">Class:</span> {data.class.name} - {data.class.section}</p>
              <p><span className="font-semibold">Gender:</span> {data.student.gender}</p>
              <p><span className="font-semibold">Parent/Guardian:</span> {data.parent.name}</p>
              <p><span className="font-semibold">Attendance:</span> {data.summary.attendance_percentage}%</p>
            </div>
          </div>

          {/* Marks Table */}
          <div className="mb-6">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="bg-gray-200">
                  <th className="border border-gray-400 px-3 py-2 text-left">S.No</th>
                  <th className="border border-gray-400 px-3 py-2 text-left">Subject</th>
                  <th className="border border-gray-400 px-3 py-2 text-center">Code</th>
                  <th className="border border-gray-400 px-3 py-2 text-center">Max Marks</th>
                  <th className="border border-gray-400 px-3 py-2 text-center">Marks Obtained</th>
                  <th className="border border-gray-400 px-3 py-2 text-center">Grade</th>
                  <th className="border border-gray-400 px-3 py-2 text-center">Remarks</th>
                </tr>
              </thead>
              <tbody>
                {data.subjects.map((subject, index) => (
                  <tr key={index} className={index % 2 === 0 ? "bg-white" : "bg-gray-50"}>
                    <td className="border border-gray-400 px-3 py-2">{index + 1}</td>
                    <td className="border border-gray-400 px-3 py-2">{subject.name}</td>
                    <td className="border border-gray-400 px-3 py-2 text-center">{subject.code}</td>
                    <td className="border border-gray-400 px-3 py-2 text-center">{subject.max_marks}</td>
                    <td className="border border-gray-400 px-3 py-2 text-center font-semibold">
                      {subject.marks_obtained}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-center font-bold">
                      {subject.grade}
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-center text-xs">
                      {subject.remarks}
                    </td>
                  </tr>
                ))}
                {/* Total Row */}
                <tr className="bg-gray-200 font-bold">
                  <td className="border border-gray-400 px-3 py-2" colSpan={3}>TOTAL</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">{data.summary.total_marks}</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">{data.summary.marks_obtained}</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">{data.summary.grade}</td>
                  <td className="border border-gray-400 px-3 py-2 text-center">
                    {data.summary.percentage >= 33 ? "PASS" : "FAIL"}
                  </td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Summary Section */}
          <div className="grid grid-cols-3 gap-4 mb-6 text-sm">
            <div className="border border-gray-300 p-3 text-center bg-blue-50">
              <p className="text-gray-600 text-xs">Percentage</p>
              <p className="text-2xl font-bold text-blue-700">{data.summary.percentage}%</p>
            </div>
            <div className="border border-gray-300 p-3 text-center bg-green-50">
              <p className="text-gray-600 text-xs">Overall Grade</p>
              <p className="text-2xl font-bold text-green-700">{data.summary.grade}</p>
            </div>
            <div className="border border-gray-300 p-3 text-center bg-purple-50">
              <p className="text-gray-600 text-xs">Class Rank</p>
              <p className="text-2xl font-bold text-purple-700">{data.summary.rank}</p>
            </div>
          </div>

          {/* Grade Scale */}
          <div className="mb-6 text-xs">
            <p className="font-semibold mb-2">Grading Scale:</p>
            <div className="flex justify-between border border-gray-300 p-2 bg-gray-50">
              <span>A+ (90-100)</span>
              <span>A (80-89)</span>
              <span>B+ (70-79)</span>
              <span>B (60-69)</span>
              <span>C+ (50-59)</span>
              <span>C (40-49)</span>
              <span>D (33-39)</span>
              <span>F (Below 33)</span>
            </div>
          </div>

          {/* Remarks Section */}
          <div className="mb-6 text-sm border border-gray-300 p-3 bg-gray-50">
            <p className="font-semibold">Teacher's Remarks:</p>
            <p className="mt-1 italic text-gray-700">
              {data.summary.teacher_remarks || "Keep up the good work. Continue to strive for excellence."}
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-8 mt-10 pt-6 text-sm text-center">
            <div>
              <div className="border-t border-gray-400 pt-2">
                <p className="font-semibold">Class Teacher</p>
              </div>
            </div>
            <div>
              <div className="border-t border-gray-400 pt-2">
                <p className="font-semibold">Parent/Guardian</p>
              </div>
            </div>
            <div>
              <div className="border-t border-gray-400 pt-2">
                <p className="font-semibold">Principal</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-gray-300 text-center text-xs text-gray-500">
            <p>This is a computer-generated document. Date of Issue: {formatDate(new Date().toISOString())}</p>
            <p className="mt-1">For any queries, please contact the school office.</p>
          </div>
        </div>
      </div>
    )
  }
)

ReportCardTemplate.displayName = "ReportCardTemplate"
