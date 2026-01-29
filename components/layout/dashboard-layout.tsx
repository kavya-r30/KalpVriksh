"use client"

import type { ReactNode } from "react"
import { TopNavbar } from "@/components/layout/top-navbar"
import { Sidebar } from "@/components/layout/sidebar"
import type { LucideIcon } from "lucide-react"

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

interface DashboardLayoutProps {
  children: ReactNode
  navItems: NavItem[]
  title: string
  userInfo: {
    name: string
    role: string
    email?: string
  }
}

export function DashboardLayout({ children, navItems, title, userInfo }: DashboardLayoutProps) {
  return (
    <div className="min-h-screen bg-secondary/30 flex flex-col md:flex-row">
      <Sidebar navItems={navItems} />

      <div className="flex-1 flex flex-col md:pl-24">
        <TopNavbar navItems={navItems} userInfo={userInfo} showMobileMenu={true} />

        <main className="flex-1 container mx-auto px-4 -mt-12 mb-12 md:px-8 max-w-7xl animate-in fade-in slide-in-from-bottom-4 duration-500">
          <div className="flex flex-col gap-8">
            <div className="flex flex-col gap-1">
              <h1 className="text-3xl font-bold tracking-tight">{title}</h1>
              <p className="text-muted-foreground">Manage your school activities and view reports.</p>
            </div>
            {children}
          </div>
        </main>
      </div>
    </div>
  )
}
