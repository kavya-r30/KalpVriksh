export type UserRole = "admin" | "principal" | "teacher" | "student" | "parent"

export interface User {
  id: string
  email: string
  phone?: string
  role: UserRole
  is_active: boolean
  created_at: string
  updated_at: string
}

export interface School {
  id: string
  name: string
  school_code: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  phone?: string
  email?: string
  principal_id?: string
  board?: "CBSE" | "State" | "ICSE" | "Other"
  created_at: string
  updated_at: string
}

export interface Student {
  id: string
  user_id?: string
  school_id: string
  admission_number: string
  first_name: string
  last_name: string
  date_of_birth?: string
  gender?: "Male" | "Female" | "Other"
  blood_group?: string
  address?: string
  city?: string
  state?: string
  pincode?: string
  current_class_id?: string
  section_id?: string
  roll_number?: string
  aadhar_number?: string
  profile_image_url?: string
  created_at: string
  updated_at: string
}

export interface Staff {
  id: string
  user_id?: string
  school_id: string
  staff_code: string
  first_name: string
  last_name: string
  date_of_birth?: string
  gender?: "Male" | "Female" | "Other"
  designation?: string
  subject_specialization?: string
  created_at: string
  updated_at: string
}

export interface Parent {
  id: string
  user_id?: string
  first_name: string
  last_name: string
  relationship?: "Father" | "Mother" | "Guardian"
  phone?: string
  email?: string
  occupation?: string
  created_at: string
  updated_at: string
}

export interface Class {
  id: string
  school_id: string
  name: string
  grade_level?: number
  academic_year: string
  created_at: string
  updated_at: string
}

export interface Section {
  id: string
  class_id: string
  name: string
  class_teacher_id?: string
  created_at: string
  updated_at: string
}

export interface Subject {
  id: string
  school_id: string
  name: string
  code?: string
  created_at: string
  updated_at: string
}

export interface Attendance {
  id: string
  student_id: string
  attendance_date: string
  status: "Present" | "Absent" | "Late" | "Holiday"
  marked_by?: string
  remarks?: string
  created_at: string
  updated_at: string
}

export interface Exam {
  id: string
  school_id: string
  name: string
  exam_type?: string
  academic_year: string
  start_date?: string
  end_date?: string
  created_at: string
  updated_at: string
}

export interface Marks {
  id: string
  exam_schedule_id: string
  student_id: string
  marks_obtained?: number
  is_absent: boolean
  entered_by?: string
  created_at: string
  updated_at: string
}

export interface StudentFee {
  id: string
  student_id: string
  fee_structure_id: string
  academic_year: string
  total_amount: number
  paid_amount: number
  balance_amount: number
  due_date?: string
  status: "Pending" | "Paid" | "Overdue" | "Partial"
  created_at: string
  updated_at: string
}

export interface FeePayment {
  id: string
  student_fee_id: string
  payment_method?: "UPI" | "Card" | "Cash" | "NetBanking" | "Cheque"
  transaction_id?: string
  payment_date: string
  amount: number
  payment_status: "Success" | "Failed" | "Pending"
  receipt_number: string
  receipt_pdf_url?: string
  paid_by?: string
  created_at: string
  updated_at: string
}

export interface Notification {
  id: string
  school_id: string
  title: string
  message: string
  notification_type?: "Announcement" | "Fee" | "Exam" | "Attendance" | "Other"
  target_audience?: "All" | "Students" | "Parents" | "Teachers" | "Staff"
  class_id?: string
  sent_by?: string
  created_at: string
  updated_at: string
}

export interface StudentSkill {
  id: string
  student_id: string
  skill_category_id: string
  skill_name: string
  proficiency_level?: "Beginner" | "Intermediate" | "Advanced"
  certificate_url?: string
  verified_by?: string
  created_at: string
  updated_at: string
}

export interface Certificate {
  id: string
  student_id: string
  certificate_type: "TC" | "Character" | "Bonafide" | "Other"
  certificate_number: string
  issue_date: string
  issued_by?: string
  pdf_url?: string
  verification_code?: string
  created_at: string
  updated_at: string
}
