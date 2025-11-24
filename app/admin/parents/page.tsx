"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { getSupabaseClient } from "@/lib/supabase"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Card, CardContent } from "@/components/ui/card"

export default function ParentsPage() {
  const [parents, setParents] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchParents() {
      try {
        const { data, error } = await supabase.from("parents").select("*, users(email)").order("first_name")

        if (error) throw error
        setParents(data || [])
      } catch (error) {
        console.error("Error fetching parents:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchParents()
  }, [])

  const columns = [
    {
      key: "parent",
      label: "Parent",
      render: (parent: any) => (
        <div className="flex items-center gap-3">
          <Avatar className="h-9 w-9 border border-border">
            <AvatarFallback className="text-xs">
              {parent.first_name[0]}
              {parent.last_name[0]}
            </AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">
              {parent.first_name} {parent.last_name}
            </div>
            <div className="text-xs text-muted-foreground">{parent.users?.email}</div>
          </div>
        </div>
      ),
    },
    {
      key: "phone",
      label: "Phone",
      render: (parent: any) => parent.phone || "N/A",
    },
    {
      key: "occupation",
      label: "Occupation",
      render: (parent: any) => parent.occupation || "N/A",
    },
    {
      key: "address",
      label: "Address",
      render: (parent: any) => (
        <div className="text-sm text-muted-foreground max-w-xs truncate">{parent.address || "N/A"}</div>
      ),
    },
    {
      key: "actions",
      label: "Actions",
      render: (parent: any) => (
        <Button variant="ghost" size="sm" className="text-orange-600 hover:text-orange-700" asChild>
          <Link href={`/admin/parents/${parent.id}`}>View</Link>
        </Button>
      ),
    },
  ]

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <Card className="bg-linear-to-r from-orange-500/10 to-yellow-500/10 border-orange-200 dark:border-orange-800/30">
        <CardContent className="p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-3xl font-bold tracking-tight">Parents Directory</h2>
              <p className="text-muted-foreground mt-1">Manage parent records and guardian information</p>
            </div>
            <div className="text-center bg-white/50 dark:bg-black/20 p-4 rounded-xl backdrop-blur-sm">
              <div className="text-3xl font-bold text-orange-600">{parents.length}</div>
              <div className="text-xs text-muted-foreground">Total Families</div>
            </div>
          </div>
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button asChild className="bg-orange-600 hover:bg-orange-700">
          <Link href="/admin/parents/new">
            <Plus className="mr-2 h-4 w-4" />
            Add Parent
          </Link>
        </Button>
      </div>

      <DataTable
        title="All Parents"
        description={`Total ${parents.length} parents registered`}
        data={parents}
        columns={columns}
        searchable
        downloadable
      />
    </div>
  )
}