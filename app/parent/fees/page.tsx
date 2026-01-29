"use client"

import { useEffect, useState, useRef } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { InlineSelect } from "@/components/ui/inline-select"
import { getParentChildrenByUserId, getParentByUserId } from "@/lib/api/supabase-queries"
import { getSupabaseClient } from "@/lib/supabase"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { IndianRupee, Download, CreditCard, Calendar, Eye, Printer, Receipt } from "lucide-react"
import { useRole } from "@/contexts/role-context"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"
import { Bar, BarChart, XAxis, YAxis, CartesianGrid, Line, LineChart, ResponsiveContainer } from "recharts"
import { PaymentDialog } from "@/components/payment"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { ReceiptTemplate } from "@/components/payment/receipt-template"
import { FeeStructureView } from "@/components/fees/fee-structure-view"

export default function FeesPage() {
  const { userId } = useRole()
  const [children, setChildren] = useState<any[]>([])
  const [selectedChild, setSelectedChild] = useState("")
  const [selectedChildData, setSelectedChildData] = useState<any>(null)
  const [fees, setFees] = useState<any[]>([])
  const [payments, setPayments] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const [parentData, setParentData] = useState<any>(null)
  const [schoolData, setSchoolData] = useState<any>(null)

  // Payment dialog state
  const [paymentDialogOpen, setPaymentDialogOpen] = useState(false)
  const [selectedFee, setSelectedFee] = useState<any>(null)

  // Receipt preview state
  const [receiptPreviewOpen, setReceiptPreviewOpen] = useState(false)
  const [selectedReceipt, setSelectedReceipt] = useState<any>(null)

  const printRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const [childrenData, parent] = await Promise.all([
          getParentChildrenByUserId(userId),
          getParentByUserId(userId)
        ])
        setChildren(childrenData || [])
        setParentData(parent)
        if (childrenData && childrenData.length > 0) {
          setSelectedChild(childrenData[0].id)
          setSelectedChildData(childrenData[0])
        }
      } catch (error) {
        console.error("Error fetching children:", error)
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

        // Get selected child full data
        const child = children.find(c => c.id === selectedChild)
        setSelectedChildData(child)

        // Get school data
        if (child?.school) {
          setSchoolData(child.school)
        }

        const [feesData, paymentsData] = await Promise.all([
          supabase
            .from("student_fees")
            .select(`
              *,
              fee_structure:fee_structures(fee_type, amount)
            `)
            .eq("student_id", selectedChild)
            .order("due_date", { ascending: true }),
          supabase
            .from("fee_payments")
            .select(`
              *,
              student_fee:student_fees!inner(student_id, fee_structure:fee_structures(fee_type))
            `)
            .eq("student_fee.student_id", selectedChild)
            .order("payment_date", { ascending: false }),
        ])

        setFees(feesData.data || [])
        setPayments(paymentsData.data || [])
      } catch (error) {
        console.error("Error fetching fees:", error)
      }
    }

    fetchFees()
  }, [selectedChild, children])

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

  const handlePayClick = (fee: any) => {
    setSelectedFee(fee)
    setPaymentDialogOpen(true)
  }

  const handlePaymentSuccess = async () => {
    // Refresh fees data
    const supabase = getSupabaseClient()
    const { data: feesData } = await supabase
      .from("student_fees")
      .select(`
        *,
        fee_structure:fee_structures(fee_type, amount)
      `)
      .eq("student_id", selectedChild)
      .order("due_date", { ascending: true })

    const { data: paymentsData } = await supabase
      .from("fee_payments")
      .select(`
        *,
        student_fee:student_fees!inner(student_id, fee_structure:fee_structures(fee_type))
      `)
      .eq("student_fee.student_id", selectedChild)
      .order("payment_date", { ascending: false })

    setFees(feesData || [])
    setPayments(paymentsData || [])
  }

  const handleViewReceipt = (payment: any) => {
    setSelectedReceipt({
      receipt_number: payment.receipt_number,
      transaction_id: payment.transaction_id,
      payment_date: payment.payment_date,
      amount: payment.amount,
      payment_method: payment.payment_method,
      student: {
        name: `${selectedChildData?.first_name} ${selectedChildData?.last_name}`,
        admission_number: selectedChildData?.admission_number || "",
        class: selectedChildData?.current_class?.name || "",
        section: selectedChildData?.section?.name || ""
      },
      school: {
        name: schoolData?.name || "",
        address: schoolData?.address || "",
        city: schoolData?.city || "",
        state: schoolData?.state || "",
        phone: schoolData?.phone || "",
        email: schoolData?.email || ""
      },
      fee_type: payment.student_fee?.fee_structure?.fee_type || "Fee",
      academic_year: "2024-2025"
    })
    setReceiptPreviewOpen(true)
  }

  const handlePrintReceipt = () => {
    if (printRef.current) {
      const printWindow = window.open("", "_blank")
      if (printWindow) {
        printWindow.document.write(`
          <html>
            <head>
              <title>Payment Receipt</title>
              <style>
                body { margin: 0; padding: 20px; font-family: Arial, sans-serif; }
                @media print {
                  body { -webkit-print-color-adjust: exact; print-color-adjust: exact; }
                }
              </style>
            </head>
            <body>
              ${printRef.current.innerHTML}
            </body>
          </html>
        `)
        printWindow.document.close()
        printWindow.print()
      }
    }
  }

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
          <p className="text-muted-foreground mt-1">Track and pay school fees online</p>
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
        <Tabs defaultValue="payments" className="space-y-4">
          <TabsList>
            <TabsTrigger value="payments">Payments</TabsTrigger>
            <TabsTrigger value="fee-structure">Fee Structure</TabsTrigger>
          </TabsList>

          <TabsContent value="payments" className="space-y-6">
            <div className="grid gap-4 md:grid-cols-4">
            <Card className="bg-linear-to-br from-primary/10 to-primary/5 border-primary/20">
              <CardHeader className="pb-3">
                <CardTitle className="text-sm font-medium text-muted-foreground flex items-center gap-2">
                  <IndianRupee className="h-4 w-4" />
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
              <CardDescription>All fee items and their status - Click "Pay Now" to make a payment</CardDescription>
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
                          <p className="text-sm text-muted-foreground">Total: ₹{fee.total_amount?.toLocaleString()}</p>
                          <p className="text-sm text-green-600">Paid: ₹{fee.paid_amount?.toLocaleString()}</p>
                          {fee.balance_amount > 0 && (
                            <p className="text-sm text-orange-600 font-medium">Due: ₹{fee.balance_amount?.toLocaleString()}</p>
                          )}
                        </div>
                        {fee.balance_amount > 0 && (
                          <Button
                            size="sm"
                            className="w-full bg-green-600 hover:bg-green-700 text-white"
                            onClick={() => handlePayClick(fee)}
                          >
                            <CreditCard className="h-4 w-4 mr-1" />
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
              <CardDescription>Complete payment history with receipt download</CardDescription>
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
                          <Receipt className="h-4 w-4 text-muted-foreground" />
                          <p className="font-medium">Receipt #{payment.receipt_number}</p>
                          <Badge variant="outline" className="text-xs">
                            {payment.payment_method}
                          </Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">
                          {new Date(payment.payment_date).toLocaleString()}
                        </p>
                        {payment.transaction_id && (
                          <p className="text-xs text-muted-foreground font-mono">TXN: {payment.transaction_id}</p>
                        )}
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="font-semibold text-lg text-green-600">₹{payment.amount?.toLocaleString()}</p>
                          <Badge
                            variant={payment.payment_status === "Success" ? "default" : "destructive"}
                            className="text-xs"
                          >
                            {payment.payment_status}
                          </Badge>
                        </div>
                        <Button variant="ghost" size="sm" onClick={() => handleViewReceipt(payment)}>
                          <Eye className="h-4 w-4 mr-1" />
                          View
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          </TabsContent>

          <TabsContent value="fee-structure">
            {selectedChildData?.school_id && (
              <FeeStructureView
                schoolId={selectedChildData.school_id}
                showClassFilter={true}
                title="School Fee Structure"
                description={`View the complete fee structure for ${selectedChildData?.first_name}'s school`}
              />
            )}
          </TabsContent>
        </Tabs>
      )}

      {/* Payment Dialog */}
      {selectedFee && selectedChildData && schoolData && parentData && (
        <PaymentDialog
          open={paymentDialogOpen}
          onOpenChange={setPaymentDialogOpen}
          feeData={{
            id: selectedFee.id,
            fee_type: selectedFee.fee_structure?.fee_type || "Fee",
            total_amount: selectedFee.total_amount,
            paid_amount: selectedFee.paid_amount,
            balance_amount: selectedFee.balance_amount,
            due_date: selectedFee.due_date,
            academic_year: selectedFee.academic_year
          }}
          studentData={{
            id: selectedChildData.id,
            name: `${selectedChildData.first_name} ${selectedChildData.last_name}`,
            admission_number: selectedChildData.admission_number || "",
            class: selectedChildData.current_class?.name || "",
            section: selectedChildData.section?.name || ""
          }}
          schoolData={{
            name: schoolData.name || "",
            address: schoolData.address || "",
            city: schoolData.city || "",
            state: schoolData.state || "",
            phone: schoolData.phone || "",
            email: schoolData.email || ""
          }}
          payerId={parentData.id}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}

      {/* Receipt Preview Dialog */}
      <Dialog open={receiptPreviewOpen} onOpenChange={setReceiptPreviewOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>Payment Receipt</DialogTitle>
            <DialogDescription>View and print your payment receipt</DialogDescription>
          </DialogHeader>
          <div ref={printRef}>
            {selectedReceipt && <ReceiptTemplate data={selectedReceipt} />}
          </div>
          <div className="flex justify-end gap-3 mt-4">
            <Button variant="outline" onClick={() => setReceiptPreviewOpen(false)}>
              Close
            </Button>
            <Button onClick={handlePrintReceipt}>
              <Printer className="h-4 w-4 mr-2" />
              Print Receipt
            </Button>
          </div>
        </DialogContent>
      </Dialog>
    </div>
  )
}
