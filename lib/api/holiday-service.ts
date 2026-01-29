import { getSupabaseClient } from "@/lib/supabase"

export interface Holiday {
  id: string
  school_id: string
  name: string
  description?: string
  holiday_date: string
  holiday_type: "Holiday" | "Event" | "Exam" | "Half-Day" | "Vacation"
  is_recurring: boolean
  recurring_month?: number
  recurring_day?: number
  academic_year?: string
  created_by?: string
  created_at: string
  updated_at: string
}

export interface HolidayPayload {
  school_id: string
  name: string
  description?: string
  holiday_date: string
  holiday_type: "Holiday" | "Event" | "Exam" | "Half-Day" | "Vacation"
  is_recurring?: boolean
  recurring_month?: number
  recurring_day?: number
  academic_year?: string
  created_by?: string
}

// Get all holidays for a school
export async function getSchoolHolidays(schoolId: string, academicYear?: string): Promise<Holiday[]> {
  const supabase = getSupabaseClient()

  let query = supabase
    .from("holidays")
    .select("*")
    .eq("school_id", schoolId)
    .order("holiday_date", { ascending: true })

  if (academicYear) {
    query = query.eq("academic_year", academicYear)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching holidays:", error)
    throw error
  }

  return data || []
}

// Get holidays for a date range
export async function getHolidaysInRange(
  schoolId: string,
  startDate: string,
  endDate: string
): Promise<Holiday[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("holidays")
    .select("*")
    .eq("school_id", schoolId)
    .gte("holiday_date", startDate)
    .lte("holiday_date", endDate)
    .order("holiday_date", { ascending: true })

  if (error) {
    console.error("Error fetching holidays in range:", error)
    throw error
  }

  return data || []
}

// Get upcoming holidays
export async function getUpcomingHolidays(schoolId: string, limit: number = 5): Promise<Holiday[]> {
  const supabase = getSupabaseClient()
  const today = new Date().toLocaleDateString("en-CA")

  const { data, error } = await supabase
    .from("holidays")
    .select("*")
    .eq("school_id", schoolId)
    .gte("holiday_date", today)
    .order("holiday_date", { ascending: true })
    .limit(limit)

  if (error) {
    console.error("Error fetching upcoming holidays:", error)
    throw error
  }

  return data || []
}

// Create a new holiday
export async function createHoliday(payload: HolidayPayload): Promise<Holiday> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("holidays")
    .insert(payload)
    .select()
    .single()

  if (error) {
    console.error("Error creating holiday:", error)
    throw error
  }

  return data
}

// Update a holiday
export async function updateHoliday(id: string, payload: Partial<HolidayPayload>): Promise<Holiday> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("holidays")
    .update(payload)
    .eq("id", id)
    .select()
    .single()

  if (error) {
    console.error("Error updating holiday:", error)
    throw error
  }

  return data
}

// Delete a holiday
export async function deleteHoliday(id: string): Promise<void> {
  const supabase = getSupabaseClient()

  const { error } = await supabase
    .from("holidays")
    .delete()
    .eq("id", id)

  if (error) {
    console.error("Error deleting holiday:", error)
    throw error
  }
}

// Get holiday types with colors for calendar display
export const HOLIDAY_TYPE_COLORS: Record<Holiday["holiday_type"], string> = {
  Holiday: "bg-red-500",
  Event: "bg-blue-500",
  Exam: "bg-yellow-500",
  "Half-Day": "bg-orange-500",
  Vacation: "bg-purple-500",
}

export const HOLIDAY_TYPES = [
  { value: "Holiday", label: "Holiday" },
  { value: "Event", label: "Event" },
  { value: "Exam", label: "Exam" },
  { value: "Half-Day", label: "Half-Day" },
  { value: "Vacation", label: "Vacation" },
] as const

// Format date for display
export function formatHolidayDate(dateStr: string): string {
  const date = new Date(dateStr)
  return date.toLocaleDateString("en-IN", {
    weekday: "short",
    day: "numeric",
    month: "short",
    year: "numeric",
  })
}

// Check if a date is a holiday
export function isHoliday(date: Date, holidays: Holiday[]): Holiday | undefined {
  const dateStr = date.toLocaleDateString("en-CA")
  return holidays.find((h) => h.holiday_date === dateStr)
}
