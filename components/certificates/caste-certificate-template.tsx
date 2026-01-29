"use client"

import { CertificateData } from "@/lib/api/certificate-service"
import { forwardRef } from "react"

interface CasteCertificateTemplateProps {
  data: CertificateData
  caste?: string
  subCaste?: string
  religion?: string
}

export const CasteCertificateTemplate = forwardRef<HTMLDivElement, CasteCertificateTemplateProps>(
  ({ data, caste = "General", subCaste = "", religion = "Hindu" }, ref) => {
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
        className="bg-white text-black p-8 min-h-[800px] w-[700px] mx-auto font-serif"
        style={{ fontFamily: "Times New Roman, serif" }}
      >
        <div className="border-4 border-double border-purple-800 p-8 relative">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <span className="text-[100px] font-bold text-purple-800 rotate-[-30deg]">CASTE</span>
          </div>

          {/* Header */}
          <div className="text-center border-b-2 border-purple-600 pb-4 mb-6 relative z-10">
            <div className="w-24 h-24 mx-auto mb-3 border-2 border-purple-600 rounded-full flex items-center justify-center bg-purple-50">
              <span className="text-2xl font-bold text-purple-700">
                {data.school.name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-purple-800">
              {data.school.name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {data.school.address}, {data.school.city}, {data.school.state}
            </p>
            <p className="text-sm text-gray-600">
              Phone: {data.school.phone} | Email: {data.school.email}
            </p>
            <p className="text-sm font-semibold text-purple-700 mt-1">
              School Code: {data.school.school_code}
            </p>
          </div>

          {/* Certificate Title */}
          <div className="text-center mb-8 relative z-10">
            <h2 className="text-3xl font-bold uppercase tracking-widest text-purple-800 underline decoration-double">
              Caste Certificate
            </h2>
            <p className="text-sm text-gray-600 mt-2">(As per school records)</p>
            <div className="flex justify-between mt-4 text-sm">
              <p><span className="font-semibold">Certificate No:</span> {data.certificate.number}</p>
              <p><span className="font-semibold">Date:</span> {formatDate(data.certificate.issue_date)}</p>
            </div>
          </div>

          {/* Certificate Body */}
          <div className="text-justify leading-8 mb-8 relative z-10">
            <p className="text-lg mb-4">
              <span className="font-semibold">To Whom It May Concern</span>
            </p>

            <p className="text-lg">
              This is to certify that according to our school records,{" "}
              <span className="font-bold underline">
                {data.student.gender === "Male" ? "Mr." : "Ms."} {data.student.first_name} {data.student.last_name}
              </span>
              , {data.student.gender === "Male" ? "son" : "daughter"} of{" "}
              <span className="font-bold underline">
                Shri {data.parent.father_name || data.parent.guardian_name || "N/A"}
              </span>
              {data.parent.mother_name && (
                <>
                  {" "}and <span className="font-bold underline">Smt. {data.parent.mother_name}</span>
                </>
              )}
              , a student of this institution, belongs to the following community:
            </p>

            <div className="mt-6 p-6 bg-purple-50 border-2 border-purple-300 rounded-lg">
              <table className="w-full text-base">
                <tbody>
                  <tr>
                    <td className="py-2 font-semibold w-2/5">Caste</td>
                    <td className="py-2 font-bold text-purple-700 text-lg">: {caste}</td>
                  </tr>
                  {subCaste && (
                    <tr>
                      <td className="py-2 font-semibold">Sub-Caste</td>
                      <td className="py-2">: {subCaste}</td>
                    </tr>
                  )}
                  <tr>
                    <td className="py-2 font-semibold">Religion</td>
                    <td className="py-2">: {religion}</td>
                  </tr>
                  <tr>
                    <td className="py-2 font-semibold">Nationality</td>
                    <td className="py-2">: Indian</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-6 p-4 bg-gray-50 border border-gray-200 rounded text-sm">
              <p className="font-semibold mb-2">Student Details (as per admission records):</p>
              <table className="w-full">
                <tbody>
                  <tr>
                    <td className="py-1 w-1/3">Admission Number</td>
                    <td className="py-1">: {data.student.admission_number}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Date of Birth</td>
                    <td className="py-1">: {formatDate(data.student.date_of_birth)}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Class & Section</td>
                    <td className="py-1">: {data.class.name} - {data.class.section}</td>
                  </tr>
                  <tr>
                    <td className="py-1">Permanent Address</td>
                    <td className="py-1">: {data.student.address}, {data.student.city}, {data.student.state} - {data.student.pincode}</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-base italic text-gray-700">
              This certificate is issued based on the records submitted at the time of admission.
              The school is not responsible for the authenticity of the caste/community information
              provided by the parents/guardians.
            </p>

            <p className="mt-4 text-lg">
              This certificate is issued at the request of the student/parent for official purposes.
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-12 pt-6 text-sm text-center relative z-10">
            <div>
              <div className="h-16"></div>
              <div className="border-t border-gray-400 pt-2 inline-block px-8">
                <p className="font-semibold">Class Teacher</p>
              </div>
            </div>
            <div>
              <div className="h-16"></div>
              <div className="border-t border-gray-400 pt-2 inline-block px-8">
                <p className="font-semibold">Principal</p>
                <p className="text-xs text-gray-500">(With Seal)</p>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="mt-8 pt-4 border-t border-purple-300 relative z-10">
            <div className="flex justify-between text-xs text-gray-500">
              <p>Verification Code: {data.certificate.verification_code}</p>
              <p>Place: {data.school.city}</p>
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              Note: This certificate is valid for school/educational purposes only.
              For legal purposes, please obtain the certificate from the competent authority.
            </p>
          </div>
        </div>
      </div>
    )
  }
)

CasteCertificateTemplate.displayName = "CasteCertificateTemplate"
