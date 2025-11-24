"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InlineSelect } from "@/components/ui/inline-select"
import { getParentChildrenByUserId } from "@/lib/api/supabase-queries"
import { getSupabaseClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { DollarSign, Download, CreditCard, Calendar } from "lucide-react"
import { useRole } from "@/contexts/role-context"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Line, LineChart, ResponsiveContainer } from "recharts"

export default function FeesPage() {
  const { userId } = useRole()
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState("")
  const [fees, setFees] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const childrenData = await getParentChildrenByUserId(userId)
        setChildren(childrenData || [])
        if (childrenData && childrenData.length > 0) {
          setSelectedChild(childrenData[0].id)
        }
      } catch (error) {
        console.error("[v0] Error fetching children:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  useEffect(() => {
    async function fetchFees() {
      if (!selectedChild) return

      try {
        const supabase = getSupabaseClient()

        const [feesData, paymentsData] = await Promise.all([
          supabase
            .from("student_fees")
            .select(`
              *,
              fee_structure:fee_structures(fee_type, amount)
            `)
            .eq("student_id", selectedChild)
            .order("created_at", { ascending: false }),
          supabase
            .from("fee_payments")
            .select(`
              *,
              student_fee:student_fees!inner(student_id)
            `)
            .eq("student_fee.student_id", selectedChild)
            .order("payment_date", { ascending: false }),
        ])

        setFees(feesData.data || [])
        setPayments(paymentsData.data || [])
      } catch (error) {
        console.error("[v0] Error fetching fees:", error)
      }
    }

    fetchFees()
  }, [selectedChild])

  const totalDue = fees.reduce((sum, fee) => sum + (fee.balance_amount || 0), 0)
  const totalPaid = fees.reduce((sum, fee) => sum + (fee.paid_amount || 0), 0)
  const totalAmount = fees.reduce((sum, fee) => sum + (fee.total_amount || 0), 0)

  // Chart data for payment history
  const paymentChartData = payments
    .slice(0, 6)
    .reverse()
    .map((payment) => ({
      date: new Date(payment.payment_date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
      amount: payment.amount,
    }))

  // Chart data for fee breakdown
  const feeBreakdownData = fees.slice(0, 5).map((fee) => ({
    type: fee.fee_structure?.fee_type || "Other",
    paid: fee.paid_amount,
    pending: fee.balance_amount,
  }))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Fee Management</h2>
          <p className="text-muted-foreground mt-1">Track and manage fee payments</p>
        </div>
        {children.length > 0 && (
          <InlineSelect
            label="Select Child"
            value={selectedChild}
            onChange={setSelectedChild}
            options={children.map((child) => ({
              label: `${child.first_name} ${child.last_name}`,
              value: child.id,
            }))}
          />
        )}
      </div>

      {selectedChild && (
        <>
          <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-linear-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <DollarSign className="h-4 w-4" />
                  Total Amount
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">₹{totalAmount.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">Academic Year 2024-25</p>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-green-500/10 to-green-500/5 border-green-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <CreditCard className="h-4 w-4" />
                  Total Paid
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-green-600">₹{totalPaid.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">{payments.length} transactions</p>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-orange-500/10 to-orange-500/5 border-orange-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Balance Due
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-orange-600">₹{totalDue.toLocaleString()}</div>
                <p className="text-xs text-muted-foreground mt-1">
                  {fees.filter((f) => f.status === "Pending" || f.status === "Partial").length} pending items
                </p>
              </CardContent>
            </Card>
            <Card className="bg-linear-to-br from-blue-500/10 to-blue-500/5 border-blue-500/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground">Payment Status</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-blue-600">
                  {totalAmount > 0 ? Math.round((totalPaid / totalAmount) * 100) : 0}%
                </div>
                <p className="text-xs text-muted-foreground mt-1">Completion rate</p>
              </CardContent>
            </Card>
          </div>

          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Payment History</CardTitle>
                <CardDescription>Recent payment transactions</CardDescription>
              </CardHeader>
              <CardContent>
                {paymentChartData.length > 0 ? (
                  <ChartContainer
                    config={{
                      amount: {
                        label: "Amount",
                        color: "var(--chart-1)",
                      },
                    }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <LineChart data={paymentChartData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="date" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Line type="monotone" dataKey="amount" stroke="var(--color-amount)" strokeWidth={2} />
                      </LineChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No payment history available</p>
                )}
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Fee Breakdown</CardTitle>
                <CardDescription>Paid vs pending by fee type</CardDescription>
              </CardHeader>
              <CardContent>
                {feeBreakdownData.length > 0 ? (
                  <ChartContainer
                    config={{
                      paid: {
                        label: "Paid",
                        color: "var(--chart-2)",
                      },
                      pending: {
                        label: "Pending",
                        color: "var(--chart-3)",
                      },
                    }}
                    className="h-[250px]"
                  >
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={feeBreakdownData}>
                        <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                        <XAxis dataKey="type" className="text-xs" />
                        <YAxis className="text-xs" />
                        <ChartTooltip content={<ChartTooltipContent />} />
                        <Bar dataKey="paid" fill="var(--color-paid)" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="pending" fill="var(--color-pending)" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </ChartContainer>
                ) : (
                  <p className="text-sm text-muted-foreground text-center py-12">No fee data available</p>
                )}
              </CardContent>
            </Card>
          </div>

          <Card>
            <CardHeader>
              <CardTitle>Fee Details</CardTitle>
              <CardDescription>All fee items and their status</CardDescription>
            </CardHeader>
            <CardContent>
              {fees.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No fee records found</p>
              ) : (
                <div className="space-y-3">
                  {fees.map((fee) => (
                    <div
                      key={fee.id}
                      className="flex items-center justify-between p-4 rounded-lg border hover:bg-accent/50 transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">{fee.fee_structure?.fee_type || "Fee"}</p>
                          <Badge
                            variant={
                              fee.status === "Paid" ? "default" : fee.status === "Partial" ? "secondary" : "destructive"
                            }
                          >
                            {fee.status}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">Academic Year: {fee.academic_year}</p>
                        {fee.due_date && (
                          <p className="text-xs text-muted-foreground">
                            Due: {new Date(fee.due_date).toLocaleDateString()}
                          </p>
                        )}
                      </div>
                      <div className="text-right space-y-2">
                        <div>
                          <p className="text-sm text-muted-foreground">Total: ₹{fee.total_amount}</p>
                          <p className="text-sm text-green-600">Paid: ₹{fee.paid_amount}</p>
                          {fee.balance_amount > 0 && (
                            <p className="text-sm text-orange-600 font-medium">Due: ₹{fee.balance_amount}</p>
                          )}
                        </div>
                        {fee.balance_amount > 0 && (
                          <Button size="sm" className="w-full bg-green-600 hover:bg-green-700 text-white">
                            Pay Now
                          </Button>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle>Payment Transactions</CardTitle>
              <CardDescription>Complete payment history</CardDescription>
            </CardHeader>
            <CardContent>
              {payments.length === 0 ? (
                <p className="text-sm text-muted-foreground text-center py-8">No payments found</p>
              ) : (
                <div className="space-y-2">
                  {payments.map((payment) => (
                    <div
                      key={payment.id}
                      className="flex items-center justify-between py-3 px-4 border-b last:border-0 hover:bg-accent/30 rounded-lg transition-colors"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2">
                          <p className="font-medium">Receipt #{payment.receipt_number}</p>
                          <Badge variant="outline" className="text-xs">
                            {payment.payment_method}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.payment_date).toLocaleString()}
                        </p>
                        {payment.transaction_id && (
                          <p className="text-xs text-muted-foreground">TXN: {payment.transaction_id}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-lg text-green-600">₹{payment.amount}</p>
                          <Badge
                            variant={payment.payment_status === "Success" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {payment.payment_status}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm">
                          <Download className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        </>
      )}
    </div>
  )
}
