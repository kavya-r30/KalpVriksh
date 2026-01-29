import { getSupabaseClient } from "@/lib/supabase"

const supabase = getSupabaseClient()

// =============================================
// ATTENDANCE REPORTS
// =============================================

export interface AttendanceReportData {
  date: string
  totalStudents: number
  present: number
  absent: number
  late: number
  attendancePercentage: number
}

export interface StudentAttendanceSummary {
  studentId: string
  studentName: string
  admissionNumber: string
  className: string
  section: string
  totalDays: number
  presentDays: number
  absentDays: number
  lateDays: number
  percentage: number
}

// Get daily attendance report
export async function getDailyAttendanceReport(
  schoolId: string,
  date: string,
  classId?: string
): Promise<AttendanceReportData> {
  let query = supabase
    .from("attendance")
    .select(`
      *,
      student:students(id, school_id, current_class_id)
    `)
    .eq("attendance_date", date)

  const { data } = await query

  // Filter by school
  const filtered = (data || []).filter(
    (a: any) => a.student?.school_id === schoolId &&
    (!classId || a.student?.current_class_id === classId)
  )

  const present = filtered.filter((a: any) => a.status === "Present").length
  const absent = filtered.filter((a: any) => a.status === "Absent").length
  const late = filtered.filter((a: any) => a.status === "Late").length
  const total = filtered.length

  return {
    date,
    totalStudents: total,
    present,
    absent,
    late,
    attendancePercentage: total > 0 ? Math.round((present / total) * 100) : 0,
  }
}

// Get monthly attendance summary
export async function getMonthlyAttendanceReport(
  schoolId: string,
  year: number,
  month: number,
  classId?: string
): Promise<AttendanceReportData[]> {
  const startDate = `${year}-${String(month).padStart(2, "0")}-01`
  const endDate = `${year}-${String(month).padStart(2, "0")}-31`

  const { data } = await supabase
    .from("attendance")
    .select(`
      *,
      student:students(id, school_id, current_class_id)
    `)
    .gte("attendance_date", startDate)
    .lte("attendance_date", endDate)

  // Group by date
  const dateMap = new Map<string, any[]>()
  const filtered = (data || []).filter(
    (a: any) => a.student?.school_id === schoolId &&
    (!classId || a.student?.current_class_id === classId)
  )

  filtered.forEach((record: any) => {
    const dateKey = record.attendance_date
    if (!dateMap.has(dateKey)) {
      dateMap.set(dateKey, [])
    }
    dateMap.get(dateKey)!.push(record)
  })

  const report: AttendanceReportData[] = []
  dateMap.forEach((records, date) => {
    const present = records.filter((a: any) => a.status === "Present").length
    const absent = records.filter((a: any) => a.status === "Absent").length
    const late = records.filter((a: any) => a.status === "Late").length
    const total = records.length

    report.push({
      date,
      totalStudents: total,
      present,
      absent,
      late,
      attendancePercentage: total > 0 ? Math.round((present / total) * 100) : 0,
    })
  })

  return report.sort((a, b) => a.date.localeCompare(b.date))
}

// Get attendance defaulters (students with low attendance)
export async function getAttendanceDefaulters(
  schoolId: string,
  threshold: number = 75,
  startDate?: string,
  endDate?: string
): Promise<StudentAttendanceSummary[]> {
  const today = new Date()
  const thirtyDaysAgo = new Date(today.getTime() - 30 * 24 * 60 * 60 * 1000)

  const queryStartDate = startDate || thirtyDaysAgo.toISOString().split("T")[0]
  const queryEndDate = endDate || today.toISOString().split("T")[0]

  const { data: students } = await supabase
    .from("students")
    .select(`
      id,
      first_name,
      last_name,
      admission_number,
      current_class:classes(name),
      section:sections(name)
    `)
    .eq("school_id", schoolId)

  const { data: attendance } = await supabase
    .from("attendance")
    .select("student_id, status")
    .gte("attendance_date", queryStartDate)
    .lte("attendance_date", queryEndDate)

  // Calculate attendance per student
  const studentMap = new Map<string, StudentAttendanceSummary>()

  students?.forEach((student: any) => {
    studentMap.set(student.id, {
      studentId: student.id,
      studentName: `${student.first_name} ${student.last_name}`,
      admissionNumber: student.admission_number,
      className: student.current_class?.name || "N/A",
      section: student.section?.name || "",
      totalDays: 0,
      presentDays: 0,
      absentDays: 0,
      lateDays: 0,
      percentage: 0,
    })
  })

  attendance?.forEach((record: any) => {
    const summary = studentMap.get(record.student_id)
    if (summary) {
      summary.totalDays++
      if (record.status === "Present") summary.presentDays++
      else if (record.status === "Absent") summary.absentDays++
      else if (record.status === "Late") summary.lateDays++
    }
  })

  // Calculate percentages and filter defaulters
  const defaulters: StudentAttendanceSummary[] = []
  studentMap.forEach((summary) => {
    if (summary.totalDays > 0) {
      summary.percentage = Math.round((summary.presentDays / summary.totalDays) * 100)
      if (summary.percentage < threshold) {
        defaulters.push(summary)
      }
    }
  })

  return defaulters.sort((a, b) => a.percentage - b.percentage)
}

// =============================================
// ACADEMIC REPORTS
// =============================================

export interface ExamResultSummary {
  examId: string
  examName: string
  className: string
  totalStudents: number
  passed: number
  failed: number
  highestMarks: number
  lowestMarks: number
  averageMarks: number
  passPercentage: number
}

export interface StudentPerformance {
  studentId: string
  studentName: string
  admissionNumber: string
  className: string
  totalMarks: number
  marksObtained: number
  percentage: number
  grade: string
  rank: number
}

// Get exam results summary
export async function getExamResultsSummary(
  schoolId: string,
  examId: string
): Promise<ExamResultSummary | null> {
  const { data: exam } = await supabase
    .from("exams")
    .select("id, name")
    .eq("id", examId)
    .single()

  if (!exam) return null

  const { data: reportCards } = await supabase
    .from("report_cards")
    .select(`
      *,
      student:students(id, school_id, current_class:classes(name))
    `)
    .eq("exam_id", examId)

  const filtered = (reportCards || []).filter(
    (r: any) => r.student?.school_id === schoolId
  )

  if (filtered.length === 0) return null

  const percentages = filtered.map((r: any) => r.percentage || 0)
  const passed = filtered.filter((r: any) => r.percentage >= 33).length

  return {
    examId: exam.id,
    examName: exam.name,
    className: filtered[0]?.student?.current_class?.name || "Various",
    totalStudents: filtered.length,
    passed,
    failed: filtered.length - passed,
    highestMarks: Math.max(...percentages),
    lowestMarks: Math.min(...percentages),
    averageMarks: Math.round(percentages.reduce((a: number, b: number) => a + b, 0) / percentages.length),
    passPercentage: Math.round((passed / filtered.length) * 100),
  }
}

// Get top performers
export async function getTopPerformers(
  schoolId: string,
  examId: string,
  limit: number = 10
): Promise<StudentPerformance[]> {
  const { data: reportCards } = await supabase
    .from("report_cards")
    .select(`
      *,
      student:students(
        id,
        first_name,
        last_name,
        admission_number,
        school_id,
        current_class:classes(name)
      )
    `)
    .eq("exam_id", examId)
    .order("percentage", { ascending: false })
    .limit(limit * 2) // Get more to filter by school

  const filtered = (reportCards || [])
    .filter((r: any) => r.student?.school_id === schoolId)
    .slice(0, limit)

  return filtered.map((r: any, index: number) => ({
    studentId: r.student?.id,
    studentName: `${r.student?.first_name} ${r.student?.last_name}`,
    admissionNumber: r.student?.admission_number,
    className: r.student?.current_class?.name || "N/A",
    totalMarks: r.total_marks,
    marksObtained: r.marks_obtained,
    percentage: r.percentage,
    grade: r.grade || calculateGrade(r.percentage),
    rank: index + 1,
  }))
}

// =============================================
// FEE REPORTS
// =============================================

export interface FeeCollectionSummary {
  totalExpected: number
  totalCollected: number
  totalPending: number
  collectionPercentage: number
  byFeeType: {
    feeType: string
    expected: number
    collected: number
    pending: number
  }[]
}

export interface PendingFeeStudent {
  studentId: string
  studentName: string
  admissionNumber: string
  className: string
  feeType: string
  totalAmount: number
  paidAmount: number
  pendingAmount: number
  dueDate: string
  daysOverdue: number
}

// Get fee collection summary
export async function getFeeCollectionSummary(
  schoolId: string,
  academicYear?: string
): Promise<FeeCollectionSummary> {
  // First get all students in the school
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("school_id", schoolId)

  if (!students || students.length === 0) {
    return {
      totalExpected: 0,
      totalCollected: 0,
      totalPending: 0,
      collectionPercentage: 0,
      byFeeType: [],
    }
  }

  const studentIds = students.map((s: { id: string }) => s.id)

  // Query student_fees for these students
  let query = supabase
    .from("student_fees")
    .select(`
      *,
      fee_structure:fee_structures(fee_type)
    `)
    .in("student_id", studentIds)

  // Only filter by academic year if provided
  if (academicYear) {
    query = query.eq("academic_year", academicYear)
  }

  const { data: studentFees } = await query

  const feesList = studentFees || []

  const totalExpected = feesList.reduce((sum: number, f: any) => sum + (f.total_amount || 0), 0)
  const totalCollected = feesList.reduce((sum: number, f: any) => sum + (f.paid_amount || 0), 0)
  const totalPending = totalExpected - totalCollected

  // Group by fee type
  const byTypeMap = new Map<string, { expected: number; collected: number }>()
  feesList.forEach((f: any) => {
    const type = f.fee_structure?.fee_type || "Other"
    const current = byTypeMap.get(type) || { expected: 0, collected: 0 }
    byTypeMap.set(type, {
      expected: current.expected + (f.total_amount || 0),
      collected: current.collected + (f.paid_amount || 0),
    })
  })

  const byFeeType = Array.from(byTypeMap.entries()).map(([feeType, data]) => ({
    feeType,
    expected: data.expected,
    collected: data.collected,
    pending: data.expected - data.collected,
  }))

  return {
    totalExpected,
    totalCollected,
    totalPending,
    collectionPercentage: totalExpected > 0 ? Math.round((totalCollected / totalExpected) * 100) : 0,
    byFeeType,
  }
}

// Get pending fee students
export async function getPendingFeeStudents(
  schoolId: string,
  academicYear?: string
): Promise<PendingFeeStudent[]> {
  // First get all students in the school with their details
  const { data: students } = await supabase
    .from("students")
    .select(`
      id,
      first_name,
      last_name,
      admission_number,
      current_class:classes(name)
    `)
    .eq("school_id", schoolId)

  if (!students || students.length === 0) {
    return []
  }

  const studentIds = students.map((s: any) => s.id)
  const studentMap = new Map<string, any>(students.map((s: any) => [s.id, s]))

  // Query student_fees for these students with pending balance
  let query = supabase
    .from("student_fees")
    .select(`
      *,
      fee_structure:fee_structures(fee_type)
    `)
    .in("student_id", studentIds)
    .gt("balance_amount", 0)

  // Only filter by academic year if provided
  if (academicYear) {
    query = query.eq("academic_year", academicYear)
  }

  const { data: studentFees } = await query

  const feesList = studentFees || []
  const today = new Date()

  return feesList.map((f: any) => {
    const student = studentMap.get(f.student_id)
    const dueDate = new Date(f.due_date)
    const daysOverdue = Math.max(0, Math.floor((today.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24)))

    return {
      studentId: f.student_id,
      studentName: student ? `${student.first_name} ${student.last_name}` : "Unknown",
      admissionNumber: student?.admission_number || "N/A",
      className: student?.current_class?.name || "N/A",
      feeType: f.fee_structure?.fee_type || "Other",
      totalAmount: f.total_amount,
      paidAmount: f.paid_amount,
      pendingAmount: f.balance_amount,
      dueDate: f.due_date,
      daysOverdue,
    }
  }).sort((a: PendingFeeStudent, b: PendingFeeStudent) => b.daysOverdue - a.daysOverdue)
}

// =============================================
// STAFF REPORTS
// =============================================

export interface StaffSummary {
  totalStaff: number
  teachers: number
  adminStaff: number
  byDepartment: { department: string; count: number }[]
  byDesignation: { designation: string; count: number }[]
}

// Get staff summary
export async function getStaffSummary(schoolId: string): Promise<StaffSummary> {
  const { data: staff } = await supabase
    .from("staff")
    .select("*")
    .eq("school_id", schoolId)

  const staffList = staff || []

  const byDepartmentMap = new Map<string, number>()
  const byDesignationMap = new Map<string, number>()

  let teachers = 0
  let adminStaff = 0

  staffList.forEach((s: any) => {
    // Count by role
    if (s.role === "Teacher" || s.designation?.toLowerCase().includes("teacher")) {
      teachers++
    } else {
      adminStaff++
    }

    // Group by department
    const dept = s.department || "Unassigned"
    byDepartmentMap.set(dept, (byDepartmentMap.get(dept) || 0) + 1)

    // Group by designation
    const desig = s.designation || "Unassigned"
    byDesignationMap.set(desig, (byDesignationMap.get(desig) || 0) + 1)
  })

  return {
    totalStaff: staffList.length,
    teachers,
    adminStaff,
    byDepartment: Array.from(byDepartmentMap.entries())
      .map(([department, count]) => ({ department, count }))
      .sort((a, b) => b.count - a.count),
    byDesignation: Array.from(byDesignationMap.entries())
      .map(([designation, count]) => ({ designation, count }))
      .sort((a, b) => b.count - a.count),
  }
}

// =============================================
// STUDENT REPORTS
// =============================================

export interface StudentEnrollmentSummary {
  totalStudents: number
  male: number
  female: number
  other: number
  byClass: { className: string; count: number }[]
  bySection: { className: string; section: string; count: number }[]
}

// Get student enrollment summary
export async function getStudentEnrollmentSummary(schoolId: string): Promise<StudentEnrollmentSummary> {
  const { data: students } = await supabase
    .from("students")
    .select(`
      id,
      gender,
      current_class:classes(name),
      section:sections(name)
    `)
    .eq("school_id", schoolId)

  const studentList = students || []

  const byClassMap = new Map<string, number>()
  const bySectionMap = new Map<string, { className: string; section: string; count: number }>()

  let male = 0
  let female = 0
  let other = 0

  studentList.forEach((s: any) => {
    // Count by gender
    if (s.gender === "Male") male++
    else if (s.gender === "Female") female++
    else other++

    // Group by class
    const className = s.current_class?.name || "Unassigned"
    byClassMap.set(className, (byClassMap.get(className) || 0) + 1)

    // Group by section
    const sectionName = s.section?.name || "No Section"
    const key = `${className}-${sectionName}`
    if (!bySectionMap.has(key)) {
      bySectionMap.set(key, { className, section: sectionName, count: 0 })
    }
    bySectionMap.get(key)!.count++
  })

  return {
    totalStudents: studentList.length,
    male,
    female,
    other,
    byClass: Array.from(byClassMap.entries())
      .map(([className, count]) => ({ className, count }))
      .sort((a, b) => a.className.localeCompare(b.className)),
    bySection: Array.from(bySectionMap.values())
      .sort((a, b) => a.className.localeCompare(b.className) || a.section.localeCompare(b.section)),
  }
}

// Helper function
function calculateGrade(percentage: number): string {
  if (percentage >= 90) return "A+"
  if (percentage >= 80) return "A"
  if (percentage >= 70) return "B+"
  if (percentage >= 60) return "B"
  if (percentage >= 50) return "C+"
  if (percentage >= 40) return "C"
  if (percentage >= 33) return "D"
  return "F"
}

// Export report to CSV format
export function exportToCSV(data: any[], _filename?: string): string {
  if (data.length === 0) return ""

  const headers = Object.keys(data[0])
  const csvRows = [headers.join(",")]

  data.forEach((row) => {
    const values = headers.map((header) => {
      const value = row[header]
      return typeof value === "string" && value.includes(",")
        ? `"${value}"`
        : value
    })
    csvRows.push(values.join(","))
  })

  return csvRows.join("\n")
}
