"use client"

import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { LogOut, Settings, User, Menu, Bell } from "lucide-react"
import { cn } from "@/lib/utils"
import { useRole } from "@/contexts/role-context"
import type { LucideIcon } from "lucide-react"
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet"
import { useState } from "react"
import { AnnouncementsModal } from "@/components/common/announcements-modal"
import { NotificationCenter } from "@/components/notifications"
import Image from "next/image"

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

interface TopNavbarProps {
  navItems: NavItem[]
  userInfo: {
    name: string
    role: string
    email?: string
  }
  showMobileMenu?: boolean
}

export function TopNavbar({ navItems, userInfo, showMobileMenu = true }: TopNavbarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { setRole, setUserId } = useRole()
  const [mobileOpen, setMobileOpen] = useState(false)

  const handleLogout = () => {
    setRole(null as any)
    setUserId("")
    router.push("/")
  }

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-background md:border-none md:bg-transparent md:pt-4 md:px-8">
      <div className="container flex h-16 items-center justify-between px-4 md:px-0">
        <div className="flex items-center gap-8">
          <Link href="/" className="flex items-center gap-2 md:hidden">
            <div className="h-8 w-8 rounded-lg bg-primary flex items-center justify-center">
              <span className="text-primary-foreground font-bold text-sm">SMS</span>
            </div>
            <span className="font-bold text-lg tracking-tight">School MS</span>
          </Link>
        </div>

        <div className="flex items-center gap-2">
          <Button variant="ghost" size="icon" onClick={() => router.push(`/${userInfo.role}/chat`)}
            className="relative rounded-full text-muted-foreground hover:text-foreground">
            <Image src={'./ai.svg'} width={5} height={5} alt="AI" className="h-5 w-5" />
          </Button>

          <NotificationCenter />

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                variant="ghost"
                className="gap-2 pl-1 pr-3 rounded-full border border-border/50 hover:bg-secondary/50"
              >
                <Avatar className="h-8 w-8 border border-border">
                  <AvatarFallback className="bg-secondary text-secondary-foreground text-xs font-medium">
                    {userInfo.name
                      .split(" ")
                      .map((n) => n[0])
                      .join("")
                      .toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="hidden md:flex flex-col items-start text-xs">
                  <span className="font-medium">{userInfo.name}</span>
                  <span className="text-muted-foreground capitalize">{userInfo.role}</span>
                </div>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-56">
              <DropdownMenuLabel>
                <div className="flex flex-col space-y-1">
                  <p className="text-sm font-medium">{userInfo.name}</p>
                  <p className="text-xs text-muted-foreground">{userInfo.email || userInfo.role}</p>
                </div>
              </DropdownMenuLabel>
              <DropdownMenuSeparator />
              <DropdownMenuItem>
                <User className="mr-2 h-4 w-4" />
                Profile
              </DropdownMenuItem>
              <DropdownMenuItem>
                <Settings className="mr-2 h-4 w-4" />
                Settings
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive">
                <LogOut className="mr-2 h-4 w-4" />
                Logout
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          {showMobileMenu && (
            <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
              <SheetTrigger asChild>
                <Button variant="ghost" size="icon" className="md:hidden">
                  <Menu className="h-5 w-5" />
                </Button>
              </SheetTrigger>
              <SheetContent side="right" className="w-72">
                <div className="flex flex-col gap-6 pt-6">
                  <div className="flex items-center gap-2">
                    <div className="h-8 w-8 rounded-xl bg-primary flex items-center justify-center">
                      <span className="text-primary-foreground font-bold text-sm">SMS</span>
                    </div>
                    <span className="font-bold text-lg">School MS</span>
                  </div>
                  <nav className="flex flex-col gap-1">
                    {navItems.map((item) => {
                      const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          onClick={() => setMobileOpen(false)}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                            isActive
                              ? "bg-primary text-primary-foreground"
                              : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
                          )}
                        >
                          <item.icon className="h-5 w-5" />
                          {item.title}
                        </Link>
                      )
                    })}
                  </nav>
                </div>
              </SheetContent>
            </Sheet>
          )}
        </div>
      </div>
    </header>
  )
}
