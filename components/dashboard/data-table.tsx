"use client"

import type React from "react"

import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Search, Download, Filter } from "lucide-react"
import { useState } from "react"

interface Column<T> {
  key: string
  label: string
  render?: (item: T) => React.ReactNode
}

interface DataTableProps<T> {
  title: string
  description?: string
  data: T[]
  columns: Column<T>[]
  searchable?: boolean
  downloadable?: boolean
  actions?: React.ReactNode
}

export function DataTable<T extends Record<string, any>>({
  title,
  description,
  data,
  columns,
  searchable = true,
  downloadable = false,
  actions,
}: DataTableProps<T>) {
  const [searchQuery, setSearchQuery] = useState("")

  const filteredData = searchQuery
    ? data.filter((item) =>
        Object.values(item).some((value) => String(value).toLowerCase().includes(searchQuery.toLowerCase())),
      )
    : data

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">{title}</CardTitle>
            {description && <CardDescription className="text-sm">{description}</CardDescription>}
          </div>
          {actions}
        </div>
        {(searchable || downloadable) && (
          <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 pt-4">
            {searchable && (
              <div className="relative flex-1 w-full sm:max-w-sm">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9 h-9 bg-background border-border/60"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" className="h-9 border-border/60 bg-transparent">
                <Filter className="h-4 w-4 mr-2" />
                Filter
              </Button>
              {downloadable && (
                <Button variant="outline" size="sm" className="h-9 border-border/60 bg-transparent">
                  <Download className="h-4 w-4 mr-2" />
                  Export
                </Button>
              )}
            </div>
          </div>
        )}
      </CardHeader>
      <CardContent className="pt-0">
        <div className="rounded-lg border border-border/50 overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="bg-muted/30 hover:bg-muted/30">
                {columns.map((column) => (
                  <TableHead key={column.key} className="font-semibold text-foreground">
                    {column.label}
                  </TableHead>
                ))}
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredData.length === 0 ? (
                <TableRow className="hover:bg-transparent">
                  <TableCell colSpan={columns.length} className="h-32 text-center text-muted-foreground">
                    No results found.
                  </TableCell>
                </TableRow>
              ) : (
                filteredData.map((item, index) => (
                  <TableRow key={index} className="hover:bg-muted/20">
                    {columns.map((column) => (
                      <TableCell key={column.key} className="py-3">
                        {column.render ? column.render(item) : item[column.key]}
                      </TableCell>
                    ))}
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </div>
      </CardContent>
    </Card>
  )
}
