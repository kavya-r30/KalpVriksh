import { getSupabaseClient } from "@/lib/supabase"

// Database-compatible notification types (CHECK constraint)
export type DBNotificationType = "Announcement" | "Fee" | "Exam" | "Attendance" | "Other"

// Database-compatible target audiences (CHECK constraint)
export type DBTargetAudience = "All" | "Students" | "Parents" | "Teachers" | "Staff"

// Legacy types for backward compatibility (mapped to DB types)
export type NotificationType =
  | "report_card"
  | "low_attendance"
  | "fee_reminder"
  | "fee_overdue"
  | "certificate_ready"
  | "exam_result"
  | "announcement"
  | "admin_announcement"
  | DBNotificationType

export type TargetAudience = "all" | "students" | "parents" | "teachers" | "class" | "individual" | DBTargetAudience

// Map legacy notification types to DB-compatible types
function mapNotificationTypeForDB(type: NotificationType): DBNotificationType {
  const typeMap: Record<string, DBNotificationType> = {
    "report_card": "Exam",
    "exam_result": "Exam",
    "low_attendance": "Attendance",
    "fee_reminder": "Fee",
    "fee_overdue": "Fee",
    "certificate_ready": "Other",
    "announcement": "Announcement",
    "admin_announcement": "Announcement",
    // Direct DB types
    "Announcement": "Announcement",
    "Fee": "Fee",
    "Exam": "Exam",
    "Attendance": "Attendance",
    "Other": "Other"
  }
  return typeMap[type] || "Other"
}

// Map legacy target audiences to DB-compatible types
function mapTargetAudienceForDB(audience: TargetAudience): DBTargetAudience {
  const audienceMap: Record<string, DBTargetAudience> = {
    "all": "All",
    "students": "Students",
    "parents": "Parents",
    "teachers": "Teachers",
    "class": "Students", // Class notifications go to students
    "individual": "Students", // Individual notifications default to Students
    // Direct DB types
    "All": "All",
    "Students": "Students",
    "Parents": "Parents",
    "Teachers": "Teachers",
    "Staff": "Staff"
  }
  return audienceMap[audience] || "All"
}

// Helper function to get staff ID from user ID
async function getStaffIdFromUserId(userId: string): Promise<string | null> {
  const supabase = getSupabaseClient()
  const { data, error } = await supabase
    .from("staff")
    .select("id")
    .eq("user_id", userId)
    .single()

  if (error || !data) {
    console.warn("[Notification Service] Could not find staff ID for user:", userId)
    return null
  }
  return data.id
}

// Resolve staff ID - checks if it's already a staff ID, otherwise converts from user ID
async function resolveStaffId(idValue: string): Promise<string | null> {
  if (!idValue) return null

  const supabase = getSupabaseClient()

  // First check if it's already a staff ID
  const { data: staffCheck } = await supabase
    .from("staff")
    .select("id")
    .eq("id", idValue)
    .single()

  if (staffCheck) {
    return staffCheck.id
  }

  // Try to find staff by user_id
  const staffId = await getStaffIdFromUserId(idValue)
  return staffId
}

export interface NotificationPayload {
  school_id: string
  title: string
  message: string
  notification_type: NotificationType
  target_audience: TargetAudience
  sent_by: string // Can be user_id or staff_id - will be converted to staff_id
  class_id?: string
}

export interface Notification {
  id: string
  school_id: string
  title: string
  message: string
  notification_type: NotificationType
  target_audience: string
  class_id?: string
  sent_by: string
  created_at: string
}

export interface NotificationRecipient {
  id: string
  notification_id: string
  user_id: string
  is_read: boolean
  read_at?: string
  created_at: string
  notification?: Notification
}

// Send notification directly via Supabase
export async function sendNotification(payload: NotificationPayload): Promise<{ success: boolean; id?: string; error?: string }> {
  const supabase = getSupabaseClient()

  try {
    // Convert sent_by from user_id to staff_id if needed
    let staffId = payload.sent_by

    // Check if sent_by is already a staff_id by trying to find it in staff table
    const { data: staffCheck } = await supabase
      .from("staff")
      .select("id")
      .eq("id", payload.sent_by)
      .single()

    if (!staffCheck) {
      // It's likely a user_id, try to get the staff_id
      const resolvedStaffId = await getStaffIdFromUserId(payload.sent_by)
      if (resolvedStaffId) {
        staffId = resolvedStaffId
      } else {
        // If we can't find a staff record, we need to skip the sent_by field
        // or the insert will fail due to foreign key constraint
        console.warn("[Notification Service] No staff record found for user, setting sent_by to null")
        staffId = ""
      }
    }

    // Map notification type and target audience to DB-compatible values
    const dbNotificationType = mapNotificationTypeForDB(payload.notification_type)
    const dbTargetAudience = mapTargetAudienceForDB(payload.target_audience)

    const { data: notification, error: notifError } = await supabase
      .from("notifications")
      .insert({
        school_id: payload.school_id,
        title: payload.title,
        message: payload.message,
        notification_type: dbNotificationType,
        target_audience: dbTargetAudience,
        sent_by: staffId || null,
        class_id: payload.class_id || null,
      })
      .select()
      .single()

    if (notifError || !notification) {
      throw new Error(notifError?.message || "Failed to create notification")
    }

    // Add recipients based on target audience
    await addNotificationRecipients(notification.id, payload)

    return { success: true, id: notification.id }
  } catch (error) {
    console.error("[Notification Service] Error sending notification:", error)
    return { success: false, error: String(error) }
  }
}

// Add recipients based on target audience
async function addNotificationRecipients(notificationId: string, payload: NotificationPayload): Promise<void> {
  const supabase = getSupabaseClient()
  const recipients: { notification_id: string; user_id: string; is_read: boolean }[] = []

  try {
    if (payload.target_audience === "all") {
      // Get all users in the school
      const { data: students } = await supabase
        .from("students")
        .select("user_id")
        .eq("school_id", payload.school_id)

      const { data: staff } = await supabase
        .from("staff")
        .select("user_id")
        .eq("school_id", payload.school_id)

      students?.forEach((s) => {
        if (s.user_id) recipients.push({ notification_id: notificationId, user_id: s.user_id, is_read: false })
      })

      staff?.forEach((s) => {
        if (s.user_id) recipients.push({ notification_id: notificationId, user_id: s.user_id, is_read: false })
      })

      // Get parents of students in this school
      if (students && students.length > 0) {
        const studentIds = students.map((s) => s.user_id).filter(Boolean)
        const { data: studentRecords } = await supabase
          .from("students")
          .select("id")
          .eq("school_id", payload.school_id)

        if (studentRecords) {
          const { data: parentRelations } = await supabase
            .from("student_parents")
            .select("parent:parents(user_id)")
            .in("student_id", studentRecords.map((s) => s.id))

          parentRelations?.forEach((p: any) => {
            if (p.parent?.user_id) {
              recipients.push({ notification_id: notificationId, user_id: p.parent.user_id, is_read: false })
            }
          })
        }
      }
    } else if (payload.target_audience === "students") {
      const { data: students } = await supabase
        .from("students")
        .select("user_id")
        .eq("school_id", payload.school_id)

      students?.forEach((s) => {
        if (s.user_id) recipients.push({ notification_id: notificationId, user_id: s.user_id, is_read: false })
      })
    } else if (payload.target_audience === "parents") {
      const { data: students } = await supabase
        .from("students")
        .select("id")
        .eq("school_id", payload.school_id)

      if (students) {
        const { data: parentRelations } = await supabase
          .from("student_parents")
          .select("parent:parents(user_id)")
          .in("student_id", students.map((s) => s.id))

        parentRelations?.forEach((p: any) => {
          if (p.parent?.user_id) {
            recipients.push({ notification_id: notificationId, user_id: p.parent.user_id, is_read: false })
          }
        })
      }
    } else if (payload.target_audience === "teachers") {
      const { data: staff } = await supabase
        .from("staff")
        .select("user_id")
        .eq("school_id", payload.school_id)

      staff?.forEach((s) => {
        if (s.user_id) recipients.push({ notification_id: notificationId, user_id: s.user_id, is_read: false })
      })
    } else if (payload.target_audience === "class" && payload.class_id) {
      const { data: students } = await supabase
        .from("students")
        .select("id, user_id")
        .eq("current_class_id", payload.class_id)

      students?.forEach((s) => {
        if (s.user_id) recipients.push({ notification_id: notificationId, user_id: s.user_id, is_read: false })
      })

      // Also notify parents
      if (students) {
        const { data: parentRelations } = await supabase
          .from("student_parents")
          .select("parent:parents(user_id)")
          .in("student_id", students.map((s) => s.id))

        parentRelations?.forEach((p: any) => {
          if (p.parent?.user_id) {
            recipients.push({ notification_id: notificationId, user_id: p.parent.user_id, is_read: false })
          }
        })
      }
    }

    // Remove duplicates
    const uniqueRecipients = recipients.filter(
      (r, index, self) => index === self.findIndex((t) => t.user_id === r.user_id)
    )

    if (uniqueRecipients.length > 0) {
      await supabase.from("notification_recipients").insert(uniqueRecipients)
    }
  } catch (error) {
    console.error("[Notification Service] Error adding recipients:", error)
  }
}

// Get user notifications
export async function getUserNotifications(userId: string, limit = 20): Promise<NotificationRecipient[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("notification_recipients")
    .select(`
      *,
      notification:notifications(*)
    `)
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  if (error) {
    console.error("[Notification Service] Error fetching notifications:", error)
    return []
  }

  return data || []
}

export async function getUserCreatedNotifications(userId: string, limit = 20): Promise<Notification[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("notifications")
    .select(`
      *,
      staff!notifications_sent_by_fkey!inner (
        id,
        user_id
      )
    `)
    .eq("staff.user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit)

  console.log(data)

  if (error) {
    console.error("[Notification Service] Error fetching notifications:", error)
    return []
  }

  return data || []
}

// Get unread notification count
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const supabase = getSupabaseClient()

  const { count, error } = await supabase
    .from("notification_recipients")
    .select("*", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("is_read", false)

  if (error) {
    console.error("[Notification Service] Error getting unread count:", error)
    return 0
  }

  return count || 0
}

// Mark notification as read
export async function markNotificationAsRead(notificationRecipientId: string): Promise<boolean> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from("notification_recipients")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("id", notificationRecipientId)

  if (error) {
    console.error("[Notification Service] Error marking as read:", error)
    return false
  }

  return true
}

// Mark all notifications as read for a user
export async function markAllNotificationsAsRead(userId: string): Promise<boolean> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from("notification_recipients")
    .update({ is_read: true, read_at: new Date().toISOString() })
    .eq("user_id", userId)
    .eq("is_read", false)

  if (error) {
    console.error("[Notification Service] Error marking all as read:", error)
    return false
  }

  return true
}

// ====== AUTOMATED NOTIFICATION TRIGGERS ======

// Notify about report card generation
export async function notifyReportCardGenerated(
  schoolId: string,
  studentId: string,
  studentName: string,
  examName: string,
  sentBy: string
): Promise<void> {
  const supabase = getSupabaseClient()

  // Get student's parent user IDs
  const { data: parents } = await supabase
    .from("student_parents")
    .select("parent:parents(user_id)")
    .eq("student_id", studentId)

  // Get student's user ID
  const { data: student } = await supabase
    .from("students")
    .select("user_id")
    .eq("id", studentId)
    .single()

  // Resolve staff ID from sent_by (which could be user_id or staff_id)
  const staffId = await resolveStaffId(sentBy)

  // Create notification with DB-compatible types
  const { data: notification, error: notifError } = await supabase
    .from("notifications")
    .insert({
      school_id: schoolId,
      title: "Report Card Generated",
      message: `${examName} report card for ${studentName} is now available. You can view and download it from the certificates section.`,
      notification_type: "Exam" as DBNotificationType,
      target_audience: "Students" as DBTargetAudience,
      sent_by: staffId,
    })
    .select()
    .single()

  if (notifError || !notification) {
    console.error("[Notification Service] Error creating report card notification:", notifError)
    return
  }

  // Add recipients
  const recipients: { notification_id: string; user_id: string; is_read: boolean }[] = []

  if (student?.user_id) {
    recipients.push({ notification_id: notification.id, user_id: student.user_id, is_read: false })
  }

  parents?.forEach((p: any) => {
    if (p.parent?.user_id) {
      recipients.push({ notification_id: notification.id, user_id: p.parent.user_id, is_read: false })
    }
  })

  if (recipients.length > 0) {
    await supabase.from("notification_recipients").insert(recipients)
  }
}

// Notify about low attendance
export async function notifyLowAttendance(
  schoolId: string,
  studentId: string,
  studentName: string,
  attendancePercentage: number,
  threshold: number,
  sentBy: string
): Promise<void> {
  const supabase = getSupabaseClient()

  // Get student's parent user IDs
  const { data: parents } = await supabase
    .from("student_parents")
    .select("parent:parents(user_id)")
    .eq("student_id", studentId)

  // Get student's user ID
  const { data: student } = await supabase
    .from("students")
    .select("user_id")
    .eq("id", studentId)
    .single()

  // Resolve staff ID
  const staffId = await resolveStaffId(sentBy)

  const { data: notification, error: notifError } = await supabase
    .from("notifications")
    .insert({
      school_id: schoolId,
      title: "Low Attendance Alert",
      message: `${studentName}'s attendance has dropped to ${attendancePercentage.toFixed(1)}%, which is below the required ${threshold}% threshold. Please ensure regular attendance to avoid academic consequences.`,
      notification_type: "Attendance" as DBNotificationType,
      target_audience: "Students" as DBTargetAudience,
      sent_by: staffId,
    })
    .select()
    .single()

  if (notifError || !notification) {
    console.error("[Notification Service] Error creating low attendance notification:", notifError)
    return
  }

  const recipients: { notification_id: string; user_id: string; is_read: boolean }[] = []

  if (student?.user_id) {
    recipients.push({ notification_id: notification.id, user_id: student.user_id, is_read: false })
  }

  parents?.forEach((p: any) => {
    if (p.parent?.user_id) {
      recipients.push({ notification_id: notification.id, user_id: p.parent.user_id, is_read: false })
    }
  })

  if (recipients.length > 0) {
    await supabase.from("notification_recipients").insert(recipients)
  }
}

// Notify about fee payment reminder
export async function notifyFeeReminder(
  schoolId: string,
  studentId: string,
  studentName: string,
  feeType: string,
  amount: number,
  dueDate: string,
  sentBy: string
): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: parents } = await supabase
    .from("student_parents")
    .select("parent:parents(user_id)")
    .eq("student_id", studentId)

  const { data: student } = await supabase
    .from("students")
    .select("user_id")
    .eq("id", studentId)
    .single()

  const dueDateFormatted = new Date(dueDate).toLocaleDateString("en-IN", {
    year: "numeric",
    month: "long",
    day: "numeric",
  })

  // Resolve staff ID
  const staffId = await resolveStaffId(sentBy)

  const { data: notification, error: notifError } = await supabase
    .from("notifications")
    .insert({
      school_id: schoolId,
      title: "Fee Payment Reminder",
      message: `Reminder: ${feeType} fee of ₹${amount.toLocaleString()} for ${studentName} is due on ${dueDateFormatted}. Please make the payment to avoid late fees.`,
      notification_type: "Fee" as DBNotificationType,
      target_audience: "Parents" as DBTargetAudience,
      sent_by: staffId,
    })
    .select()
    .single()

  if (notifError || !notification) {
    console.error("[Notification Service] Error creating fee reminder notification:", notifError)
    return
  }

  const recipients: { notification_id: string; user_id: string; is_read: boolean }[] = []

  if (student?.user_id) {
    recipients.push({ notification_id: notification.id, user_id: student.user_id, is_read: false })
  }

  parents?.forEach((p: any) => {
    if (p.parent?.user_id) {
      recipients.push({ notification_id: notification.id, user_id: p.parent.user_id, is_read: false })
    }
  })

  if (recipients.length > 0) {
    await supabase.from("notification_recipients").insert(recipients)
  }
}

// Notify about overdue fees
export async function notifyFeeOverdue(
  schoolId: string,
  studentId: string,
  studentName: string,
  feeType: string,
  amount: number,
  daysOverdue: number,
  sentBy: string
): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: parents } = await supabase
    .from("student_parents")
    .select("parent:parents(user_id)")
    .eq("student_id", studentId)

  const { data: student } = await supabase
    .from("students")
    .select("user_id")
    .eq("id", studentId)
    .single()

  // Resolve staff ID
  const staffId = await resolveStaffId(sentBy)

  const { data: notification, error: notifError } = await supabase
    .from("notifications")
    .insert({
      school_id: schoolId,
      title: "Fee Payment Overdue",
      message: `URGENT: ${feeType} fee of ₹${amount.toLocaleString()} for ${studentName} is overdue by ${daysOverdue} days. Please clear the dues immediately to avoid academic restrictions.`,
      notification_type: "Fee" as DBNotificationType,
      target_audience: "Parents" as DBTargetAudience,
      sent_by: staffId,
    })
    .select()
    .single()

  if (notifError || !notification) {
    console.error("[Notification Service] Error creating fee overdue notification:", notifError)
    return
  }

  const recipients: { notification_id: string; user_id: string; is_read: boolean }[] = []

  if (student?.user_id) {
    recipients.push({ notification_id: notification.id, user_id: student.user_id, is_read: false })
  }

  parents?.forEach((p: any) => {
    if (p.parent?.user_id) {
      recipients.push({ notification_id: notification.id, user_id: p.parent.user_id, is_read: false })
    }
  })

  if (recipients.length > 0) {
    await supabase.from("notification_recipients").insert(recipients)
  }
}

// Notify about exam results
export async function notifyExamResults(
  schoolId: string,
  classId: string,
  className: string,
  examName: string,
  sentBy: string
): Promise<void> {
  const supabase = getSupabaseClient()

  // Get all students in the class
  const { data: students } = await supabase.from("students").select("id, user_id").eq("current_class_id", classId)

  if (!students || students.length === 0) return

  // Get all parents of these students
  const studentIds = students.map((s: { id: string }) => s.id)
  const { data: parentRelations } = await supabase
    .from("student_parents")
    .select("parent:parents(user_id)")
    .in("student_id", studentIds)

  // Resolve staff ID
  const staffId = await resolveStaffId(sentBy)

  const { data: notification, error: notifError } = await supabase
    .from("notifications")
    .insert({
      school_id: schoolId,
      title: "Exam Results Published",
      message: `${examName} results for ${className} have been published. Students can view their marks and report cards in the portal.`,
      notification_type: "Exam" as DBNotificationType,
      target_audience: "Students" as DBTargetAudience,
      class_id: classId,
      sent_by: staffId,
    })
    .select()
    .single()

  if (notifError || !notification) {
    console.error("[Notification Service] Error creating exam results notification:", notifError)
    return
  }

  const recipients: { notification_id: string; user_id: string; is_read: boolean }[] = []

  // Add students
  students.forEach((s: { id: string; user_id: string | null }) => {
    if (s.user_id) {
      recipients.push({ notification_id: notification.id, user_id: s.user_id, is_read: false })
    }
  })

  // Add parents
  parentRelations?.forEach((p: any) => {
    if (p.parent?.user_id) {
      recipients.push({ notification_id: notification.id, user_id: p.parent.user_id, is_read: false })
    }
  })

  // Remove duplicates
  const uniqueRecipients = recipients.filter(
    (r, index, self) => index === self.findIndex((t) => t.user_id === r.user_id)
  )

  if (uniqueRecipients.length > 0) {
    await supabase.from("notification_recipients").insert(uniqueRecipients)
  }
}

// Notify certificate is ready
export async function notifyCertificateReady(
  schoolId: string,
  studentId: string,
  studentName: string,
  certificateType: string,
  sentBy: string
): Promise<void> {
  const supabase = getSupabaseClient()

  const { data: parents } = await supabase
    .from("student_parents")
    .select("parent:parents(user_id)")
    .eq("student_id", studentId)

  const { data: student } = await supabase
    .from("students")
    .select("user_id")
    .eq("id", studentId)
    .single()

  // Resolve staff ID
  const staffId = await resolveStaffId(sentBy)

  const { data: notification, error: notifError } = await supabase
    .from("notifications")
    .insert({
      school_id: schoolId,
      title: "Certificate Ready",
      message: `${certificateType} certificate for ${studentName} has been generated and is ready for download from the certificates section.`,
      notification_type: "Other" as DBNotificationType,
      target_audience: "Students" as DBTargetAudience,
      sent_by: staffId,
    })
    .select()
    .single()

  if (notifError || !notification) {
    console.error("[Notification Service] Error creating certificate notification:", notifError)
    return
  }

  const recipients: { notification_id: string; user_id: string; is_read: boolean }[] = []

  if (student?.user_id) {
    recipients.push({ notification_id: notification.id, user_id: student.user_id, is_read: false })
  }

  parents?.forEach((p: any) => {
    if (p.parent?.user_id) {
      recipients.push({ notification_id: notification.id, user_id: p.parent.user_id, is_read: false })
    }
  })

  if (recipients.length > 0) {
    await supabase.from("notification_recipients").insert(recipients)
  }
}

// ====== BATCH NOTIFICATION CHECKS ======

// Check and notify students with low attendance (for scheduled jobs)
export async function checkAndNotifyLowAttendance(
  schoolId: string,
  threshold: number = 75,
  sentBy: string
): Promise<{ notified: number; students: string[] }> {
  const supabase = getSupabaseClient()

  // Get all students in the school
  const { data: students } = await supabase
    .from("students")
    .select("id, first_name, last_name, user_id")
    .eq("school_id", schoolId)

  if (!students || students.length === 0) {
    return { notified: 0, students: [] }
  }

  const notifiedStudents: string[] = []

  for (const student of students) {
    // Get attendance for last 30 days
    const thirtyDaysAgo = new Date()
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30)

    const { data: attendance } = await supabase
      .from("attendance")
      .select("status")
      .eq("student_id", student.id)
      .gte("attendance_date", thirtyDaysAgo.toISOString().split("T")[0])

    if (!attendance || attendance.length === 0) continue

    const presentDays = attendance.filter((a) => a.status === "Present").length
    const attendancePercentage = (presentDays / attendance.length) * 100

    if (attendancePercentage < threshold) {
      await notifyLowAttendance(
        schoolId,
        student.id,
        `${student.first_name} ${student.last_name}`,
        attendancePercentage,
        threshold,
        sentBy
      )
      notifiedStudents.push(`${student.first_name} ${student.last_name}`)
    }
  }

  return { notified: notifiedStudents.length, students: notifiedStudents }
}

// Check and notify about upcoming fee due dates (for scheduled jobs)
export async function checkAndNotifyUpcomingFees(
  schoolId: string,
  daysBeforeDue: number = 7,
  sentBy: string
): Promise<{ notified: number }> {
  const supabase = getSupabaseClient()

  const targetDate = new Date()
  targetDate.setDate(targetDate.getDate() + daysBeforeDue)
  const targetDateStr = targetDate.toISOString().split("T")[0]

  // Get fees due within the specified days
  const { data: upcomingFees } = await supabase
    .from("student_fees")
    .select(`
      *,
      student:students(id, first_name, last_name, school_id),
      fee_structure:fee_structures(fee_type)
    `)
    .lte("due_date", targetDateStr)
    .gt("balance_amount", 0)
    .in("status", ["Pending", "Partial"])

  if (!upcomingFees || upcomingFees.length === 0) {
    return { notified: 0 }
  }

  let notifiedCount = 0

  for (const fee of upcomingFees) {
    if (fee.student?.school_id !== schoolId) continue

    await notifyFeeReminder(
      schoolId,
      fee.student.id,
      `${fee.student.first_name} ${fee.student.last_name}`,
      fee.fee_structure?.fee_type || "Tuition",
      fee.balance_amount,
      fee.due_date,
      sentBy
    )
    notifiedCount++
  }

  return { notified: notifiedCount }
}

// Check and notify about overdue fees (for scheduled jobs)
export async function checkAndNotifyOverdueFees(schoolId: string, sentBy: string): Promise<{ notified: number }> {
  const supabase = getSupabaseClient()

  const today = new Date().toISOString().split("T")[0]

  // Get overdue fees
  const { data: overdueFees } = await supabase
    .from("student_fees")
    .select(`
      *,
      student:students(id, first_name, last_name, school_id),
      fee_structure:fee_structures(fee_type)
    `)
    .lt("due_date", today)
    .gt("balance_amount", 0)
    .eq("status", "Overdue")

  if (!overdueFees || overdueFees.length === 0) {
    return { notified: 0 }
  }

  let notifiedCount = 0

  for (const fee of overdueFees) {
    if (fee.student?.school_id !== schoolId) continue

    const dueDate = new Date(fee.due_date)
    const todayDate = new Date()
    const daysOverdue = Math.floor((todayDate.getTime() - dueDate.getTime()) / (1000 * 60 * 60 * 24))

    await notifyFeeOverdue(
      schoolId,
      fee.student.id,
      `${fee.student.first_name} ${fee.student.last_name}`,
      fee.fee_structure?.fee_type || "Tuition",
      fee.balance_amount,
      daysOverdue,
      sentBy
    )
    notifiedCount++
  }

  return { notified: notifiedCount }
}
