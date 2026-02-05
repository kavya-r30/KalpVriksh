import { getSupabaseClient } from "@/lib/supabase"

const supabase = getSupabaseClient()

// Students
export async function createStudent(studentData: any) {
  const { data, error } = await supabase.from("students").insert([studentData]).select().single()

  if (error) throw error
  return data
}

export async function updateStudent(id: string, studentData: any) {
  const { data, error } = await supabase.from("students").update(studentData).eq("id", id).select().single()

  if (error) throw error
  return data
}

export async function deleteStudent(id: string) {
  const { error } = await supabase.from("students").delete().eq("id", id)

  if (error) throw error
  return true
}

// Teachers
export async function createTeacher(teacherData: any) {
  const { data, error } = await supabase.from("staff").insert([teacherData]).select().single()

  if (error) throw error
  return data
}

export async function updateTeacher(id: string, teacherData: any) {
  const { data, error } = await supabase.from("staff").update(teacherData).eq("id", id).select().single()

  if (error) throw error
  return data
}

export async function deleteTeacher(id: string) {
  const { error } = await supabase.from("staff").delete().eq("id", id)

  if (error) throw error
  return true
}

// Schools
export async function createSchool(schoolData: any) {
  const { data, error } = await supabase.from("schools").insert([schoolData]).select().single()

  if (error) throw error
  return data
}

export async function updateSchool(id: string, schoolData: any) {
  const { data, error } = await supabase.from("schools").update(schoolData).eq("id", id).select().single()

  if (error) throw error
  return data
}

export async function deleteSchool(id: string) {
  const { error } = await supabase.from("schools").delete().eq("id", id)

  if (error) throw error
  return true
}

// Parents
export async function createParent(parentData: any) {
  const { data, error } = await supabase.from("parents").insert([parentData]).select().single()

  if (error) throw error
  return data
}

export async function updateParent(id: string, parentData: any) {
  const { data, error } = await supabase.from("parents").update(parentData).eq("id", id).select().single()

  if (error) throw error
  return data
}

export async function deleteParent(id: string) {
  const { error } = await supabase.from("parents").delete().eq("id", id)

  if (error) throw error
  return true
}

// Exams
export async function createExam(examData: any) {
  const { data, error } = await supabase.from("exams").insert([examData]).select().single()

  if (error) throw error
  return data
}

export async function updateExam(id: string, examData: any) {
  const { data, error } = await supabase.from("exams").update(examData).eq("id", id).select().single()

  if (error) throw error
  return data
}

export async function deleteExam(id: string) {
  const { error } = await supabase.from("exams").delete().eq("id", id)

  if (error) throw error
  return true
}

// Assignments
export async function createAssignment(assignmentData: any) {
  const { data, error } = await supabase.from("assignments").insert([assignmentData]).select().single()
  if (error) throw error
  return data
}

export async function updateAssignment(id: string, assignmentData: any) {
  const { data, error } = await supabase.from("assignments").update(assignmentData).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deleteAssignment(id: string) {
  const { error } = await supabase.from("assignments").delete().eq("id", id)
  if (error) throw error
  return true
}

// Classes
export async function createClass(classData: any) {
  const { data, error } = await supabase.from("classes").insert([classData]).select().single()
  if (error) throw error
  return data
}

export async function updateClass(id: string, classData: any) {
  const { data, error } = await supabase.from("classes").update(classData).eq("id", id).select().single()
  if (error) throw error
  return data
}

export async function deleteClass(id: string) {
  const { error } = await supabase.from("classes").delete().eq("id", id)
  if (error) throw error
  return true
}

// Attendance
export async function markAttendance(attendanceData: any[]) {
  const { data, error } = await supabase
    .from("attendance")
    .upsert(attendanceData, {
      onConflict: "student_id,attendance_date",
    })
    .select()
  if (error) throw error
  return data
}

// Marks
export async function updateMarks(marksData: any[]) {
  const { data, error } = await supabase.from("marks").upsert(marksData).select()
  if (error) throw error
  return data
}

// Assignment Submissions
export async function submitAssignment(submissionData: {
  assignment_id: string
  student_id: string
  submission_text?: string
  submission_file_url?: string
}) {
  const { data, error } = await supabase
    .from("assignment_submissions")
    .upsert(
      {
        ...submissionData,
        status: "Submitted",
        submitted_at: new Date().toISOString(),
      },
      { onConflict: "assignment_id,student_id" }
    )
    .select()
    .single()

  if (error) throw error
  return data
}

export async function gradeSubmission(
  submissionId: string,
  gradeData: {
    marks_obtained: number
    feedback?: string
    graded_by: string
  }
) {
  const { data, error } = await supabase
    .from("assignment_submissions")
    .update({
      ...gradeData,
      status: "Graded",
      graded_at: new Date().toISOString(),
    })
    .eq("id", submissionId)
    .select()
    .single()

  if (error) throw error
  return data
}

// Meetings
export async function createMeeting(meetingData: {
  school_id: string
  class_id?: string
  host_id: string
  title: string
  description?: string
  meeting_url: string
  room_name: string
  scheduled_at: string
  duration_minutes?: number
  meeting_type?: string
}) {
  const { data: meeting, error } = await supabase
    .from("meetings")
    .insert([meetingData])
    .select()
    .single()

  if (error) throw error

  if (meetingData.class_id) {
    const { data: students } = await supabase
      .from("students")
      .select("user_id")
      .eq("current_class_id", meetingData.class_id)
      .not("user_id", "is", null)

    if (students?.length) {
      await supabase
        .from("meeting_participants")
        .insert(
          students.map(s => ({
            meeting_id: meeting.id,
            user_id: s.user_id,
          })),
          { ignoreDuplicates: true }
        )
    }
  }
  return meeting
}

export async function updateMeeting(id: string, meetingData: any) {
  const { data, error } = await supabase
    .from("meetings")
    .update(meetingData)
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}

export async function deleteMeeting(id: string) {
  const { error } = await supabase.from("meetings").delete().eq("id", id)
  if (error) throw error
  return true
}

export async function updateMeetingStatus(id: string, status: string) {
  const { data, error } = await supabase
    .from("meetings")
    .update({ status })
    .eq("id", id)
    .select()
    .single()

  if (error) throw error
  return data
}
