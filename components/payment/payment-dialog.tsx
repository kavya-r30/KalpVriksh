"use client"

import { useState, useRef } from "react"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { CreditCard, Smartphone, Building2, Banknote, CheckCircle, XCircle, Printer, Loader2 } from "lucide-react"
import { processPayment, PaymentRequest } from "@/lib/api/payment-service"
import { ReceiptTemplate } from "./receipt-template"

interface PaymentDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  feeData: {
    id: string
    fee_type: string
    total_amount: number
    paid_amount: number
    balance_amount: number
    due_date: string
    academic_year: string
  }
  studentData: {
    id: string
    name: string
    admission_number: string
    class: string
    section: string
  }
  schoolData: {
    name: string
    address: string
    city: string
    state: string
    phone: string
    email: string
  }
  payerId: string
  onPaymentSuccess: () => void
}

type PaymentMethod = "UPI" | "Card" | "NetBanking" | "Cash"

interface PaymentMethodOption {
  id: PaymentMethod
  name: string
  icon: React.ElementType
  description: string
}

const paymentMethods: PaymentMethodOption[] = [
  { id: "UPI", name: "UPI", icon: Smartphone, description: "Pay using any UPI app" },
  { id: "Card", name: "Debit/Credit Card", icon: CreditCard, description: "Visa, Mastercard, RuPay" },
  { id: "NetBanking", name: "Net Banking", icon: Building2, description: "All major banks supported" },
  { id: "Cash", name: "Cash", icon: Banknote, description: "Pay at school office" }
]

export function PaymentDialog({
  open,
  onOpenChange,
  feeData,
  studentData,
  schoolData,
  payerId,
  onPaymentSuccess
}: PaymentDialogProps) {
  const [step, setStep] = useState<"amount" | "method" | "processing" | "success" | "failed">("amount")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("UPI")
  const [payAmount, setPayAmount] = useState(feeData.balance_amount.toString())
  const [receiptData, setReceiptData] = useState<any>(null)
  const [errorMessage, setErrorMessage] = useState("")
  const printRef = useRef<HTMLDivElement>(null)

  const handlePaymentSubmit = async () => {
    const amount = parseFloat(payAmount)
    if (isNaN(amount) || amount <= 0 || amount > feeData.balance_amount) {
      setErrorMessage("Please enter a valid amount")
      return
    }

    setStep("processing")

    const request: PaymentRequest = {
      student_fee_id: feeData.id,
      amount,
      payment_method: paymentMethod,
      student_id: studentData.id,
      payer_id: payerId
    }

    const response = await processPayment(request)

    if (response.success) {
      setReceiptData({
        receipt_number: response.receipt_number,
        transaction_id: response.transaction_id,
        payment_date: new Date().toISOString(),
        amount,
        payment_method: paymentMethod,
        student: {
          name: studentData.name,
          admission_number: studentData.admission_number,
          class: studentData.class,
          section: studentData.section
        },
        school: schoolData,
        fee_type: feeData.fee_type,
        academic_year: feeData.academic_year
      })
      setStep("success")
      onPaymentSuccess()
    } else {
      setErrorMessage(response.message)
      setStep("failed")
    }
  }

  const handlePrint = () => {
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

  const resetDialog = () => {
    setStep("amount")
    setPayAmount(feeData.balance_amount.toString())
    setPaymentMethod("UPI")
    setReceiptData(null)
    setErrorMessage("")
  }

  const handleClose = () => {
    resetDialog()
    onOpenChange(false)
  }

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>
            {step === "amount" && "Pay Fee"}
            {step === "method" && "Select Payment Method"}
            {step === "processing" && "Processing Payment"}
            {step === "success" && "Payment Successful"}
            {step === "failed" && "Payment Failed"}
          </DialogTitle>
          <DialogDescription>
            {step === "amount" && `${feeData.fee_type} Fee - ${feeData.academic_year}`}
            {step === "method" && "Choose how you want to pay"}
            {step === "processing" && "Please wait while we process your payment..."}
            {step === "success" && "Your payment has been processed successfully"}
            {step === "failed" && "There was an issue with your payment"}
          </DialogDescription>
        </DialogHeader>

        <div className="py-4">
          {/* Amount Step */}
          {step === "amount" && (
            <div className="space-y-4">
              <div className="bg-muted/50 rounded-lg p-4 space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Total Amount</span>
                  <span className="font-semibold">₹{feeData.total_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-muted-foreground">Already Paid</span>
                  <span className="text-green-600">₹{feeData.paid_amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between text-sm border-t pt-2">
                  <span className="text-muted-foreground font-semibold">Balance Due</span>
                  <span className="font-bold text-lg text-orange-600">₹{feeData.balance_amount.toLocaleString()}</span>
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="amount">Amount to Pay</Label>
                <div className="relative">
                  <span className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-foreground">₹</span>
                  <Input
                    id="amount"
                    type="number"
                    value={payAmount}
                    onChange={(e) => setPayAmount(e.target.value)}
                    className="pl-8 text-lg font-semibold"
                    max={feeData.balance_amount}
                    min={1}
                  />
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPayAmount(feeData.balance_amount.toString())}
                  >
                    Pay Full Amount
                  </Button>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setPayAmount((feeData.balance_amount / 2).toString())}
                  >
                    Pay 50%
                  </Button>
                </div>
                {errorMessage && (
                  <p className="text-sm text-destructive">{errorMessage}</p>
                )}
              </div>

              <Button
                className="w-full"
                onClick={() => {
                  const amount = parseFloat(payAmount)
                  if (!isNaN(amount) && amount > 0 && amount <= feeData.balance_amount) {
                    setErrorMessage("")
                    setStep("method")
                  } else {
                    setErrorMessage("Please enter a valid amount between ₹1 and ₹" + feeData.balance_amount)
                  }
                }}
              >
                Continue to Payment
              </Button>
            </div>
          )}

          {/* Payment Method Step */}
          {step === "method" && (
            <div className="space-y-4">
              <div className="bg-green-50 dark:bg-green-950 rounded-lg p-3 flex justify-between items-center">
                <span className="text-sm text-muted-foreground">Amount to Pay</span>
                <span className="text-xl font-bold text-green-600">₹{parseFloat(payAmount).toLocaleString()}</span>
              </div>

              <RadioGroup value={paymentMethod} onValueChange={(v) => setPaymentMethod(v as PaymentMethod)}>
                <div className="grid gap-3">
                  {paymentMethods.map((method) => {
                    const Icon = method.icon
                    return (
                      <Card
                        key={method.id}
                        className={`cursor-pointer transition-colors ${
                          paymentMethod === method.id ? "border-primary bg-primary/5" : "hover:bg-muted/50"
                        }`}
                        onClick={() => setPaymentMethod(method.id)}
                      >
                        <CardContent className="flex items-center gap-4 p-4">
                          <RadioGroupItem value={method.id} id={method.id} />
                          <div className="p-2 rounded-lg bg-muted">
                            <Icon className="h-5 w-5" />
                          </div>
                          <div className="flex-1">
                            <Label htmlFor={method.id} className="font-semibold cursor-pointer">
                              {method.name}
                            </Label>
                            <p className="text-xs text-muted-foreground">{method.description}</p>
                          </div>
                        </CardContent>
                      </Card>
                    )
                  })}
                </div>
              </RadioGroup>

              <div className="flex gap-3">
                <Button variant="outline" onClick={() => setStep("amount")} className="flex-1">
                  Back
                </Button>
                <Button onClick={handlePaymentSubmit} className="flex-1">
                  Pay ₹{parseFloat(payAmount).toLocaleString()}
                </Button>
              </div>
            </div>
          )}

          {/* Processing Step */}
          {step === "processing" && (
            <div className="py-12 text-center space-y-4">
              <Loader2 className="h-12 w-12 mx-auto text-primary animate-spin" />
              <div>
                <p className="font-semibold">Processing your payment...</p>
                <p className="text-sm text-muted-foreground">Please do not close this window</p>
              </div>
            </div>
          )}

          {/* Success Step */}
          {step === "success" && receiptData && (
            <div className="space-y-4">
              <div className="py-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-green-100 dark:bg-green-900 flex items-center justify-center mb-4">
                  <CheckCircle className="h-10 w-10 text-green-600" />
                </div>
                <p className="text-lg font-semibold text-green-600">Payment Successful!</p>
                <p className="text-sm text-muted-foreground mt-1">
                  Transaction ID: {receiptData.transaction_id}
                </p>
              </div>

              <div className="bg-muted/50 rounded-lg p-4 space-y-2 text-sm">
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Receipt No</span>
                  <span className="font-mono font-semibold">{receiptData.receipt_number}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Amount Paid</span>
                  <span className="font-semibold text-green-600">₹{receiptData.amount.toLocaleString()}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-muted-foreground">Payment Method</span>
                  <Badge variant="outline">{receiptData.payment_method}</Badge>
                </div>
              </div>

              <div ref={printRef} className="hidden">
                <ReceiptTemplate data={receiptData} />
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Close
                </Button>
                <Button onClick={handlePrint} className="flex-1">
                  <Printer className="h-4 w-4 mr-2" />
                  Print Receipt
                </Button>
              </div>
            </div>
          )}

          {/* Failed Step */}
          {step === "failed" && (
            <div className="space-y-4">
              <div className="py-6 text-center">
                <div className="w-16 h-16 mx-auto rounded-full bg-red-100 dark:bg-red-900 flex items-center justify-center mb-4">
                  <XCircle className="h-10 w-10 text-red-600" />
                </div>
                <p className="text-lg font-semibold text-red-600">Payment Failed</p>
                <p className="text-sm text-muted-foreground mt-1">{errorMessage}</p>
              </div>

              <div className="flex gap-3">
                <Button variant="outline" onClick={handleClose} className="flex-1">
                  Cancel
                </Button>
                <Button onClick={() => setStep("method")} className="flex-1">
                  Try Again
                </Button>
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
