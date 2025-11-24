"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/components/dashboard/data-table"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { getSchools } from "@/lib/api/supabase-queries"
import { Badge } from "@/components/ui/badge"
import { InlineSelect } from "@/components/ui/inline-select"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default function SchoolsPage() {
  const [schools, setSchools] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [boardFilter, setBoardFilter] = useState<string>("all")

  useEffect(() => {
    async function fetchSchools() {
      try {
        const data = await getSchools()
        setSchools(data || [])
      } catch (error) {
        console.error("[v0] Error fetching schools:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchSchools()
  }, [])

  const filteredSchools = boardFilter === "all" ? schools : schools.filter((s) => s.board === boardFilter)

  const uniqueBoards = Array.from(new Set(schools.map((s) => s.board).filter(Boolean)))

  const locationDistribution = schools.reduce((acc: any, school) => {
    const state = school.state || "Unknown"
    acc[state] = (acc[state] || 0) + 1
    return acc
  }, {})

  const columns = [
    { key: "school_code", label: "School Code" },
    {
      key: "name",
      label: "School Name",
      render: (school: any) => <div className="font-medium">{school.name}</div>,
    },
    {
      key: "location",
      label: "Location",
      render: (school: any) => (
        <div className="text-sm text-muted-foreground">
          {school.city}, {school.state}
        </div>
      ),
    },
    {
      key: "board",
      label: "Board",
      render: (school: any) => <Badge variant="secondary">{school.board || "N/A"}</Badge>,
    },
    { key: "phone", label: "Contact" },
    {
      key: "actions",
      label: "Actions",
      render: (school: any) => (
        <div className="flex gap-2">
          <Button
            variant="ghost"
            size="sm"
            className="text-blue-600 hover:text-blue-700 hover:bg-blue-50 dark:hover:bg-blue-950/50"
            asChild
          >
            <Link href={`/admin/schools/${school.id}`}>View</Link>
          </Button>
        </div>
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
      <div className="grid gap-4 md:grid-cols-3 mb-8">
        <Card className="bg-gradient-to-br from-blue-500/10 to-cyan-500/10 border-blue-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Schools</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-blue-600 dark:text-blue-400">{schools.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-purple-500/10 to-pink-500/10 border-purple-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Boards</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-purple-600 dark:text-purple-400">{uniqueBoards.length}</div>
          </CardContent>
        </Card>
        <Card className="bg-gradient-to-br from-orange-500/10 to-red-500/10 border-orange-500/20">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Locations</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-3xl font-bold text-orange-600 dark:text-orange-400">
              {Object.keys(locationDistribution).length}
            </div>
          </CardContent>
        </Card>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-4">
        <InlineSelect
          label="Filter by Board"
          placeholder="All Boards"
          value={boardFilter}
          onChange={setBoardFilter}
          options={[
            { label: "All Boards", value: "all" },
            ...uniqueBoards.map((board) => ({ label: board, value: board })),
          ]}
        />
        <Button asChild className="bg-primary hover:bg-primary/90">
          <Link href="/admin/schools/new">
            <Plus className="mr-2 h-4 w-4" />
            Add School
          </Link>
        </Button>
      </div>

      <DataTable
        title="All Schools"
        description={`Showing ${filteredSchools.length} of ${schools.length} schools`}
        data={filteredSchools}
        columns={columns}
        searchable
        downloadable
      />
    </div>
  )
}
