import { getSupabaseClient } from "@/lib/supabase"

const supabase = getSupabaseClient()

// Types for certificate generation
export interface ReportCardData {
  student: {
    id: string
    first_name: string
    last_name: string
    admission_number: string
    roll_number: string
    date_of_birth: string
    gender: string
    profile_image_url?: string
  }
  school: {
    id: string
    name: string
    address: string
    city: string
    state: string
    phone: string
    email: string
    board: string
  }
  class: {
    name: string
    grade_level: number
    section: string
  }
  exam: {
    id: string
    name: string
    exam_type: string
    academic_year: string
  }
  subjects: {
    name: string
    code: string
    max_marks: number
    marks_obtained: number
    grade: string
    remarks: string
  }[]
  summary: {
    total_marks: number
    marks_obtained: number
    percentage: number
    grade: string
    rank: number
    attendance_percentage: number
    teacher_remarks: string
  }
  parent: {
    name: string
    relationship: string
  }
}

export interface CertificateData {
  student: {
    id: string
    first_name: string
    last_name: string
    admission_number: string
    date_of_birth: string
    gender: string
    address: string
    city: string
    state: string
    pincode: string
    aadhar_number?: string
    roll_number: string
  }
  school: {
    id: string
    name: string
    address: string
    city: string
    state: string
    phone: string
    email: string
    board: string
    school_code: string
  }
  class: {
    name: string
    grade_level: number
    section: string
    academic_year: string
  }
  parent: {
    father_name: string
    mother_name: string
    guardian_name?: string
  }
  certificate: {
    type: "Bonafide" | "Character" | "Transfer" | "Caste" | "Leaving" | "Migration"
    number: string
    issue_date: string
    verification_code: string
    purpose?: string
    valid_until?: string
  }
  additional?: {
    caste?: string
    religion?: string
    nationality?: string
    conduct?: string
    leaving_reason?: string
    last_attended_date?: string
    fees_paid_till?: string
    tc_number?: string
    admission_date?: string
  }
}

// Calculate grade based on percentage
export function calculateGrade(percentage: number): string {
  if (percentage >= 90) return "A+"
  if (percentage >= 80) return "A"
  if (percentage >= 70) return "B+"
  if (percentage >= 60) return "B"
  if (percentage >= 50) return "C+"
  if (percentage >= 40) return "C"
  if (percentage >= 33) return "D"
  return "F"
}

// Generate unique certificate number
export function generateCertificateNumber(type: string, schoolCode: string): string {
  const prefix = type.substring(0, 3).toUpperCase()
  const year = new Date().getFullYear().toString().slice(-2)
  const random = Math.floor(Math.random() * 10000).toString().padStart(4, "0")
  return `${schoolCode}-${prefix}-${year}-${random}`
}

// Generate verification code
export function generateVerificationCode(): string {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789"
  let code = ""
  for (let i = 0; i < 8; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

// Fetch report card data for a student and exam
export async function getReportCardData(studentId: string, examId: string): Promise<ReportCardData | null> {
  try {
    // Get student details with school and class info
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select(`
        *,
        school:schools(*),
        current_class:classes(*),
        section:sections(name)
      `)
      .eq("id", studentId)
      .single()

    if (studentError || !student) return null

    // Get exam details
    const { data: exam, error: examError } = await supabase
      .from("exams")
      .select("*")
      .eq("id", examId)
      .single()

    if (examError || !exam) return null

    // Get marks for this student and exam
    const { data: marks, error: marksError } = await supabase
      .from("marks")
      .select(`
        *,
        exam_schedule:exam_schedule!inner(
          max_marks,
          min_passing_marks,
          exam_id,
          subject:subjects(name, code)
        )
      `)
      .eq("student_id", studentId)
      .eq("exam_schedule.exam_id", examId)

    if (marksError) return null

    // Get parent info
    const { data: parents } = await supabase
      .from("student_parents")
      .select(`
        parent:parents(first_name, last_name, relationship)
      `)
      .eq("student_id", studentId)
      .eq("is_primary_contact", true)
      .single()

    // Get attendance stats for the academic year
    const { data: attendance } = await supabase
      .from("attendance")
      .select("status")
      .eq("student_id", studentId)

    const totalDays = attendance?.length || 1
    const presentDays = attendance?.filter(a => a.status === "Present").length || 0
    const attendancePercentage = Math.round((presentDays / totalDays) * 100)

    // Calculate subject-wise grades and totals
    const subjects = (marks || []).map(mark => {
      const maxMarks = mark.exam_schedule?.max_marks || 100
      const obtained = mark.marks_obtained || 0
      const percentage = (obtained / maxMarks) * 100
      return {
        name: mark.exam_schedule?.subject?.name || "Unknown",
        code: mark.exam_schedule?.subject?.code || "",
        max_marks: maxMarks,
        marks_obtained: obtained,
        grade: calculateGrade(percentage),
        remarks: mark.is_absent ? "Absent" : percentage >= 40 ? "Pass" : "Fail"
      }
    })

    // Calculate summary
    const totalMarks = subjects.reduce((sum, s) => sum + s.max_marks, 0)
    const marksObtained = subjects.reduce((sum, s) => sum + s.marks_obtained, 0)
    const percentage = totalMarks > 0 ? Math.round((marksObtained / totalMarks) * 100) : 0

    // Get rank (count students with higher percentage in same class and exam)
    const { count: higherCount } = await supabase
      .from("report_cards")
      .select("*", { count: "exact", head: true })
      .eq("exam_id", examId)
      .gt("percentage", percentage)

    const rank = (higherCount || 0) + 1

    return {
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        admission_number: student.admission_number,
        roll_number: student.roll_number || "",
        date_of_birth: student.date_of_birth,
        gender: student.gender,
        profile_image_url: student.profile_image_url
      },
      school: {
        id: student.school?.id,
        name: student.school?.name || "",
        address: student.school?.address || "",
        city: student.school?.city || "",
        state: student.school?.state || "",
        phone: student.school?.phone || "",
        email: student.school?.email || "",
        board: student.school?.board || ""
      },
      class: {
        name: student.current_class?.name || "",
        grade_level: student.current_class?.grade_level || 0,
        section: student.section?.name || ""
      },
      exam: {
        id: exam.id,
        name: exam.name,
        exam_type: exam.exam_type || "",
        academic_year: exam.academic_year
      },
      subjects,
      summary: {
        total_marks: totalMarks,
        marks_obtained: marksObtained,
        percentage,
        grade: calculateGrade(percentage),
        rank,
        attendance_percentage: attendancePercentage,
        teacher_remarks: ""
      },
      parent: {
        name: parents?.parent ? `${parents.parent.first_name} ${parents.parent.last_name}` : "",
        relationship: parents?.parent?.relationship || ""
      }
    }
  } catch (error) {
    console.error("Error fetching report card data:", error)
    return null
  }
}

// Fetch certificate data for a student
export async function getCertificateData(studentId: string, certificateType: string): Promise<CertificateData | null> {
  try {
    // Get student details with school and class info
    const { data: student, error: studentError } = await supabase
      .from("students")
      .select(`
        *,
        school:schools(*),
        current_class:classes(*),
        section:sections(name)
      `)
      .eq("id", studentId)
      .single()

    if (studentError || !student) return null

    // Get all parents
    const { data: parentsData } = await supabase
      .from("student_parents")
      .select(`
        parent:parents(first_name, last_name, relationship)
      `)
      .eq("student_id", studentId)

    const parents = parentsData || []
    const father = parents.find(p => p.parent?.relationship === "Father")
    const mother = parents.find(p => p.parent?.relationship === "Mother")
    const guardian = parents.find(p => p.parent?.relationship === "Guardian")

    return {
      student: {
        id: student.id,
        first_name: student.first_name,
        last_name: student.last_name,
        admission_number: student.admission_number,
        date_of_birth: student.date_of_birth,
        gender: student.gender,
        address: student.address || "",
        city: student.city || "",
        state: student.state || "",
        pincode: student.pincode || "",
        aadhar_number: student.aadhar_number,
        roll_number: student.roll_number || ""
      },
      school: {
        id: student.school?.id,
        name: student.school?.name || "",
        address: student.school?.address || "",
        city: student.school?.city || "",
        state: student.school?.state || "",
        phone: student.school?.phone || "",
        email: student.school?.email || "",
        board: student.school?.board || "",
        school_code: student.school?.school_code || ""
      },
      class: {
        name: student.current_class?.name || "",
        grade_level: student.current_class?.grade_level || 0,
        section: student.section?.name || "",
        academic_year: student.current_class?.academic_year || ""
      },
      parent: {
        father_name: father?.parent ? `${father.parent.first_name} ${father.parent.last_name}` : "",
        mother_name: mother?.parent ? `${mother.parent.first_name} ${mother.parent.last_name}` : "",
        guardian_name: guardian?.parent ? `${guardian.parent.first_name} ${guardian.parent.last_name}` : undefined
      },
      certificate: {
        type: certificateType as CertificateData["certificate"]["type"],
        number: generateCertificateNumber(certificateType, student.school?.school_code || "SCH"),
        issue_date: new Date().toISOString().split("T")[0],
        verification_code: generateVerificationCode()
      }
    }
  } catch (error) {
    console.error("Error fetching certificate data:", error)
    return null
  }
}

// Save generated certificate to database
export async function saveCertificate(
  studentId: string,
  certificateType: string,
  certificateNumber: string,
  verificationCode: string,
  issuedBy: string,
  pdfUrl?: string,
  pdfBlob?: Uint8Array
) {
  // Map certificate types to match DB constraint: 'TC', 'Character', 'Bonafide', 'Other'
  const dbCertificateType = mapCertificateTypeForDB(certificateType)

  const { data, error } = await supabase
    .from("certificates")
    .insert({
      student_id: studentId,
      certificate_type: dbCertificateType,
      certificate_number: certificateNumber,
      issue_date: new Date().toISOString().split("T")[0],
      issued_by: issuedBy,
      pdf_url: pdfUrl,
      verification_code: verificationCode,
      pdf_blob: pdfBlob ? Array.from(pdfBlob) : null,
      blob_mime_type: pdfBlob ? "application/pdf" : null
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Map display certificate types to DB-compatible types
function mapCertificateTypeForDB(type: string): string {
  const typeMap: Record<string, string> = {
    "Bonafide": "Bonafide",
    "bonafide": "Bonafide",
    "Character": "Character",
    "character": "Character",
    "Leaving": "TC",
    "leaving": "TC",
    "TC": "TC",
    "tc": "TC",
    "Transfer": "TC",
    "transfer": "TC",
    "Caste": "Other",
    "caste": "Other",
    "Migration": "Other",
    "migration": "Other"
  }
  return typeMap[type] || "Other"
}

// Save certificate with PDF blob from HTML content
export async function saveCertificateWithBlob(
  studentId: string,
  certificateType: string,
  certificateNumber: string,
  verificationCode: string,
  issuedBy: string,
  htmlContent: string
): Promise<any> {
  // For now, we'll save without the blob since we need a server-side PDF generator
  // The HTML content can be stored as base64 for later PDF generation
  const base64Html = btoa(unescape(encodeURIComponent(htmlContent)))

  const dbCertificateType = mapCertificateTypeForDB(certificateType)

  const { data, error } = await supabase
    .from("certificates")
    .insert({
      student_id: studentId,
      certificate_type: dbCertificateType,
      certificate_number: certificateNumber,
      issue_date: new Date().toISOString().split("T")[0],
      issued_by: issuedBy,
      verification_code: verificationCode,
      // Store the HTML content as a data URL for now
      pdf_url: `data:text/html;base64,${base64Html}`
    })
    .select()
    .single()

  if (error) throw error
  return data
}

// Get certificate by ID with blob
export async function getCertificateById(certificateId: string) {
  const { data, error } = await supabase
    .from("certificates")
    .select(`
      *,
      student:students(
        id,
        first_name,
        last_name,
        admission_number,
        current_class:classes(name),
        section:sections(name)
      )
    `)
    .eq("id", certificateId)
    .single()

  if (error) throw error
  return data
}

// Get all certificates for a student
export async function getStudentCertificates(studentId: string) {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("student_id", studentId)
    .order("issue_date", { ascending: false })

  if (error) throw error
  return data || []
}

// Save report card to database
export async function saveReportCard(
  studentId: string,
  examId: string,
  totalMarks: number,
  marksObtained: number,
  percentage: number,
  grade: string,
  rank: number,
  teacherRemarks: string,
  pdfUrl?: string
) {
  const { data, error } = await supabase
    .from("report_cards")
    .upsert({
      student_id: studentId,
      exam_id: examId,
      total_marks: totalMarks,
      marks_obtained: marksObtained,
      percentage,
      grade,
      rank,
      teacher_remarks: teacherRemarks,
      pdf_url: pdfUrl
    }, { onConflict: "student_id,exam_id" })
    .select()
    .single()

  if (error) throw error
  return data
}

// Get students by class for bulk certificate generation
export async function getStudentsByClass(classId: string) {
  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      section:sections(name)
    `)
    .eq("current_class_id", classId)
    .order("roll_number")

  if (error) throw error
  return data
}

// Get all exams for a school
export async function getSchoolExams(schoolId: string) {
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false })

  if (error) throw error
  return data
}
