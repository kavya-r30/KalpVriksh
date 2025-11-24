"use client"

import type React from "react"
import { useRole } from "@/contexts/role-context"
import { useEffect, useState } from "react"
import { getStudentByUserId } from "@/lib/api/supabase-queries"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { LayoutDashboard, Calendar, ClipboardList, DollarSign, Award, FileText, MessageSquare } from "lucide-react"

const navItems = [
  { title: "Dashboard", href: "/student", icon: LayoutDashboard },
  { title: "Attendance", href: "/student/attendance", icon: Calendar },
  { title: "Marks & Results", href: "/student/marks", icon: ClipboardList },
  { title: "Fees", href: "/student/fees", icon: DollarSign },
  { title: "Skills & Achievements", href: "/student/skills", icon: Award },
  { title: "Certificates", href: "/student/certificates", icon: FileText },
  { title: "Messages", href: "/student/messages", icon: MessageSquare },
]

export default function StudentLayout({ children }: { children: React.ReactNode }) {
  const { userId } = useRole()
  const [student, setStudent] = useState<any>(null)

  useEffect(() => {
    async function fetchStudent() {
      if (userId) {
        const data = await getStudentByUserId(userId)
        setStudent(data)
      }
    }
    fetchStudent()
  }, [userId])

  return (
    <DashboardLayout
      navItems={navItems}
      title="Student Dashboard"
      userInfo={{
        name: student ? `${student.first_name} ${student.last_name}` : "Student",
        role: "student",
        email: student?.email || "student@school.gov.in",
      }}
    >
      {children}
    </DashboardLayout>
  )
}
