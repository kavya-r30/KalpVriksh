import { getSupabaseClient } from "@/lib/supabase"

export interface CertificateRequest {
  id: string
  student_id: string
  certificate_type: string
  purpose?: string
  requested_by: string
  status: "Pending" | "Approved" | "Rejected" | "Generated"
  remarks?: string
  processed_by?: string
  processed_at?: string
  created_at: string
  updated_at: string
  student?: {
    id: string
    first_name: string
    last_name: string
    admission_number: string
    current_class?: { name: string }
    section?: { name: string }
  }
}

export interface CreateCertificateRequestPayload {
  student_id: string
  certificate_type: string
  purpose?: string
  requested_by: string
}

// Create a new certificate request
export async function createCertificateRequest(
  payload: CreateCertificateRequestPayload
): Promise<CertificateRequest> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("certificate_requests")
    .insert({
      student_id: payload.student_id,
      certificate_type: payload.certificate_type,
      purpose: payload.purpose || null,
      requested_by: payload.requested_by,
      status: "Pending",
    })
    .select()
    .single()

  if (error) {
    console.error("Error creating certificate request:", error)
    throw error
  }

  return data
}

// Get certificate requests for a student
export async function getStudentCertificateRequests(
  studentId: string
): Promise<CertificateRequest[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("certificate_requests")
    .select("*")
    .eq("student_id", studentId)
    .order("created_at", { ascending: false })

  if (error) {
    console.error("Error fetching student certificate requests:", error)
    return []
  }

  return data || []
}

// Get all pending certificate requests for a school (for principal/admin)
export async function getPendingCertificateRequests(
  schoolId: string
): Promise<CertificateRequest[]> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("certificate_requests")
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
    .eq("status", "Pending")
    .order("created_at", { ascending: true })

  if (error) {
    console.error("Error fetching pending certificate requests:", error)
    return []
  }

  // Filter by school - students table has school_id
  const { data: students } = await supabase
    .from("students")
    .select("id")
    .eq("school_id", schoolId)

  const studentIds = new Set(students?.map((s) => s.id) || [])
  const filteredData = (data || []).filter((r) => studentIds.has(r.student_id))

  return filteredData
}

// Get all certificate requests for a school (all statuses)
export async function getAllCertificateRequests(
  schoolId: string,
  status?: string
): Promise<CertificateRequest[]> {
  const supabase = getSupabaseClient()

  let query = supabase
    .from("certificate_requests")
    .select(`
      *,
      student:students(
        id,
        first_name,
        last_name,
        admission_number,
        school_id,
        current_class:classes(name),
        section:sections(name)
      )
    `)
    .order("created_at", { ascending: false })

  if (status) {
    query = query.eq("status", status)
  }

  const { data, error } = await query

  if (error) {
    console.error("Error fetching certificate requests:", error)
    return []
  }

  // Filter by school
  const filteredData = (data || []).filter(
    (r: any) => r.student?.school_id === schoolId
  )

  return filteredData
}

// Approve a certificate request
export async function approveCertificateRequest(
  requestId: string,
  processedBy: string,
  remarks?: string
): Promise<CertificateRequest> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("certificate_requests")
    .update({
      status: "Approved",
      processed_by: processedBy,
      processed_at: new Date().toISOString(),
      remarks: remarks || null,
    })
    .eq("id", requestId)
    .select()
    .single()

  if (error) {
    console.error("Error approving certificate request:", error)
    throw error
  }

  return data
}

// Reject a certificate request
export async function rejectCertificateRequest(
  requestId: string,
  processedBy: string,
  remarks: string
): Promise<CertificateRequest> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("certificate_requests")
    .update({
      status: "Rejected",
      processed_by: processedBy,
      processed_at: new Date().toISOString(),
      remarks: remarks,
    })
    .eq("id", requestId)
    .select()
    .single()

  if (error) {
    console.error("Error rejecting certificate request:", error)
    throw error
  }

  return data
}

// Mark certificate request as generated (after certificate is created)
export async function markCertificateRequestAsGenerated(
  requestId: string
): Promise<CertificateRequest> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("certificate_requests")
    .update({
      status: "Generated",
    })
    .eq("id", requestId)
    .select()
    .single()

  if (error) {
    console.error("Error marking certificate request as generated:", error)
    throw error
  }

  return data
}

// Get certificate request by ID
export async function getCertificateRequestById(
  requestId: string
): Promise<CertificateRequest | null> {
  const supabase = getSupabaseClient()

  const { data, error } = await supabase
    .from("certificate_requests")
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
    .eq("id", requestId)
    .single()

  if (error) {
    console.error("Error fetching certificate request:", error)
    return null
  }

  return data
}
