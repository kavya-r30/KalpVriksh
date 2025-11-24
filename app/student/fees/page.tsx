"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { getStudentFees, getFeePayments } from "@/lib/api/supabase-queries"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { Download, CreditCard } from "lucide-react"
import { format } from "date-fns"
import { useRole } from "@/contexts/role-context"
import { getStudentByUserId } from "@/lib/api/supabase-queries"

export default function StudentFeesPage() {
  const { userId } = useRole()
  const [fees, setFees] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchFees() {
      if (!userId) return

      try {
        const student = await getStudentByUserId(userId)
        if (student) {
          const [feesData, paymentsData] = await Promise.all([getStudentFees(student.id), getFeePayments(student.id)])
          setFees(feesData || [])
          setPayments(paymentsData || [])
        }
      } catch (error) {
        console.error("[v0] Error fetching fees:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchFees()
  }, [userId])

  const totalFees = fees.reduce((sum, f) => sum + f.total_amount, 0)
  const paidFees = fees.reduce((sum, f) => sum + f.paid_amount, 0)
  const pendingFees = fees.reduce((sum, f) => sum + f.balance_amount, 0)
  const paymentPercentage = totalFees > 0 ? (paidFees / totalFees) * 100 : 0

  if (loading) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Fee Management</h2>
        <p className="text-muted-foreground mt-1">View and manage your fee payments</p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Fees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₹{totalFees.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">For academic year</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Paid</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-600">₹{paidFees.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Successfully paid</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Pending</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-600">₹{pendingFees.toLocaleString()}</div>
            <p className="text-xs text-muted-foreground mt-1">Due amount</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Payment Progress</CardTitle>
          <CardDescription>Your fee payment status</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <Progress value={paymentPercentage} className="h-3" />
          <p className="text-sm text-muted-foreground text-center">
            {paymentPercentage.toFixed(1)}% paid - ₹{pendingFees.toLocaleString()} remaining
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Fee Breakdown</CardTitle>
              <CardDescription>Detailed fee structure and payment status</CardDescription>
            </div>
            <Button>
              <CreditCard className="mr-2 h-4 w-4" />
              Pay Now
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {fees.map((fee, i) => (
              <div key={i} className="flex items-center justify-between p-4 rounded-lg border">
                <div className="flex-1">
                  <p className="font-medium">{fee.fee_structure?.fee_type || "Fee"}</p>
                  <p className="text-sm text-muted-foreground">
                    Due: {fee.due_date ? format(new Date(fee.due_date), "MMM d, yyyy") : "N/A"}
                  </p>
                </div>
                <div className="text-right space-y-1">
                  <div className="font-semibold">₹{fee.total_amount.toLocaleString()}</div>
                  <Badge
                    variant={
                      fee.status === "Paid"
                        ? "default"
                        : fee.status === "Overdue"
                          ? "destructive"
                          : fee.status === "Partial"
                            ? "secondary"
                            : "outline"
                    }
                  >
                    {fee.status}
                  </Badge>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Payment History</CardTitle>
          <CardDescription>Your recent fee payments</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-2">
            {payments.length === 0 ? (
              <p className="text-sm text-muted-foreground text-center py-8">No payment history available</p>
            ) : (
              payments.map((payment, i) => (
                <div key={i} className="flex items-center justify-between py-3 border-b last:border-0">
                  <div>
                    <p className="font-medium">Receipt #{payment.receipt_number}</p>
                    <p className="text-sm text-muted-foreground">
                      {format(new Date(payment.payment_date), "MMM d, yyyy")} - {payment.payment_method}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <div className="font-semibold">₹{payment.amount.toLocaleString()}</div>
                      <Badge
                        variant={
                          payment.payment_status === "Success"
                            ? "default"
                            : payment.payment_status === "Failed"
                              ? "destructive"
                              : "secondary"
                        }
                      >
                        {payment.payment_status}
                      </Badge>
                    </div>
                    <Button variant="ghost" size="icon">
                      <Download className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
