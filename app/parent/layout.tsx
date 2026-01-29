"use client"

import type React from "react"
import { DashboardLayout } from "@/components/layout/dashboard-layout"
import {
  LayoutDashboard,
  Users,
  Calendar,
  TrendingUp,
  IndianRupee,
  Award,
  MessageSquare,
  ArrowRightLeft,
  Bell,
  FileText,
  Clock,
} from "lucide-react"
import { useRole } from "@/contexts/role-context"
import { useEffect, useState } from "react"
import { getParentByUserId } from "@/lib/api/supabase-queries"

const navItems = [
  { title: "Dashboard", href: "/parent", icon: LayoutDashboard },
  { title: "My Children", href: "/parent/children", icon: Users },
  { title: "Attendance", href: "/parent/attendance", icon: Calendar },
  { title: "Timetable", href: "/parent/timetable", icon: Clock },
  { title: "Academic Progress", href: "/parent/progress", icon: TrendingUp },
  { title: "Fee Payments", href: "/parent/fees", icon: IndianRupee },
  { title: "Certificates", href: "/parent/certificates", icon: FileText },
  { title: "Achievements", href: "/parent/achievements", icon: Award },
  { title: "Notifications", href: "/parent/notifications", icon: Bell },
  { title: "Transfer", href: "/parent/transfer", icon: ArrowRightLeft },
  { title: "Messages", href: "/parent/messages", icon: MessageSquare },
]

export default function ParentLayout({ children }: { children: React.ReactNode }) {
  const { userId } = useRole()
  const [parent, setParent] = useState<any>(null)

  useEffect(() => {
    async function fetchParent() {
      if (!userId) return
      try {
        const data = await getParentByUserId(userId)
        setParent(data)
      } catch (e) {
        console.error(e)
      }
    }
    fetchParent()
  }, [userId])

  if (!parent) {
    return (
      <div className="flex items-center justify-center h-screen">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <DashboardLayout
      navItems={navItems}
      title="Parent Dashboard"
      userInfo={{
        name: `${parent.first_name} ${parent.last_name}`,
        role: "parent",
        email: parent.user?.email || parent.email || "",
      }}
    >
      {children}
    </DashboardLayout>
  )
}
