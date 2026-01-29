import { getSupabaseClient } from "@/lib/supabase"

const supabase = getSupabaseClient()

// Types for payment system
export interface FeeCategory {
  id: string
  name: string
  description: string
  fee_type: string
}

export interface FeeStructureItem {
  id: string
  fee_type: string
  amount: number
  due_date: string
  academic_year: string
}

export interface PaymentRequest {
  student_fee_id: string
  amount: number
  payment_method: "UPI" | "Card" | "NetBanking" | "Cash" | "Cheque"
  student_id: string
  payer_id: string
}

export interface PaymentResponse {
  success: boolean
  transaction_id?: string
  receipt_number?: string
  message: string
  payment_id?: string
}

// Fee categories for the system
export const FEE_CATEGORIES = [
  { id: "tuition", name: "Tuition Fee", description: "Monthly/quarterly tuition charges", fee_type: "Tuition" },
  { id: "exam", name: "Examination Fee", description: "Fees for mid-term and final exams", fee_type: "Exam" },
  { id: "library", name: "Library Fee", description: "Annual library membership and services", fee_type: "Library" },
  { id: "lab", name: "Laboratory Fee", description: "Science and computer lab usage fees", fee_type: "Lab" },
  { id: "sports", name: "Sports Fee", description: "Sports equipment and facilities", fee_type: "Sports" },
  { id: "transport", name: "Transport Fee", description: "School bus/transport charges", fee_type: "Transport" },
  { id: "activity", name: "Activity Fee", description: "Co-curricular activities and events", fee_type: "Activity" },
  { id: "admission", name: "Admission Fee", description: "One-time admission charges", fee_type: "Admission" },
  { id: "development", name: "Development Fee", description: "Infrastructure development fund", fee_type: "Development" },
  { id: "uniform", name: "Uniform Fee", description: "School uniform charges", fee_type: "Uniform" }
]

// Generate unique receipt number
export function generateReceiptNumber(): string {
  const prefix = "RCP"
  const timestamp = Date.now().toString(36).toUpperCase()
  const random = Math.floor(Math.random() * 1000).toString().padStart(3, "0")
  return `${prefix}${timestamp}${random}`
}

// Generate transaction ID (simulating payment gateway)
export function generateTransactionId(method: string): string {
  const prefix = method.substring(0, 3).toUpperCase()
  const timestamp = Date.now().toString()
  const random = Math.floor(Math.random() * 100000).toString().padStart(5, "0")
  return `${prefix}${timestamp}${random}`
}

// Simulate payment gateway processing
export async function processPayment(request: PaymentRequest): Promise<PaymentResponse> {
  // Simulate payment processing delay
  await new Promise(resolve => setTimeout(resolve, 1500))

  // Simulate 95% success rate
  const isSuccess = Math.random() > 0.05

  if (!isSuccess) {
    return {
      success: false,
      message: "Payment failed. Please try again or use a different payment method."
    }
  }

  const transaction_id = generateTransactionId(request.payment_method)
  const receipt_number = generateReceiptNumber()

  try {
    // Start database transaction
    // 1. Create payment record
    const { data: payment, error: paymentError } = await supabase
      .from("fee_payments")
      .insert({
        student_fee_id: request.student_fee_id,
        payment_method: request.payment_method,
        transaction_id,
        payment_date: new Date().toISOString(),
        amount: request.amount,
        payment_status: "Success",
        receipt_number,
        paid_by: request.payer_id
      })
      .select()
      .single()

    if (paymentError) throw paymentError

    // 2. Update student_fees record
    const { data: studentFee, error: fetchError } = await supabase
      .from("student_fees")
      .select("paid_amount, total_amount, balance_amount")
      .eq("id", request.student_fee_id)
      .single()

    if (fetchError) throw fetchError

    const newPaidAmount = (studentFee.paid_amount || 0) + request.amount
    const newBalanceAmount = studentFee.total_amount - newPaidAmount
    const newStatus = newBalanceAmount <= 0 ? "Paid" : newBalanceAmount < studentFee.total_amount ? "Partial" : "Pending"

    const { error: updateError } = await supabase
      .from("student_fees")
      .update({
        paid_amount: newPaidAmount,
        balance_amount: Math.max(0, newBalanceAmount),
        status: newStatus,
        updated_at: new Date().toISOString()
      })
      .eq("id", request.student_fee_id)

    if (updateError) throw updateError

    return {
      success: true,
      transaction_id,
      receipt_number,
      payment_id: payment.id,
      message: "Payment successful! Receipt has been generated."
    }
  } catch (error) {
    console.error("Payment processing error:", error)
    return {
      success: false,
      message: "Payment was processed but there was an error updating records. Please contact support."
    }
  }
}

// Get fee structures for a school
export async function getFeeStructures(schoolId: string, classId?: string) {
  let query = supabase
    .from("fee_structures")
    .select(`
      *,
      class:classes(name, grade_level)
    `)
    .eq("school_id", schoolId)
    .order("fee_type")

  if (classId) {
    query = query.eq("class_id", classId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

// Get student fees with structure details
export async function getStudentFeesDetailed(studentId: string) {
  const { data, error } = await supabase
    .from("student_fees")
    .select(`
      *,
      fee_structure:fee_structures(
        fee_type,
        amount,
        due_date,
        academic_year,
        class:classes(name)
      )
    `)
    .eq("student_id", studentId)
    .order("due_date", { ascending: true })

  if (error) throw error
  return data
}

// Get payment history with details
export async function getPaymentHistory(studentFeeId: string) {
  const { data, error } = await supabase
    .from("fee_payments")
    .select("*")
    .eq("student_fee_id", studentFeeId)
    .order("payment_date", { ascending: false })

  if (error) throw error
  return data
}

// Get all payments for a student
export async function getStudentPaymentHistory(studentId: string) {
  const { data: studentFees } = await supabase
    .from("student_fees")
    .select("id")
    .eq("student_id", studentId)

  if (!studentFees || studentFees.length === 0) return []

  const feeIds = studentFees.map(f => f.id)

  const { data, error } = await supabase
    .from("fee_payments")
    .select(`
      *,
      student_fee:student_fees(
        fee_structure:fee_structures(fee_type)
      )
    `)
    .in("student_fee_id", feeIds)
    .order("payment_date", { ascending: false })

  if (error) throw error
  return data
}

// Create fee structure (admin/principal)
export async function createFeeStructure(data: {
  school_id: string
  class_id: string
  academic_year: string
  fee_type: string
  amount: number
  due_date: string
}) {
  const { data: result, error } = await supabase
    .from("fee_structures")
    .insert(data)
    .select()
    .single()

  if (error) throw error
  return result
}

// Assign fee to student
export async function assignFeeToStudent(data: {
  student_id: string
  fee_structure_id: string
  academic_year: string
  total_amount: number
  due_date: string
}) {
  const { data: result, error } = await supabase
    .from("student_fees")
    .insert({
      ...data,
      paid_amount: 0,
      balance_amount: data.total_amount,
      status: "Pending"
    })
    .select()
    .single()

  if (error) throw error
  return result
}

// Bulk assign fees to all students in a class
export async function assignFeesToClass(classId: string, feeStructureId: string, academicYear: string) {
  // Get fee structure details
  const { data: feeStructure, error: feeError } = await supabase
    .from("fee_structures")
    .select("*")
    .eq("id", feeStructureId)
    .single()

  if (feeError) throw feeError

  // Get all students in the class
  const { data: students, error: studentsError } = await supabase
    .from("students")
    .select("id")
    .eq("current_class_id", classId)

  if (studentsError) throw studentsError
  if (!students || students.length === 0) return { assigned: 0 }

  // Create student fee records
  const studentFees = students.map(student => ({
    student_id: student.id,
    fee_structure_id: feeStructureId,
    academic_year: academicYear,
    total_amount: feeStructure.amount,
    paid_amount: 0,
    balance_amount: feeStructure.amount,
    due_date: feeStructure.due_date,
    status: "Pending"
  }))

  const { data, error } = await supabase
    .from("student_fees")
    .upsert(studentFees, { onConflict: "student_id,fee_structure_id" })
    .select()

  if (error) throw error
  return { assigned: data?.length || 0 }
}

// Get fee summary for a school (principal/admin dashboard)
export async function getSchoolFeeSummary(schoolId: string) {
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("school_id", schoolId)

  if (!students || students.length === 0) {
    return {
      totalExpected: 0,
      totalCollected: 0,
      totalPending: 0,
      collectionRate: 0,
      byFeeType: []
    }
  }

  const studentIds = students.map(s => s.id)

  const { data: fees } = await supabase
    .from("student_fees")
    .select(`
      *,
      fee_structure:fee_structures(fee_type)
    `)
    .in("student_id", studentIds)

  if (!fees) {
    return {
      totalExpected: 0,
      totalCollected: 0,
      totalPending: 0,
      collectionRate: 0,
      byFeeType: []
    }
  }

  const totalExpected = fees.reduce((sum, f) => sum + (f.total_amount || 0), 0)
  const totalCollected = fees.reduce((sum, f) => sum + (f.paid_amount || 0), 0)
  const totalPending = fees.reduce((sum, f) => sum + (f.balance_amount || 0), 0)
  const collectionRate = totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0

  // Group by fee type
  const feeTypeMap: Record<string, { expected: number; collected: number }> = {}
  fees.forEach(f => {
    const type = f.fee_structure?.fee_type || "Other"
    if (!feeTypeMap[type]) {
      feeTypeMap[type] = { expected: 0, collected: 0 }
    }
    feeTypeMap[type].expected += f.total_amount || 0
    feeTypeMap[type].collected += f.paid_amount || 0
  })

  const byFeeType = Object.entries(feeTypeMap).map(([type, data]) => ({
    type,
    expected: data.expected,
    collected: data.collected,
    rate: data.expected > 0 ? Math.round((data.collected / data.expected) * 100) : 0
  }))

  return {
    totalExpected,
    totalCollected,
    totalPending,
    collectionRate,
    byFeeType
  }
}
