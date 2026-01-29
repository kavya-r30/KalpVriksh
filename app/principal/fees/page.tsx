"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/components/dashboard/data-table"
import { Badge } from "@/components/ui/badge"
import { IndianRupee, TrendingUp, AlertCircle, CheckCircle, Plus } from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { getSupabaseClient } from "@/lib/supabase"
import { getPrincipalDashboardStatsForUser, getClasses } from "@/lib/api/supabase-queries"
import { useRole } from "@/contexts/role-context"
import { InlineSelect } from "@/components/ui/inline-select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { FeeStructureView } from "@/components/fees/fee-structure-view"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createFeeStructure, FEE_CATEGORIES } from "@/lib/api/payment-service"
import { toast } from "sonner"
import { Loader2 } from "lucide-react"

export default function FeesPage() {
  const { userId } = useRole()
  const [feeRecords, setFeeRecords] = useState<any[]>([])
  const [schoolId, setSchoolId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [classes, setClasses] = useState<any[]>([])
  const [dialogOpen, setDialogOpen] = useState(false)
  const [creating, setCreating] = useState(false)
  const [newFee, setNewFee] = useState({
    class_id: "",
    fee_type: "",
    amount: "",
    due_date: "",
    academic_year: getCurrentAcademicYear()
  })
  const supabase = getSupabaseClient()

  function getCurrentAcademicYear() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`
  }

  useEffect(() => {
    async function fetchData() {
      if (!userId) return
      try {
        const stats = await getPrincipalDashboardStatsForUser(userId)
        setSchoolId(stats.schoolId)

        const classesData = await getClasses(stats.schoolId)
        setClasses(classesData || [])

        const { data: students } = await supabase.from("students").select("id").eq("school_id", stats.schoolId)

        if (!students || students.length === 0) {
          setFeeRecords([])
          setLoading(false)
          return
        }

        const studentIds = students.map((s) => s.id)

        const { data, error } = await supabase
          .from("student_fees")
          .select(`
            *,
            student:students(first_name, last_name, admission_number),
            fee_structure:fee_structures(fee_type)
          `)
          .in("student_id", studentIds)
          .order("due_date", { ascending: false })

        if (error) throw error
        setFeeRecords(data || [])
      } catch (error) {
        console.error("[v0] Error fetching fee records:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const handleCreateFee = async () => {
    if (!newFee.class_id || !newFee.fee_type || !newFee.amount || !newFee.due_date) {
      toast.error("Please fill all required fields")
      return
    }

    if (!schoolId) {
      toast.error("School not found")
      return
    }

    setCreating(true)
    try {
      await createFeeStructure({
        school_id: schoolId,
        class_id: newFee.class_id,
        fee_type: newFee.fee_type,
        amount: parseFloat(newFee.amount),
        due_date: newFee.due_date,
        academic_year: newFee.academic_year
      })
      toast.success("Fee structure created successfully")
      setDialogOpen(false)
      setNewFee({
        class_id: "",
        fee_type: "",
        amount: "",
        due_date: "",
        academic_year: getCurrentAcademicYear()
      })
      window.location.reload()
    } catch (error: any) {
      console.error("Error creating fee:", error)
      toast.error(error.message || "Failed to create fee structure")
    } finally {
      setCreating(false)
    }
  }

  const filteredRecords = statusFilter === "all" ? feeRecords : feeRecords.filter((r) => r.status === statusFilter)

  const totalAmount = feeRecords.reduce((sum, r) => sum + (r.total_amount || 0), 0)
  const paidAmount = feeRecords.reduce((sum, r) => sum + (r.paid_amount || 0), 0)
  const pendingRecords = feeRecords.filter((r) => r.status === "Pending" || r.status === "Partial")
  const pendingAmount = pendingRecords.reduce((sum, r) => sum + (r.balance_amount || 0), 0)
  const overdueRecords = feeRecords.filter((r) => r.status === "Overdue")
  const overdueAmount = overdueRecords.reduce((sum, r) => sum + (r.balance_amount || 0), 0)

  const columns = [
    {
      key: "student",
      label: "Student",
      render: (record: any) => (
        <div>
          <div className="font-medium">
            {record.student?.first_name} {record.student?.last_name}
          </div>
          <div className="text-xs text-muted-foreground">{record.student?.admission_number}</div>
        </div>
      ),
    },
    {
      key: "fee_type",
      label: "Fee Type",
      render: (record: any) => <Badge variant="outline">{record.fee_structure?.fee_type || "General"}</Badge>,
    },
    {
      key: "total_amount",
      label: "Total Amount",
      render: (record: any) => `₹${record.total_amount?.toLocaleString()}`,
    },
    {
      key: "paid_amount",
      label: "Paid",
      render: (record: any) => `₹${record.paid_amount?.toLocaleString()}`,
    },
    {
      key: "balance",
      label: "Balance",
      render: (record: any) => `₹${record.balance_amount?.toLocaleString()}`,
    },
    {
      key: "due_date",
      label: "Due Date",
      render: (record: any) => new Date(record.due_date).toLocaleDateString(),
    },
    {
      key: "status",
      label: "Status",
      render: (record: any) => {
        const colors: Record<string, string> = {
          Paid: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200",
          Pending: "bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200",
          Partial: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200",
          Overdue: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200",
        }
        return (
          <Badge className={colors[record.status] || ""} variant="secondary">
            {record.status}
          </Badge>
        )
      },
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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fee Management</h2>
          <p className="text-muted-foreground mt-1">Track and manage student fee payments</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Fee Structure
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add Fee Structure</DialogTitle>
              <DialogDescription>
                Create a new fee structure for a class
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label>Class *</Label>
                <Select
                  value={newFee.class_id}
                  onValueChange={(value) => setNewFee({ ...newFee, class_id: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select class" />
                  </SelectTrigger>
                  <SelectContent>
                    {classes.map((cls) => (
                      <SelectItem key={cls.id} value={cls.id}>
                        {cls.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Fee Type *</Label>
                <Select
                  value={newFee.fee_type}
                  onValueChange={(value) => setNewFee({ ...newFee, fee_type: value })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select fee type" />
                  </SelectTrigger>
                  <SelectContent>
                    {FEE_CATEGORIES.map((cat) => (
                      <SelectItem key={cat.id} value={cat.fee_type}>
                        {cat.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div className="space-y-2">
                <Label>Amount *</Label>
                <div className="relative">
                  <IndianRupee className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                  <Input
                    type="number"
                    placeholder="Enter amount"
                    className="pl-9"
                    value={newFee.amount}
                    onChange={(e) => setNewFee({ ...newFee, amount: e.target.value })}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Due Date *</Label>
                <Input
                  type="date"
                  value={newFee.due_date}
                  onChange={(e) => setNewFee({ ...newFee, due_date: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label>Academic Year</Label>
                <Input
                  value={newFee.academic_year}
                  onChange={(e) => setNewFee({ ...newFee, academic_year: e.target.value })}
                  placeholder="e.g., 2024-2025"
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)}>
                Cancel
              </Button>
              <Button onClick={handleCreateFee} disabled={creating}>
                {creating && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
                Create Fee
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Expected"
          value={`₹${totalAmount.toLocaleString()}`}
          icon={IndianRupee}
          description="Total fee amount"
          variant="blue"
        />
        <StatCard
          title="Collected"
          value={`₹${paidAmount.toLocaleString()}`}
          icon={CheckCircle}
          description="Successfully collected"
          variant="green"
        />
        <StatCard
          title="Pending"
          value={`₹${pendingAmount.toLocaleString()}`}
          icon={TrendingUp}
          description="Awaiting payment"
          variant="orange"
        />
        <StatCard
          title="Overdue"
          value={`₹${overdueAmount.toLocaleString()}`}
          icon={AlertCircle}
          description="Past due date"
          variant="purple"
        />
      </div>

      <Tabs defaultValue="records" className="space-y-4">
        <TabsList>
          <TabsTrigger value="records">Fee Records</TabsTrigger>
          <TabsTrigger value="structure">Fee Structure</TabsTrigger>
        </TabsList>

        <TabsContent value="records" className="space-y-4">
          <div className="flex justify-end">
            <InlineSelect
              label="Status"
              placeholder="All Status"
              value={statusFilter}
              onChange={setStatusFilter}
              options={[
                { label: "All Status", value: "all" },
                { label: "Paid", value: "Paid" },
                { label: "Pending", value: "Pending" },
                { label: "Partial", value: "Partial" },
                { label: "Overdue", value: "Overdue" },
              ]}
            />
          </div>
          <DataTable
            title="Fee Records"
            description={`Showing ${filteredRecords.length} of ${feeRecords.length} records`}
            data={filteredRecords}
            columns={columns}
            searchable
            downloadable
          />
        </TabsContent>

        <TabsContent value="structure">
          {schoolId && (
            <FeeStructureView
              schoolId={schoolId}
              showClassFilter={true}
              title="School Fee Structure"
              description="View detailed fee structure for all classes"
            />
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
