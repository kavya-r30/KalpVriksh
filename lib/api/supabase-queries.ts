import { getSupabaseClient } from "@/lib/supabase"

const supabase = getSupabaseClient()

export { getSupabaseClient }

// Dashboard Stats
export async function getAdminDashboardStats() {
  const [schools, students, teachers, parents] = await Promise.all([
    supabase.from("schools").select("id", { count: "exact", head: true }),
    supabase.from("students").select("id", { count: "exact", head: true }),
    supabase.from("staff").select("id", { count: "exact", head: true }),
    supabase.from("parents").select("id", { count: "exact", head: true }),
  ])

  return {
    totalSchools: schools.count || 0,
    totalStudents: students.count || 0,
    totalTeachers: teachers.count || 0,
    totalParents: parents.count || 0,
  }
}

export async function getPrincipalDashboardStats(schoolId: string) {
  const [students, teachers, classes, attendance] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("staff").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("attendance").select("status").eq("attendance_date", new Date().toISOString().split("T")[0]),
  ])

  const presentToday = attendance.data?.filter((a) => a.status === "Present").length || 0

  return {
    totalStudents: students.count || 0,
    totalTeachers: teachers.count || 0,
    totalClasses: classes.count || 0,
    presentToday,
  }
}

export async function getPrincipalDashboardStatsForUser(userId: string) {
  const staff = await getStaffByUserId(userId)
  const schoolId = staff.school_id

  // Step 1: get all student IDs for this school
  const { data: studentRows } = await supabase.from("students").select("id").eq("school_id", schoolId)

  const studentIds = studentRows?.map((s) => s.id) ?? []

  // Step 2: parallel queries
  const [students, teachers, classes, attendance] = await Promise.all([
    supabase.from("students").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("staff").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    supabase.from("classes").select("id", { count: "exact", head: true }).eq("school_id", schoolId),
    studentIds.length
      ? supabase
          .from("attendance")
          .select("status")
          .eq("attendance_date", new Date().toISOString().split("T")[0])
          .in("student_id", studentIds)
      : { data: [], error: null },
  ])

  const presentToday = attendance.data?.filter((a) => a.status === "Present").length ?? 0

  return {
    totalStudents: students.count ?? 0,
    totalTeachers: teachers.count ?? 0,
    totalClasses: classes.count ?? 0,
    presentToday,
    schoolId,
    staff,
  }
}

// Students
export async function getStudents(schoolId?: string) {
  let query = supabase
    .from("students")
    .select(`
      *,
      current_class:classes(name),
      section:sections(name)
    `)
    .order("created_at", { ascending: false })

  if (schoolId) {
    query = query.eq("school_id", schoolId)
  }

  const { data, error } = await query
  if (error) throw error
  return data
}

export async function getStudentById(id: string) {
  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      current_class:classes(name, grade_level),
      section:sections(name),
      school:schools(id, name, school_code)
    `)
    .eq("id", id)
    .single()

  if (error) throw error
  return data
}

export async function getStudentByUserId(userId: string) {
  const { data, error } = await supabase
    .from("students")
    .select(`
      *,
      current_class:classes(name, grade_level),
      section:sections(name),
      school:schools(name, school_code, id)
    `)
    .eq("user_id", userId)
    .single()

  if (error) throw error
  return data
}

// Attendance
export async function getAttendanceByDate(date: string, classId?: string) {
  let query = supabase
    .from("attendance")
    .select(`
      *,
      student:students(first_name, last_name, roll_number, current_class_id)
    `)
    .eq("attendance_date", date)

  const { data, error } = await query
  if (error) throw error
    if (classId) {
    return data.filter((a) => a.student?.current_class_id === classId)
  }
  return data
}

export async function getStudentAttendance(studentId: string, limit = 30) {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", studentId)
    .order("attendance_date", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

export async function getStudentFullAttendance(studentId: string) {
  const { data, error } = await supabase
    .from("attendance")
    .select("*")
    .eq("student_id", studentId)
    .order("attendance_date", { ascending: false })

  if (error) throw error
  return data
}

export async function getStudentMarks(studentId: string) {
  const { data, error } = await supabase
    .from("marks")
    .select(`
      *,
      exam_schedule:exam_schedule(
        max_marks,
        exam:exams(name, exam_type),
        subject:subjects(name)
      )
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function getExams(schoolId: string) {
  const { data, error } = await supabase
    .from("exams")
    .select("*")
    .eq("school_id", schoolId)
    .order("start_date", { ascending: false })

  if (error) throw error
  return data
}

// Fees
export async function getStudentFees(studentId: string) {
  const { data, error } = await supabase
    .from("student_fees")
    .select(`
      *,
      fee_structure:fee_structures(fee_type, amount)
    `)
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })

  if (error) throw error
  return data
}

export async function getFeePayments(studentId: string) {
  const { data, error } = await supabase
    .from("fee_payments")
    .select(`
      *,
      student_fee:student_fees(total_amount, balance_amount)
    `)
    .eq("student_fee.student_id", studentId)
    .order("payment_date", { ascending: false })

  if (error) throw error
  return data
}

// Schools
export async function getSchools() {
  const { data, error } = await supabase.from("schools").select("*").order("name")

  if (error) throw error
  return data
}

export async function getSchoolById(id: string) {
  const { data, error } = await supabase.from("schools").select("*").eq("id", id).single()

  if (error) throw error
  return data
}

// Classes
export async function getClasses(schoolId: string) {
  const { data, error } = await supabase
    .from("classes")
    .select(`
      *,
      sections(*)
    `)
    .eq("school_id", schoolId)
    .order("grade_level")

  if (error) throw error
  return data
}

// Staff
export async function getStaff(schoolId: string) {
  const { data, error } = await supabase.from("staff").select("*").eq("school_id", schoolId).order("first_name")

  if (error) throw error
  return data
}

export async function getStaffByUserId(userId: string) {
  const { data, error } = await supabase
    .from("staff")
    .select(`
      *,
      school:schools(*),
      user:users(*)
    `)
    .eq("user_id", userId)
    .single()

  if (error) throw error
  return data
}

// Notifications
export async function getNotifications(schoolId: string, limit = 10) {
  const { data, error } = await supabase
    .from("notifications")
    .select("*")
    .eq("school_id", schoolId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) throw error
  return data
}

// Skills
export async function getStudentSkills(studentId: string) {
  const { data, error } = await supabase
    .from("student_skills")
    .select(`
      *,
      skill_category:skill_categories(name)
    `)
    .eq("student_id", studentId)

  if (error) throw error
  return data
}

export async function getStudentCertificates(studentId: string) {
  const { data, error } = await supabase
    .from("certificates")
    .select("*")
    .eq("student_id", studentId)
    .order("issue_date", { ascending: false })

  if (error) throw error
  return data
}

export async function getParentsByStudentId(studentId: string) {
  const { data, error } = await supabase
    .from("student_parents")
    .select(`
      parent:parents(
        id,
        first_name,
        last_name,
        email,
        phone,
        relationship,
        occupation,
        created_at,
        updated_at
      )
    `)
    .eq("student_id", studentId)

  if (error) throw error
  return data?.map((entry: any) => entry.parent) || []
}

// Parents
export async function getParentChildren(parentId: string) {
  const { data, error } = await supabase
    .from("student_parents")
    .select(`
      student:students(
        *,
        current_class:classes(name),
        section:sections(name),
        school:schools(name)
      )
    `)
    .eq("parent_id", parentId)

  if (error) throw error
  return data.map((item) => item.student)
}

export async function getParentChildrenByUserId(userId: string) {
  const parent = await getParentByUserId(userId)

  const { data, error } = await supabase
    .from("student_parents")
    .select(`
      student:students(
        *,
        current_class:classes(name),
        section:sections(name),
        school:schools(name)
      )
    `)
    .eq("parent_id", parent.id)

  if (error) throw error
  return data?.map((item) => item.student) || []
}

export async function getParentByUserId(userId: string) {
  const { data, error } = await supabase
    .from("parents")
    .select(`
      *,
      user:users(*)
    `)
    .eq("user_id", userId)
    .single()

  if (error) throw error
  return data
}

// Users
export async function getUserByUserId(userId: string) {
  const { data, error } = await supabase.from("users").select("*").eq("id", userId).single()

  if (error) throw error
  return data
}

// Teacher-specific queries
export async function getTeacherByUserID(userId: string) {
  const staff = await getStaffByUserId(userId)


  if (error) throw error
  return data
}

export async function getTeacherClasses(userId: string) {
  const staff = await getStaffByUserId(userId)

  const { data, error } = await supabase
    .from("class_subjects")
    .select(`
      *,
      class:classes(*, school:schools(name)),
      subject:subjects(*)
    `)
    .eq("teacher_id", staff.id)

  if (error) throw error
  return data
}

export async function getTeacherAssignments(userId: string) {
  const staff = await getStaffByUserId(userId)

  // First get classes taught by this teacher
  const classes = await getTeacherClasses(userId)
  const classIds = classes?.map((c) => c.class_id) || []

  if (classIds.length === 0) return []

  const { data, error } = await supabase
    .from("assignments")
    .select(`
      *,
      class:classes(name),
      subject:subjects(name)
    `)
    .in("class_id", classIds)
    .order("due_date", { ascending: true })

  if (error) throw error
  return data
}

export async function getTeacherStats(userId: string) {
  const staff = await getStaffByUserId(userId)
  const classes = await getTeacherClasses(userId)

  const uniqueClasses = new Set(classes?.map((c) => c.class_id))

  let totalStudents = 0
  if (classes && classes.length > 0) {
    for (const cls of classes) {
      const { count } = await supabase
        .from("students")
        .select("id", { count: "exact", head: true })
        .eq("current_class_id", cls.class_id)
      totalStudents += count || 0
    }
  }

  return {
    totalClasses: uniqueClasses.size,
    totalStudents,
    totalSubjects: classes?.length || 0,
    staff,
  }
}

// Helper queries for attendance stats
export async function getClassAttendanceStats(classId: string) {
  const { data: students } = await supabase.from("students").select("id").eq("current_class_id", classId)

  if (!students || students.length === 0) return []

  const studentIds = students.map((s) => s.id)

  const { data: attendance } = await supabase
    .from("attendance")
    .select("status, attendance_date")
    .in("student_id", studentIds)
    .gte("attendance_date", new Date(Date.now() - 30 * 24 * 60 * 60 * 1000).toISOString()) // Last 30 days

  return attendance
}

// Helper for class performance stats
export async function getClassPerformanceStats(classId: string) {
  const { data, error } = await supabase
    .from("marks")
    .select(`
      marks_obtained,
      exam_schedule!inner(
        max_marks,
        subject:subjects!inner(name),
        class_id
      )
    `)
    .eq("exam_schedule.class_id", classId)

  if (error) return []
  return data
}

// Helper for class exams
export async function getExamsByClass(classId: string) {
  const { data, error } = await supabase
    .from("exam_schedule")
    .select(`
      id,
      exam_date,
      max_marks,
      exam:exams(id, name, exam_type),
      subject:subjects(id, name)
    `)
    .eq("class_id", classId)
    .order("exam_date", { ascending: false })

  if (error) throw error
  return data
}

// Helper for marks by schedule
export async function getMarksBySchedule(scheduleId: string) {
  const { data, error } = await supabase.from("marks").select("*").eq("exam_schedule_id", scheduleId)

  if (error) throw error
  return data
}

// Helper for skill categories
export async function getSkillCategories() {
  const { data, error } = await supabase.from("skill_categories").select("*").order("name")

  if (error) throw error
  return data
}

// Helper for adding student skill
export async function addStudentSkill(payload: any) {
  const { data, error } = await supabase.from("student_skills").insert(payload).select()

  if (error) throw error
  return data
}

// Helper for updating marks
export async function updateStudentMarks(marks: any[]) {
  const { data, error } = await supabase
    .from("marks")
    .upsert(marks, { onConflict: "exam_schedule_id,student_id" })
    .select()

  if (error) throw error
  return data
}

export async function getUpcomingEvents(studentId: string) {
  try {
    const student = await getStudentById(studentId)

    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("school_id", student.school.id)
      .order("created_at", { ascending: false })
      .limit(5)

    if (error) throw error

    return (data || []).map((notification) => ({
      title: notification.title,
      date: new Date(notification.created_at).toLocaleDateString(),
      type: notification.notification_type || "Announcement",
      color: "border-blue-500",
    }))
  } catch (error) {
    console.error("Error fetching upcoming events:", error)
    return []
  }
}

export async function getTeacherClassPerformance(userId: string) {
  try {
    const staff = await getStaffByUserId(userId)
    const classes = await getTeacherClasses(userId)

    if (!classes || classes.length === 0) return []

    const subjectIds = classes.map((c) => c.subject_id)

    // Get marks for all subjects this teacher teaches
    const { data: marks, error } = await supabase
      .from("marks")
      .select(`
        marks_obtained,
        exam_schedule!inner(
          max_marks,
          subject:subjects!inner(id, name)
        )
      `)
      .in("exam_schedule.subject.id", subjectIds)

    if (error) return []

    // Group by subject and calculate averages
    const subjectStats: Record<string, { total: number; max: number; count: number; maxMark: number }> = {}

    marks?.forEach((mark: any) => {
      const subjectName = mark.exam_schedule?.subject?.name
      if (!subjectName) return

      if (!subjectStats[subjectName]) {
        subjectStats[subjectName] = { total: 0, max: 0, count: 0, maxMark: 0 }
      }

      subjectStats[subjectName].total += mark.marks_obtained || 0
      subjectStats[subjectName].count += 1
      if ((mark.marks_obtained || 0) > subjectStats[subjectName].max) {
        subjectStats[subjectName].max = mark.marks_obtained || 0
        subjectStats[subjectName].maxMark = mark.exam_schedule?.max_marks || 100
      }
    })

    // Format for chart
    return Object.entries(subjectStats).map(([subject, stats]) => ({
      subject: subject.length > 8 ? subject.substring(0, 8) : subject,
      avg: Math.round(stats.total / stats.count),
      max: stats.max,
    }))
  } catch (error) {
    console.error("Error fetching teacher class performance:", error)
    return []
  }
}

export async function getTeacherAttendanceStats(userId: string) {
  try {
    const classes = await getTeacherClasses(userId)
    if (!classes || classes.length === 0) return []

    const classIds = [...new Set(classes.map((c) => c.class_id))]

    // Get all students in teacher's classes
    const { data: students } = await supabase.from("students").select("id").in("current_class_id", classIds)

    if (!students || students.length === 0) return []

    const studentIds = students.map((s) => s.id)

    // Get attendance for last 7 days
    const today = new Date()
    const weekDays = []
    for (let i = 6; i >= 0; i--) {
      const d = new Date(today)
      d.setDate(d.getDate() - i)
      weekDays.push(d)
    }

    const attendancePromises = weekDays.map(async (date) => {
      const dateStr = date.toISOString().split("T")[0]

      const { data, error } = await supabase
        .from("attendance")
        .select("status")
        .eq("attendance_date", dateStr)
        .in("student_id", studentIds)

      if (error) return { day: date.toLocaleDateString("en-US", { weekday: "short" }), rate: 0 }

      const present = data?.filter((a) => a.status === "Present").length ?? 0
      const total = data?.length ?? 1
      const rate = Math.round((present / total) * 100)

      return {
        day: date.toLocaleDateString("en-US", { weekday: "short" }),
        rate: isNaN(rate) ? 0 : rate,
      }
    })

    return await Promise.all(attendancePromises)
  } catch (error) {
    console.error("Error fetching teacher attendance stats:", error)
    return []
  }
}

// Principal-specific queries
export async function getPrincipalUpcomingEvents(schoolId: string) {
  try {
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .eq("school_id", schoolId)
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString())
      .order("created_at", { ascending: false })
      .limit(4)

    if (error) throw error

    return (data || []).map((notification) => ({
      title: notification.title,
      date: new Date(notification.created_at).toLocaleDateString(),
      type: notification.notification_type || "Announcement",
      color:
        notification.notification_type === "Exam"
          ? "border-chart-2"
          : notification.notification_type === "Event"
            ? "border-chart-3"
            : notification.notification_type === "Fee"
              ? "border-chart-4"
              : "border-primary",
    }))
  } catch (error) {
    console.error("Error fetching principal events:", error)
    return []
  }
}

export async function getPrincipalPerformanceStats(schoolId: string) {
  try {
    // Get all classes for this school
    const { data: classes } = await supabase.from("classes").select("id, name").eq("school_id", schoolId).limit(5)

    if (!classes || classes.length === 0) return []

    const performanceData = []

    for (const cls of classes) {
      // Get marks for this class
      const { data: marks } = await supabase
        .from("marks")
        .select(`
          marks_obtained,
          exam_schedule!inner(
            max_marks,
            class_id
          )
        `)
        .eq("exam_schedule.class_id", cls.id)

      if (marks && marks.length > 0) {
        const avgMarks = marks.reduce((sum, m) => sum + (m.marks_obtained || 0), 0) / marks.length
        performanceData.push({
          class: cls.name,
          avg: Math.round(avgMarks),
        })
      }
    }

    return performanceData
  } catch (error) {
    console.error("Error fetching performance stats:", error)
    return []
  }
}

export async function getPrincipalFeeStats(schoolId: string) {
  try {
    // Get all students in the school
    const { data: students } = await supabase.from("students").select("id").eq("school_id", schoolId)

    if (!students || students.length === 0) {
      return { tuition: 0, exam: 0, library: 0 }
    }

    const studentIds = students.map((s) => s.id)

    // Get fee structures for this school
    const { data: feeStructures } = await supabase.from("fee_structures").select("*").eq("school_id", schoolId)

    if (!feeStructures || feeStructures.length === 0) {
      return { tuition: 0, exam: 0, library: 0 }
    }

    // Get student fees
    const { data: studentFees } = await supabase.from("student_fees").select("*").in("student_id", studentIds)

    const calculatePercentage = (feeType: string) => {
      const relevantFees =
        studentFees?.filter((f) => {
          const structure = feeStructures.find((fs) => fs.id === f.fee_structure_id)
          return structure?.fee_type === feeType
        }) || []

      if (relevantFees.length === 0) return 0

      const totalAmount = relevantFees.reduce((sum, f) => sum + (f.total_amount || 0), 0)
      const paidAmount = relevantFees.reduce((sum, f) => sum + (f.paid_amount || 0), 0)

      return totalAmount > 0 ? Math.round((paidAmount / totalAmount) * 100) : 0
    }

    return {
      tuition: calculatePercentage("Tuition"),
      exam: calculatePercentage("Exam"),
      library: calculatePercentage("Library"),
    }
  } catch (error) {
    console.error("Error fetching fee stats:", error)
    return { tuition: 0, exam: 0, library: 0 }
  }
}

export async function getSubjects(schoolId: string) {
  const { data, error } = await supabase
    .from("subjects")
    .select("*")
    .eq("school_id", schoolId)
    .order("name", { ascending: true })

  if (error) throw error
  return data
}