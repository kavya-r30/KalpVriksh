"use client"

import { CertificateData } from "@/lib/api/certificate-service"
import { forwardRef } from "react"

interface LeavingCertificateTemplateProps {
  data: CertificateData
  reason?: string
  lastAttendedDate?: string
  feesPaidTill?: string
  conduct?: string
}

export const LeavingCertificateTemplate = forwardRef<HTMLDivElement, LeavingCertificateTemplateProps>(
  ({ data, reason = "On parent's request", lastAttendedDate, feesPaidTill, conduct = "Good" }, ref) => {
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
        className="bg-white text-black p-8 min-h-[900px] w-[700px] mx-auto font-serif"
        style={{ fontFamily: "Times New Roman, serif" }}
      >
        <div className="border-4 border-double border-amber-800 p-8 relative">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <span className="text-[80px] font-bold text-amber-800 rotate-[-30deg]">TRANSFER CERTIFICATE</span>
          </div>

          {/* Header */}
          <div className="text-center border-b-2 border-amber-600 pb-4 mb-6 relative z-10">
            <div className="flex items-center justify-center gap-4">
              <div className="w-20 h-20 border-2 border-amber-600 rounded-full flex items-center justify-center bg-amber-50">
                <span className="text-xl font-bold text-amber-700">
                  {data.school.name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase()}
                </span>
              </div>
              <div>
                <h1 className="text-2xl font-bold uppercase tracking-wider text-amber-800">
                  {data.school.name}
                </h1>
                <p className="text-sm text-gray-600">
                  {data.school.address}, {data.school.city}, {data.school.state}
                </p>
                <p className="text-sm text-gray-600">
                  Phone: {data.school.phone} | Email: {data.school.email}
                </p>
                <p className="text-sm font-semibold text-amber-700">
                  Affiliated to {data.school.board} Board
                </p>
              </div>
            </div>
          </div>

          {/* Certificate Title */}
          <div className="text-center mb-6 relative z-10">
            <h2 className="text-2xl font-bold uppercase tracking-widest text-amber-800 underline decoration-double">
              School Leaving Certificate / Transfer Certificate
            </h2>
            <div className="flex justify-between mt-4 text-sm">
              <p><span className="font-semibold">TC No:</span> {data.certificate.number}</p>
              <p><span className="font-semibold">Date:</span> {formatDate(data.certificate.issue_date)}</p>
            </div>
          </div>

          {/* Certificate Body - Table Format */}
          <div className="mb-8 relative z-10">
            <table className="w-full text-sm border-collapse">
              <tbody>
                <tr className="border-b border-amber-200">
                  <td className="py-2 font-semibold w-2/5">1. Name of the Student</td>
                  <td className="py-2">: {data.student.first_name} {data.student.last_name}</td>
                </tr>
                <tr className="border-b border-amber-200 bg-amber-50">
                  <td className="py-2 font-semibold">2. Father's Name</td>
                  <td className="py-2">: {data.parent.father_name || "N/A"}</td>
                </tr>
                <tr className="border-b border-amber-200">
                  <td className="py-2 font-semibold">3. Mother's Name</td>
                  <td className="py-2">: {data.parent.mother_name || "N/A"}</td>
                </tr>
                <tr className="border-b border-amber-200 bg-amber-50">
                  <td className="py-2 font-semibold">4. Admission Number</td>
                  <td className="py-2">: {data.student.admission_number}</td>
                </tr>
                <tr className="border-b border-amber-200">
                  <td className="py-2 font-semibold">5. Date of Birth (in figures)</td>
                  <td className="py-2">: {formatDate(data.student.date_of_birth)}</td>
                </tr>
                <tr className="border-b border-amber-200 bg-amber-50">
                  <td className="py-2 font-semibold">6. Date of Birth (in words)</td>
                  <td className="py-2">: {new Date(data.student.date_of_birth).toLocaleDateString("en-IN", {
                    day: "numeric", month: "long", year: "numeric"
                  }).replace(/(\d+)/, (match) => {
                    const n = parseInt(match)
                    const suffix = ["th", "st", "nd", "rd"][(n % 10 > 3 || Math.floor(n % 100 / 10) === 1) ? 0 : n % 10]
                    return n + suffix
                  })}</td>
                </tr>
                <tr className="border-b border-amber-200">
                  <td className="py-2 font-semibold">7. Gender</td>
                  <td className="py-2">: {data.student.gender}</td>
                </tr>
                <tr className="border-b border-amber-200 bg-amber-50">
                  <td className="py-2 font-semibold">8. Nationality</td>
                  <td className="py-2">: Indian</td>
                </tr>
                <tr className="border-b border-amber-200">
                  <td className="py-2 font-semibold">9. Category / Caste</td>
                  <td className="py-2">: {data.additional?.caste || "General"}</td>
                </tr>
                <tr className="border-b border-amber-200 bg-amber-50">
                  <td className="py-2 font-semibold">10. Class at time of Leaving</td>
                  <td className="py-2">: {data.class.name} - {data.class.section}</td>
                </tr>
                <tr className="border-b border-amber-200">
                  <td className="py-2 font-semibold">11. Academic Year</td>
                  <td className="py-2">: {data.class.academic_year}</td>
                </tr>
                <tr className="border-b border-amber-200 bg-amber-50">
                  <td className="py-2 font-semibold">12. Date of Admission</td>
                  <td className="py-2">: {data.additional?.admission_date || "N/A"}</td>
                </tr>
                <tr className="border-b border-amber-200">
                  <td className="py-2 font-semibold">13. Last Day of Attendance</td>
                  <td className="py-2">: {lastAttendedDate ? formatDate(lastAttendedDate) : formatDate(new Date().toISOString())}</td>
                </tr>
                <tr className="border-b border-amber-200 bg-amber-50">
                  <td className="py-2 font-semibold">14. Whether failed/passed</td>
                  <td className="py-2">: Passed and promoted to next class</td>
                </tr>
                <tr className="border-b border-amber-200">
                  <td className="py-2 font-semibold">15. Subject Studied</td>
                  <td className="py-2">: As per {data.school.board} curriculum</td>
                </tr>
                <tr className="border-b border-amber-200 bg-amber-50">
                  <td className="py-2 font-semibold">16. School Fees Paid till</td>
                  <td className="py-2">: {feesPaidTill || data.class.academic_year}</td>
                </tr>
                <tr className="border-b border-amber-200">
                  <td className="py-2 font-semibold">17. General Conduct</td>
                  <td className="py-2 font-bold text-amber-700">: {conduct}</td>
                </tr>
                <tr className="border-b border-amber-200 bg-amber-50">
                  <td className="py-2 font-semibold">18. Reason for Leaving</td>
                  <td className="py-2">: {reason}</td>
                </tr>
                <tr className="border-b border-amber-200">
                  <td className="py-2 font-semibold">19. Any other Remarks</td>
                  <td className="py-2">: No dues pending. Character: {conduct}</td>
                </tr>
              </tbody>
            </table>
          </div>

          {/* Declaration */}
          <div className="text-sm mb-6 p-3 bg-amber-50 border border-amber-200 rounded relative z-10">
            <p>
              Certified that the above information is in accordance with the school register.
              This certificate is issued on the request of parent/guardian for the purpose of
              seeking admission in another school.
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-3 gap-4 mt-10 pt-6 text-sm text-center relative z-10">
            <div>
              <div className="h-12"></div>
              <div className="border-t border-gray-400 pt-2">
                <p className="font-semibold text-xs">Class Teacher</p>
              </div>
            </div>
            <div>
              <div className="h-12"></div>
              <div className="border-t border-gray-400 pt-2">
                <p className="font-semibold text-xs">Office Superintendent</p>
              </div>
            </div>
            <div>
              <div className="h-12"></div>
              <div className="border-t border-gray-400 pt-2">
                <p className="font-semibold text-xs">Principal</p>
                <p className="text-[10px] text-gray-500">(Signature & Seal)</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-6 pt-4 border-t border-amber-300 relative z-10">
            <div className="flex justify-between text-xs text-gray-500">
              <p>Verification: {data.certificate.verification_code}</p>
              <p>Place: {data.school.city}</p>
            </div>
            <p className="text-center text-xs text-gray-500 mt-2 italic">
              Note: No correction or alteration in entries is permissible.
              Erasures or changes render this certificate invalid.
            </p>
          </div>
        </div>
      </div>
    )
  }
)

LeavingCertificateTemplate.displayName = "LeavingCertificateTemplate"
