"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { LayoutDashboard, Users, Calendar, ClipboardList, BookOpen, MessageSquare, Award, Bell, Clock, IndianRupee } from "lucide-react"
import { useEffect, useState } from "react"
import { useRole } from "@/contexts/role-context"
import { getStaffByUserId } from "@/lib/api/supabase-queries"

const navItems = [
  { title: "Dashboard", href: "/teacher", icon: LayoutDashboard },
  { title: "My Classes", href: "/teacher/classes", icon: Users },
  { title: "Timetable", href: "/teacher/timetable", icon: Clock },
  { title: "Attendance", href: "/teacher/attendance", icon: Calendar },
  { title: "Assignments", href: "/teacher/assignments", icon: BookOpen },
  { title: "Marks Entry", href: "/teacher/marks", icon: ClipboardList },
  { title: "Student Skills", href: "/teacher/skills", icon: Award },
  { title: "Fees", href: "/teacher/fees", icon: IndianRupee },
  { title: "Announcements", href: "/teacher/announcements", icon: Bell },
  { title: "Messages", href: "/teacher/messages", icon: MessageSquare },
]

export default function TeacherLayout({ children }: { children: React.ReactNode }) {
  const { userId } = useRole()
  const [staffInfo, setStaffInfo] = useState<any>(null)

  useEffect(() => {
    async function fetchStaffInfo() {
      if (!userId) return
      try {
        const staff = await getStaffByUserId(userId)
        setStaffInfo(staff)
      } catch (error) {
        console.error("[v0] Error fetching staff info:", error)
      }
    }
    fetchStaffInfo()
  }, [userId])

  if (!staffInfo) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <DashboardLayout
      navItems={navItems}
      title="Teacher Dashboard"
      userInfo={{
        name: `${staffInfo.first_name} ${staffInfo.last_name}`,
        role: "teacher",
        email: staffInfo.users?.email || "",
      }}
    >
      {children}
    </DashboardLayout>
  )
}
