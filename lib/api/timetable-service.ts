import { getSupabaseClient } from "@/lib/supabase"

export interface TimetableEntry {
  id: string
  school_id: string
  class_id: string
  section_id?: string
  subject_id: string
  teacher_id?: string
  day_of_week: number
  start_time: string
  end_time: string
  room_number?: string
  academic_year: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Joined relations
  class?: { id: string; name: string }
  section?: { id: string; name: string }
  subject?: { id: string; name: string; code: string }
  teacher?: { id: string; first_name: string; last_name: string }
}

export interface PeriodDefinition {
  id: string
  school_id: string
  period_number: number
  period_name: string
  start_time: string
  end_time: string
  is_break: boolean
  academic_year: string
  is_active: boolean
}

export const DAYS_OF_WEEK = [
  { value: 0, label: "Sunday" },
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
]

// Get timetable for a class
export async function getClassTimetable(classId: string, sectionId?: string): Promise<TimetableEntry[]> {
  const supabase = getSupabaseClient()

  let query = supabase
    .from("timetable")
    .select(`
      *,
      class:classes(id, name),
      section:sections(id, name),
      subject:subjects(id, name, code),
      teacher:staff(id, first_name, last_name)
    `)
    .eq("class_id", classId)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time")

  if (sectionId) {
    query = query.eq("section_id", sectionId)
  }

  const { data, error } = await query

  if (error) {
    console.error("[Timetable Service] Error fetching class timetable:", error)
    return []
  }

  return data || []
}

// Get timetable for a teacher
export async function getTeacherTimetable(teacherId: string): Promise<TimetableEntry[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("timetable")
    .select(`
      *,
      class:classes(id, name),
      section:sections(id, name),
      subject:subjects(id, name, code),
      teacher:staff(id, first_name, last_name)
    `)
    .eq("teacher_id", teacherId)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time")

  if (error) {
    console.error("[Timetable Service] Error fetching teacher timetable:", error)
    return []
  }

  return data || []
}

// Get all timetable entries for a school
export async function getSchoolTimetable(schoolId: string): Promise<TimetableEntry[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("timetable")
    .select(`
      *,
      class:classes(id, name),
      section:sections(id, name),
      subject:subjects(id, name, code),
      teacher:staff(id, first_name, last_name)
    `)
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("class_id")
    .order("day_of_week")
    .order("start_time")

  if (error) {
    console.error("[Timetable Service] Error fetching school timetable:", error)
    return []
  }

  return data || []
}

// Create a new timetable entry
export async function createTimetableEntry(entry: Omit<TimetableEntry, "id" | "created_at" | "updated_at">): Promise<TimetableEntry | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("timetable")
    .insert(entry)
    .select(`
      *,
      class:classes(id, name),
      section:sections(id, name),
      subject:subjects(id, name, code),
      teacher:staff(id, first_name, last_name)
    `)
    .single()

  if (error) {
    console.error("[Timetable Service] Error creating timetable entry:", error)
    return null
  }

  return data
}

// Update a timetable entry
export async function updateTimetableEntry(id: string, updates: Partial<TimetableEntry>): Promise<TimetableEntry | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("timetable")
    .update(updates)
    .eq("id", id)
    .select(`
      *,
      class:classes(id, name),
      section:sections(id, name),
      subject:subjects(id, name, code),
      teacher:staff(id, first_name, last_name)
    `)
    .single()

  if (error) {
    console.error("[Timetable Service] Error updating timetable entry:", error)
    return null
  }

  return data
}

// Delete a timetable entry (soft delete by setting is_active to false)
export async function deleteTimetableEntry(id: string): Promise<boolean> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from("timetable")
    .update({ is_active: false })
    .eq("id", id)

  if (error) {
    console.error("[Timetable Service] Error deleting timetable entry:", error)
    return false
  }

  return true
}

// Get period definitions for a school
export async function getPeriodDefinitions(schoolId: string): Promise<PeriodDefinition[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("period_definitions")
    .select("*")
    .eq("school_id", schoolId)
    .eq("is_active", true)
    .order("period_number")

  if (error) {
    console.error("[Timetable Service] Error fetching period definitions:", error)
    return []
  }

  return data || []
}

// Create period definition
export async function createPeriodDefinition(definition: Omit<PeriodDefinition, "id">): Promise<PeriodDefinition | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("period_definitions")
    .insert(definition)
    .select()
    .single()

  if (error) {
    console.error("[Timetable Service] Error creating period definition:", error)
    return null
  }

  return data
}

// Update period definition
export async function updatePeriodDefinition(id: string, updates: Partial<PeriodDefinition>): Promise<PeriodDefinition | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("period_definitions")
    .update(updates)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("[Timetable Service] Error updating period definition:", error)
    return null
  }

  return data
}

// Helper to format time for display
export function formatTime(time: string): string {
  const [hours, minutes] = time.split(":")
  const hour = parseInt(hours)
  const ampm = hour >= 12 ? "PM" : "AM"
  const displayHour = hour % 12 || 12
  return `${displayHour}:${minutes} ${ampm}`
}

// Helper to get day name
export function getDayName(dayOfWeek: number): string {
  return DAYS_OF_WEEK.find((d) => d.value === dayOfWeek)?.label || ""
}

// Group timetable entries by day
export function groupByDay(entries: TimetableEntry[]): Record<number, TimetableEntry[]> {
  return entries.reduce((acc, entry) => {
    if (!acc[entry.day_of_week]) {
      acc[entry.day_of_week] = []
    }
    acc[entry.day_of_week].push(entry)
    return acc
  }, {} as Record<number, TimetableEntry[]>)
}

// Get timetable for a student based on their class and section
export async function getStudentTimetable(studentId: string): Promise<TimetableEntry[]> {
  const supabase = getSupabaseClient()

  // First get the student's class and section
  const { data: student, error: studentError } = await supabase
    .from("students")
    .select("current_class_id, section_id")
    .eq("id", studentId)
    .single()

  if (studentError || !student?.current_class_id) {
    console.error("[Timetable Service] Error fetching student:", studentError)
    return []
  }

  // Get timetable for the class (and optionally section)
  let query = supabase
    .from("timetable")
    .select(`
      *,
      class:classes(id, name),
      section:sections(id, name),
      subject:subjects(id, name, code),
      teacher:staff(id, first_name, last_name)
    `)
    .eq("class_id", student.current_class_id)
    .eq("is_active", true)
    .order("day_of_week")
    .order("start_time")

  // If student has a section, filter by section or entries with no section (applies to all)
  if (student.section_id) {
    query = query.or(`section_id.eq.${student.section_id},section_id.is.null`)
  }

  const { data, error } = await query

  if (error) {
    console.error("[Timetable Service] Error fetching student timetable:", error)
    return []
  }

  return data || []
}

// Get unique time slots from timetable entries
export function getUniqueTimeSlots(entries: TimetableEntry[]): { start_time: string; end_time: string }[] {
  const slots = new Map<string, { start_time: string; end_time: string }>()

  entries.forEach((entry) => {
    const key = `${entry.start_time}-${entry.end_time}`
    if (!slots.has(key)) {
      slots.set(key, { start_time: entry.start_time, end_time: entry.end_time })
    }
  })

  return Array.from(slots.values()).sort((a, b) => a.start_time.localeCompare(b.start_time))
}

// Get entry for a specific day and time slot
export function getEntryForSlot(
  entries: TimetableEntry[],
  dayOfWeek: number,
  startTime: string,
  endTime: string
): TimetableEntry | undefined {
  return entries.find(
    (e) =>
      e.day_of_week === dayOfWeek &&
      e.start_time === startTime &&
      e.end_time === endTime
  )
}
