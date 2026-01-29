"use client"

import { useState, useEffect } from "react"
import { FeeStructureView } from "@/components/fees/fee-structure-view"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { getSchools, getClasses } from "@/lib/api/supabase-queries"
import { createFeeStructure, FEE_CATEGORIES } from "@/lib/api/payment-service"
import { Loader2, Plus, IndianRupee, Building2 } from "lucide-react"
import { toast } from "sonner"

export default function AdminFeesPage() {
  const [loading, setLoading] = useState(true)
  const [schools, setSchools] = useState<any[]>([])
  const [selectedSchool, setSelectedSchool] = useState<string>("")
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

  function getCurrentAcademicYear() {
    const now = new Date()
    const year = now.getFullYear()
    const month = now.getMonth()
    return month >= 3 ? `${year}-${year + 1}` : `${year - 1}-${year}`
  }

  useEffect(() => {
    async function loadSchools() {
      try {
        const schoolsData = await getSchools()
        setSchools(schoolsData || [])
        if (schoolsData && schoolsData.length > 0) {
          setSelectedSchool(schoolsData[0].id)
        }
      } catch (error) {
        console.error("Error loading schools:", error)
      } finally {
        setLoading(false)
      }
    }
    loadSchools()
  }, [])

  useEffect(() => {
    async function loadClasses() {
      if (!selectedSchool) return
      try {
        const classesData = await getClasses(selectedSchool)
        setClasses(classesData || [])
      } catch (error) {
        console.error("Error loading classes:", error)
      }
    }
    loadClasses()
  }, [selectedSchool])

  const handleCreateFee = async () => {
    if (!newFee.class_id || !newFee.fee_type || !newFee.amount || !newFee.due_date) {
      toast.error("Please fill all required fields")
      return
    }

    setCreating(true)
    try {
      await createFeeStructure({
        school_id: selectedSchool,
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
      // Refresh page to show new fee
      window.location.reload()
    } catch (error: any) {
      console.error("Error creating fee:", error)
      toast.error(error.message || "Failed to create fee structure")
    } finally {
      setCreating(false)
    }
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-full">
        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Fee Management</h1>
          <p className="text-muted-foreground">Manage fee structures across all schools</p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={selectedSchool} onValueChange={setSelectedSchool}>
            <SelectTrigger className="w-[250px]">
              <Building2 className="h-4 w-4 mr-2" />
              <SelectValue placeholder="Select school" />
            </SelectTrigger>
            <SelectContent>
              {schools.map((school) => (
                <SelectItem key={school.id} value={school.id}>
                  {school.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="h-4 w-4 mr-2" />
                Add Fee
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
      </div>

      {selectedSchool ? (
        <FeeStructureView
          schoolId={selectedSchool}
          showClassFilter={true}
          title="Fee Structure"
          description={`Fee structure for ${schools.find(s => s.id === selectedSchool)?.name || "selected school"}`}
        />
      ) : (
        <Card>
          <CardContent className="flex items-center justify-center h-64">
            <p className="text-muted-foreground">Please select a school to view fee structure</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
