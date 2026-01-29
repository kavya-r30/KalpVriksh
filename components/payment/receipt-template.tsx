"use client"

import { forwardRef } from "react"

interface ReceiptData {
  receipt_number: string
  transaction_id: string
  payment_date: string
  amount: number
  payment_method: string
  student: {
    name: string
    admission_number: string
    class: string
    section: string
  }
  school: {
    name: string
    address: string
    city: string
    state: string
    phone: string
    email: string
  }
  fee_type: string
  academic_year: string
  payer_name?: string
}

interface ReceiptTemplateProps {
  data: ReceiptData
}

export const ReceiptTemplate = forwardRef<HTMLDivElement, ReceiptTemplateProps>(
  ({ data }, ref) => {
    const formatDate = (dateStr: string) => {
      return new Date(dateStr).toLocaleDateString("en-IN", {
        day: "2-digit",
        month: "long",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit"
      })
    }

    const formatCurrency = (amount: number) => {
      return new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency: "INR",
        minimumFractionDigits: 2
      }).format(amount)
    }

    const numberToWords = (num: number): string => {
      const ones = ["", "One", "Two", "Three", "Four", "Five", "Six", "Seven", "Eight", "Nine"]
      const tens = ["", "", "Twenty", "Thirty", "Forty", "Fifty", "Sixty", "Seventy", "Eighty", "Ninety"]
      const teens = ["Ten", "Eleven", "Twelve", "Thirteen", "Fourteen", "Fifteen", "Sixteen", "Seventeen", "Eighteen", "Nineteen"]

      if (num === 0) return "Zero"

      const convertLessThanThousand = (n: number): string => {
        if (n === 0) return ""
        if (n < 10) return ones[n]
        if (n < 20) return teens[n - 10]
        if (n < 100) return tens[Math.floor(n / 10)] + (n % 10 !== 0 ? " " + ones[n % 10] : "")
        return ones[Math.floor(n / 100)] + " Hundred" + (n % 100 !== 0 ? " " + convertLessThanThousand(n % 100) : "")
      }

      const convert = (n: number): string => {
        if (n < 1000) return convertLessThanThousand(n)
        if (n < 100000) return convertLessThanThousand(Math.floor(n / 1000)) + " Thousand" + (n % 1000 !== 0 ? " " + convertLessThanThousand(n % 1000) : "")
        if (n < 10000000) return convertLessThanThousand(Math.floor(n / 100000)) + " Lakh" + (n % 100000 !== 0 ? " " + convert(n % 100000) : "")
        return convertLessThanThousand(Math.floor(n / 10000000)) + " Crore" + (n % 10000000 !== 0 ? " " + convert(n % 10000000) : "")
      }

      const rupees = Math.floor(num)
      const paise = Math.round((num - rupees) * 100)

      let result = convert(rupees) + " Rupees"
      if (paise > 0) {
        result += " and " + convert(paise) + " Paise"
      }
      result += " Only"

      return result
    }

    return (
      <div
        ref={ref}
        className="bg-white text-black p-6 w-[600px] mx-auto font-sans text-sm"
        style={{ fontFamily: "Arial, sans-serif" }}
      >
        {/* Header */}
        <div className="border-2 border-gray-800">
          {/* School Header */}
          <div className="text-center border-b-2 border-gray-800 p-4 bg-gray-100">
            <h1 className="text-xl font-bold uppercase tracking-wide">
              {data.school.name}
            </h1>
            <p className="text-xs text-gray-600 mt-1">
              {data.school.address}, {data.school.city}, {data.school.state}
            </p>
            <p className="text-xs text-gray-600">
              Phone: {data.school.phone} | Email: {data.school.email}
            </p>
          </div>

          {/* Receipt Title */}
          <div className="text-center py-2 bg-green-600 text-white">
            <h2 className="text-lg font-bold uppercase tracking-widest">
              Fee Payment Receipt
            </h2>
          </div>

          {/* Receipt Details */}
          <div className="p-4 space-y-4">
            {/* Receipt Info Row */}
            <div className="flex justify-between text-sm border-b border-gray-300 pb-2">
              <div>
                <span className="font-semibold">Receipt No:</span>{" "}
                <span className="font-mono text-green-700">{data.receipt_number}</span>
              </div>
              <div>
                <span className="font-semibold">Date:</span>{" "}
                {formatDate(data.payment_date)}
              </div>
            </div>

            {/* Student Details */}
            <div className="bg-gray-50 p-3 rounded border border-gray-200">
              <p className="font-semibold text-gray-700 text-xs uppercase mb-2">Student Details</p>
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div>
                  <span className="text-gray-600">Name:</span>{" "}
                  <span className="font-semibold">{data.student.name}</span>
                </div>
                <div>
                  <span className="text-gray-600">Admission No:</span>{" "}
                  <span className="font-semibold">{data.student.admission_number}</span>
                </div>
                <div>
                  <span className="text-gray-600">Class:</span>{" "}
                  <span className="font-semibold">{data.student.class} - {data.student.section}</span>
                </div>
                <div>
                  <span className="text-gray-600">Academic Year:</span>{" "}
                  <span className="font-semibold">{data.academic_year}</span>
                </div>
              </div>
            </div>

            {/* Payment Details Table */}
            <div>
              <table className="w-full border-collapse text-sm">
                <thead>
                  <tr className="bg-gray-200">
                    <th className="border border-gray-400 px-3 py-2 text-left">Description</th>
                    <th className="border border-gray-400 px-3 py-2 text-right w-32">Amount</th>
                  </tr>
                </thead>
                <tbody>
                  <tr>
                    <td className="border border-gray-400 px-3 py-2">
                      {data.fee_type} Fee
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-right font-semibold">
                      {formatCurrency(data.amount)}
                    </td>
                  </tr>
                  <tr className="bg-green-50">
                    <td className="border border-gray-400 px-3 py-2 font-bold text-right">
                      Total Paid
                    </td>
                    <td className="border border-gray-400 px-3 py-2 text-right font-bold text-green-700 text-base">
                      {formatCurrency(data.amount)}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>

            {/* Amount in Words */}
            <div className="bg-yellow-50 p-2 rounded border border-yellow-200">
              <p className="text-xs">
                <span className="font-semibold">Amount in Words:</span>{" "}
                <span className="italic">{numberToWords(data.amount)}</span>
              </p>
            </div>

            {/* Transaction Details */}
            <div className="grid grid-cols-2 gap-4 text-sm">
              <div>
                <span className="text-gray-600">Payment Method:</span>{" "}
                <span className="font-semibold">{data.payment_method}</span>
              </div>
              <div>
                <span className="text-gray-600">Transaction ID:</span>{" "}
                <span className="font-mono text-xs">{data.transaction_id}</span>
              </div>
            </div>

            {/* Signatures */}
            <div className="grid grid-cols-2 gap-8 mt-8 pt-4">
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 mx-8">
                  <p className="text-xs text-gray-600">Received By</p>
                </div>
              </div>
              <div className="text-center">
                <div className="border-t border-gray-400 pt-2 mx-8">
                  <p className="text-xs text-gray-600">Authorized Signature</p>
                </div>
              </div>
            </div>
          </div>

          {/* Footer */}
          <div className="border-t-2 border-gray-800 p-3 bg-gray-100 text-center">
            <p className="text-xs text-gray-600">
              This is a computer-generated receipt and does not require a physical signature.
            </p>
            <p className="text-xs text-gray-500 mt-1">
              For any queries, please contact the school accounts office.
            </p>
          </div>
        </div>

        {/* Duplicate Copy Note (for print) */}
        <div className="mt-4 text-center text-xs text-gray-400 border-t border-dashed border-gray-300 pt-4">
          <p>- - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - - -</p>
          <p className="mt-2">Student Copy | Keep this receipt for your records</p>
        </div>
      </div>
    )
  }
)

ReceiptTemplate.displayName = "ReceiptTemplate"
