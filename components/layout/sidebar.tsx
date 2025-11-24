"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip"
import { LogOut } from "lucide-react"
import { useRole } from "@/contexts/role-context"
import { useRouter } from "next/navigation"
import type { LucideIcon } from "lucide-react"
import Image from "next/image"

interface NavItem {
  title: string
  href: string
  icon: LucideIcon
}

interface SidebarProps {
  navItems: NavItem[]
}

export function Sidebar({ navItems }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const { setRole, setUserId } = useRole()

  const handleLogout = () => {
    setRole(null as any)
    setUserId("")
    router.push("/")
  }

  return (
    <aside className="hidden md:flex flex-col fixed inset-y-4 left-4 z-50 w-16 items-center justify-between rounded-2xl border bg-background/80 backdrop-blur-md shadow-lg py-6">
      <div className="flex flex-col items-center gap-6">
        <Image
          src={'./favicon.png'} width={10} height={10} alt="Logo" onClick={handleLogout}
          className="flex w-10 items-center justify-center rounded-xl hover:scale-105 transition-transform"
        />

        <TooltipProvider delayDuration={0}>
          <nav className="flex flex-col gap-3 px-2">
            {navItems.map((item) => {
              const isActive = pathname === item.href || pathname.startsWith(item.href + "/")
              return (
                <Tooltip key={item.href}>
                  <TooltipTrigger asChild>
                    <Link
                      href={item.href}
                      className={cn(
                        "flex h-10 w-10 items-center justify-center rounded-xl transition-all hover:scale-105",
                        isActive
                          ? "bg-primary text-primary-foreground shadow-md shadow-primary/25"
                          : "text-muted-foreground hover:bg-secondary hover:text-secondary-foreground",
                      )}
                    >
                      <item.icon className="h-5 w-5" />
                      <span className="sr-only">{item.title}</span>
                    </Link>
                  </TooltipTrigger>
                  <TooltipContent side="right" className="font-medium" sideOffset={10}>
                    {item.title}
                  </TooltipContent>
                </Tooltip>
              )
            })}
          </nav>
        </TooltipProvider>
      </div>

      <div className="flex flex-col items-center gap-4">
        <TooltipProvider delayDuration={0}>
          <Tooltip>
            <TooltipTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                className="h-10 w-10 rounded-xl text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                onClick={handleLogout}
              >
                <LogOut className="h-5 w-5" />
                <span className="sr-only">Logout</span>
              </Button>
            </TooltipTrigger>
            <TooltipContent side="right" className="font-medium text-destructive" sideOffset={10}>
              Logout
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  )
}
