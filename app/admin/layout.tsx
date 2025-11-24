"use client"

import type React from "react"
import { useEffect, useState } from "react"
import { useRole } from "@/contexts/role-context"
import { getSupabaseClient } from "@/lib/supabase"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import { School, Users, GraduationCap, UserCircle, LayoutDashboard, Settings, FileText, Bell } from "lucide-react"

const navItems = [
  { title: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { title: "Schools", href: "/admin/schools", icon: School },
  { title: "Students", href: "/admin/students", icon: GraduationCap },
  { title: "Teachers", href: "/admin/teachers", icon: Users },
  { title: "Parents", href: "/admin/parents", icon: UserCircle },
  { title: "Reports", href: "/admin/reports", icon: FileText },
  { title: "Notifications", href: "/admin/notifications", icon: Bell },
  { title: "Settings", href: "/admin/settings", icon: Settings },
]

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  const { userId } = useRole()
  const [adminUser, setAdminUser] = useState<any>(null)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchAdminUser() {
      if (!userId) return

      const { data, error } = await supabase
        .from("users")
        .select("email, first_name, last_name")
        .eq("id", userId)
        .single()

      if (data) {
        setAdminUser(data)
      }
    }

    fetchAdminUser()
  }, [userId])

  return (
    <DashboardLayout
      navItems={navItems}
      title="Administrator Dashboard"
      userInfo={{
        name: adminUser ? `${adminUser.first_name || "Admin"} ${adminUser.last_name || "User"}` : "Admin User",
        role: "admin",
        email: adminUser?.email || "admin@school.gov.in",
      }}
    >
      {children}
    </DashboardLayout>
  )
}
