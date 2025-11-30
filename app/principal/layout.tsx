"use client"

import type React from "react"

import { DashboardLayout } from "@/components/layout/dashboard-layout"
import {
  LayoutDashboard,
  Users,
  GraduationCap,
  Calendar,
  ClipboardList,
  FileText,
  DollarSign,
  Award,
  ArrowRightLeft,
} from "lucide-react"
import { useEffect, useState } from "react"
import { useRole } from "@/contexts/role-context"
import { getStaffByUserId } from "@/lib/api/supabase-queries"

const navItems = [
  { title: "Dashboard", href: "/principal", icon: LayoutDashboard },
  { title: "Students", href: "/principal/students", icon: GraduationCap },
  { title: "Teachers", href: "/principal/teachers", icon: Users },
  { title: "Attendance", href: "/principal/attendance", icon: Calendar },
  { title: "Exams", href: "/principal/exams", icon: ClipboardList },
  { title: "Fees", href: "/principal/fees", icon: DollarSign },
  { title: "Certificates", href: "/principal/certificates", icon: Award },
  { title: "Transfers", href: "/principal/transfers", icon: ArrowRightLeft },
  { title: "Reports", href: "/principal/reports", icon: FileText },
]

export default function PrincipalLayout({ children }: { children: React.ReactNode }) {
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
      title="Principal Dashboard"
      userInfo={{
        name: `${staffInfo.first_name} ${staffInfo.last_name}`,
        role: "principal",
        email: staffInfo.users?.email || "",
      }}
    >
      {children}
    </DashboardLayout>
  )
}
