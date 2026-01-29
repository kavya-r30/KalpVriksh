"use client"

import { CertificateData } from "@/lib/api/certificate-service"
import { forwardRef } from "react"

interface BonafideCertificateTemplateProps {
  data: CertificateData
  purpose?: string
}

export const BonafideCertificateTemplate = forwardRef<HTMLDivElement, BonafideCertificateTemplateProps>(
  ({ data, purpose = "for official purposes" }, ref) => {
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
        <div className="border-4 border-double border-green-800 p-8 relative">
          {/* Watermark */}
          <div className="absolute inset-0 flex items-center justify-center opacity-5 pointer-events-none">
            <span className="text-[120px] font-bold text-green-800 rotate-[-30deg]">BONAFIDE</span>
          </div>

          {/* Header */}
          <div className="text-center border-b-2 border-green-600 pb-4 mb-6 relative z-10">
            <div className="w-24 h-24 mx-auto mb-3 border-2 border-green-600 rounded-full flex items-center justify-center bg-green-50">
              <span className="text-2xl font-bold text-green-700">
                {data.school.name.split(" ").map(w => w[0]).join("").slice(0, 3).toUpperCase()}
              </span>
            </div>
            <h1 className="text-2xl font-bold uppercase tracking-wider text-green-800">
              {data.school.name}
            </h1>
            <p className="text-sm text-gray-600 mt-1">
              {data.school.address}, {data.school.city}, {data.school.state}
            </p>
            <p className="text-sm text-gray-600">
              Phone: {data.school.phone} | Email: {data.school.email}
            </p>
            <p className="text-sm font-semibold text-green-700 mt-1">
              School Code: {data.school.school_code} | Affiliated to {data.school.board} Board
            </p>
          </div>

          {/* Certificate Title */}
          <div className="text-center mb-8 relative z-10">
            <h2 className="text-3xl font-bold uppercase tracking-widest text-green-800 underline decoration-double">
              Bonafide Certificate
            </h2>
            <div className="flex justify-between mt-4 text-sm">
              <p><span className="font-semibold">Certificate No:</span> {data.certificate.number}</p>
              <p><span className="font-semibold">Date:</span> {formatDate(data.certificate.issue_date)}</p>
            </div>
          </div>

          {/* Certificate Body */}
          <div className="text-justify leading-8 mb-8 relative z-10">
            <p className="text-lg">
              This is to certify that{" "}
              <span className="font-bold underline">
                {data.student.gender === "Male" ? "Mr." : "Ms."} {data.student.first_name} {data.student.last_name}
              </span>
              , {data.student.gender === "Male" ? "son" : "daughter"} of{" "}
              <span className="font-bold underline">
                {data.parent.father_name || data.parent.guardian_name || "N/A"}
              </span>
              {data.parent.mother_name && (
                <>
                  {" "}and <span className="font-bold underline">{data.parent.mother_name}</span>
                </>
              )}
              , is a bonafide student of this institution.
            </p>

            <div className="mt-6 p-4 bg-green-50 border border-green-200 rounded">
              <table className="w-full text-sm">
                <tbody>
                  <tr>
                    <td className="py-1 font-semibold w-1/3">Admission Number</td>
                    <td className="py-1">: {data.student.admission_number}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Date of Birth</td>
                    <td className="py-1">: {formatDate(data.student.date_of_birth)}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Class & Section</td>
                    <td className="py-1">: {data.class.name} - {data.class.section}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Academic Year</td>
                    <td className="py-1">: {data.class.academic_year}</td>
                  </tr>
                  <tr>
                    <td className="py-1 font-semibold">Roll Number</td>
                    <td className="py-1">: {data.student.roll_number}</td>
                  </tr>
                  {data.student.aadhar_number && (
                    <tr>
                      <td className="py-1 font-semibold">Aadhar Number</td>
                      <td className="py-1">: XXXX-XXXX-{data.student.aadhar_number.slice(-4)}</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>

            <p className="mt-6 text-lg">
              This certificate is issued upon request {purpose}.
            </p>

            <p className="mt-4 text-lg">
              We wish {data.student.gender === "Male" ? "him" : "her"} all the best in{" "}
              {data.student.gender === "Male" ? "his" : "her"} future endeavors.
            </p>
          </div>

          {/* Signatures */}
          <div className="grid grid-cols-2 gap-8 mt-16 pt-6 text-sm text-center relative z-10">
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
          <div className="mt-8 pt-4 border-t border-green-300 relative z-10">
            <div className="flex justify-between text-xs text-gray-500">
              <p>Verification Code: {data.certificate.verification_code}</p>
              <p>Valid for 6 months from date of issue</p>
            </div>
            <p className="text-center text-xs text-gray-500 mt-2">
              This certificate can be verified online at www.{data.school.school_code.toLowerCase()}.edu/verify
            </p>
          </div>
        </div>
      </div>
    )
  }
)

BonafideCertificateTemplate.displayName = "BonafideCertificateTemplate"
