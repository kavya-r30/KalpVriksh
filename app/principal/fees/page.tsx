"use client"

import { useEffect, useState } from "react"
import { DataTable } from "@/components/dashboard/data-table"
import { Badge } from "@/components/ui/badge"
import { DollarSign, TrendingUp, AlertCircle, CheckCircle } from "lucide-react"
import { StatCard } from "@/components/dashboard/stat-card"
import { getSupabaseClient } from "@/lib/supabase"
import { getPrincipalDashboardStatsForUser } from "@/lib/api/supabase-queries"
import { useRole } from "@/contexts/role-context"
import { InlineSelect } from "@/components/ui/inline-select"

export default function FeesPage() {
  const { userId } = useRole()
  const [feeRecords, setFeeRecords] = useState<any[]>([])
  const [schoolId, setSchoolId] = useState<string>("")
  const [loading, setLoading] = useState(true)
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchData() {
      if (!userId) return
      try {
        const stats = await getPrincipalDashboardStatsForUser(userId)
        setSchoolId(stats.schoolId)

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

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        <StatCard
          title="Total Expected"
          value={`₹${totalAmount.toLocaleString()}`}
          icon={DollarSign}
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

      <DataTable
        title="Fee Records"
        description={`Showing ${filteredRecords.length} of ${feeRecords.length} records`}
        data={filteredRecords}
        columns={columns}
        searchable
        downloadable
      />
    </div>
  )
}
