"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { getFeeStructures, FEE_CATEGORIES } from "@/lib/api/payment-service"
import { getClasses } from "@/lib/api/supabase-queries"
import { Loader2, IndianRupee, Calendar, GraduationCap, Info } from "lucide-react"

interface FeeStructureViewProps {
  schoolId: string
  showClassFilter?: boolean
  title?: string
  description?: string
}

export function FeeStructureView({
  schoolId,
  showClassFilter = true,
  title = "Fee Structure",
  description = "View the fee structure for the academic year"
}: FeeStructureViewProps) {
  const [loading, setLoading] = useState(true)
  const [feeStructures, setFeeStructures] = useState<any[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [academicYear] = useState(getCurrentAcademicYear())

  function getCurrentAcademicYear() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`
  }

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true)
        const [classesData, feesData] = await Promise.all([
          getClasses(schoolId),
          getFeeStructures(schoolId, selectedClass === "all" ? undefined : selectedClass)
        ])
        setClasses(classesData || [])
        setFeeStructures(feesData || [])
      } catch (error) {
        console.error("Error loading fee structures:", error)
      } finally {
        setLoading(false)
      }
    }
    loadData()
  }, [schoolId, selectedClass])

  const handleClassChange = async (value: string) => {
    setSelectedClass(value)
  }

  // Group fees by class
  const feesByClass = feeStructures.reduce((acc, fee) => {
    const className = fee.class?.name || "General"
    if (!acc[className]) {
      acc[className] = []
    }
    acc[className].push(fee)
    return acc
  }, {} as Record<string, any[]>)

  // Calculate totals per class
  const classTotals = Object.entries(feesByClass).map(([className, fees]) => ({
    className,
    total: (fees as any[]).reduce((sum, f) => sum + (f.amount || 0), 0),
    fees: fees as any[]
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold tracking-tight">{title}</h2>
          <p className="text-muted-foreground">{description}</p>
        </div>
        <div className="flex items-center gap-4">
          <Badge variant="outline" className="text-sm">
            <Calendar className="h-3 w-3 mr-1" />
            AY {academicYear}
          </Badge>
          {showClassFilter && (
            <Select value={selectedClass} onValueChange={handleClassChange}>
              <SelectTrigger className="w-[180px]">
                <SelectValue placeholder="Filter by class" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Classes</SelectItem>
                {classes.map((cls) => (
                  <SelectItem key={cls.id} value={cls.id}>
                    {cls.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      </div>

      {/* Fee Categories Info */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-lg">
            <Info className="h-5 w-5" />
            Fee Categories
          </CardTitle>
          <CardDescription>Types of fees applicable in the school</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
            {FEE_CATEGORIES.map((category) => (
              <div
                key={category.id}
                className="p-3 rounded-lg border bg-muted/30 hover:bg-muted/50 transition-colors"
              >
                <p className="font-medium text-sm">{category.name}</p>
                <p className="text-xs text-muted-foreground mt-1">{category.description}</p>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Fee Structure by Class */}
      <Tabs defaultValue={classTotals[0]?.className || "overview"} className="space-y-4">
        <TabsList className="flex flex-wrap h-auto gap-1">
          <TabsTrigger value="overview">Overview</TabsTrigger>
          {classTotals.map((item) => (
            <TabsTrigger key={item.className} value={item.className}>
              {item.className}
            </TabsTrigger>
          ))}
        </TabsList>

        <TabsContent value="overview">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <GraduationCap className="h-5 w-5" />
                Fee Summary by Class
              </CardTitle>
              <CardDescription>Total fees applicable for each class</CardDescription>
            </CardHeader>
            <CardContent>
              {classTotals.length === 0 ? (
                <p className="text-center text-muted-foreground py-8">
                  No fee structures defined yet
                </p>
              ) : (
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Class</TableHead>
                      <TableHead>Fee Components</TableHead>
                      <TableHead className="text-right">Total Annual Fee</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {classTotals.map((item) => (
                      <TableRow key={item.className}>
                        <TableCell className="font-medium">{item.className}</TableCell>
                        <TableCell>
                          <div className="flex flex-wrap gap-1">
                            {item.fees.map((fee: any) => (
                              <Badge key={fee.id} variant="secondary" className="text-xs">
                                {fee.fee_type}
                              </Badge>
                            ))}
                          </div>
                        </TableCell>
                        <TableCell className="text-right font-semibold">
                          <span className="flex items-center justify-end gap-1">
                            <IndianRupee className="h-4 w-4" />
                            {item.total.toLocaleString()}
                          </span>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        {classTotals.map((item) => (
          <TabsContent key={item.className} value={item.className}>
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div>
                    <CardTitle>{item.className} - Fee Structure</CardTitle>
                    <CardDescription>Detailed breakdown of fees for {item.className}</CardDescription>
                  </div>
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Total Annual Fee</p>
                    <p className="text-2xl font-bold flex items-center gap-1">
                      <IndianRupee className="h-5 w-5" />
                      {item.total.toLocaleString()}
                    </p>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>Fee Type</TableHead>
                      <TableHead>Description</TableHead>
                      <TableHead>Due Date</TableHead>
                      <TableHead className="text-right">Amount</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {item.fees.map((fee: any) => {
                      const category = FEE_CATEGORIES.find(c => c.fee_type === fee.fee_type)
                      return (
                        <TableRow key={fee.id}>
                          <TableCell className="font-medium">{fee.fee_type}</TableCell>
                          <TableCell className="text-muted-foreground">
                            {category?.description || "-"}
                          </TableCell>
                          <TableCell>
                            {fee.due_date ? new Date(fee.due_date).toLocaleDateString("en-IN", {
                              day: "numeric",
                              month: "short",
                              year: "numeric"
                            }) : "-"}
                          </TableCell>
                          <TableCell className="text-right font-medium">
                            <span className="flex items-center justify-end gap-1">
                              <IndianRupee className="h-3 w-3" />
                              {fee.amount?.toLocaleString() || 0}
                            </span>
                          </TableCell>
                        </TableRow>
                      )
                    })}
                    <TableRow className="bg-muted/50">
                      <TableCell colSpan={3} className="font-semibold">Total</TableCell>
                      <TableCell className="text-right font-bold">
                        <span className="flex items-center justify-end gap-1">
                          <IndianRupee className="h-4 w-4" />
                          {item.total.toLocaleString()}
                        </span>
                      </TableCell>
                    </TableRow>
                  </TableBody>
                </Table>
              </CardContent>
            </Card>
          </TabsContent>
        ))}
      </Tabs>

      {/* Payment Terms */}
      <Card>
        <CardHeader>
          <CardTitle>Payment Terms & Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <h4 className="font-medium">Payment Methods Accepted</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• UPI (Google Pay, PhonePe, Paytm, etc.)</li>
                <li>• Credit/Debit Cards</li>
                <li>• Net Banking</li>
                <li>• Cash at school office</li>
                <li>• Cheque/DD (payable to school)</li>
              </ul>
            </div>
            <div className="space-y-2">
              <h4 className="font-medium">Important Notes</h4>
              <ul className="text-sm text-muted-foreground space-y-1">
                <li>• Fees must be paid by the due date to avoid late charges</li>
                <li>• 2% late fee applies after due date</li>
                <li>• Fee receipts are generated automatically</li>
                <li>• Contact accounts office for any queries</li>
              </ul>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
