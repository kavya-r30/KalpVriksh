"use client"

import { createContext, useContext, useState, useEffect, type ReactNode } from "react"
import type { UserRole } from "@/lib/types/database"

interface RoleContextType {
  role: UserRole | null
  userId: string | null
  setRole: (role: UserRole) => void
  setUserId: (id: string) => void
}

const RoleContext = createContext<RoleContextType | undefined>(undefined)

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<UserRole | null>(null)
  const [userId, setUserIdState] = useState<string | null>(null)

  const setRole = (newRole: UserRole) => {
    setRoleState(newRole)
  }

  const setUserId = (id: string) => {
    setUserIdState(id)
  }

  return <RoleContext.Provider value={{ role, userId, setRole, setUserId }}>{children}</RoleContext.Provider>
}

export function useRole() {
  const context = useContext(RoleContext)
  if (context === undefined) {
    throw new Error("useRole must be used within a RoleProvider")
  }
  return context
}
