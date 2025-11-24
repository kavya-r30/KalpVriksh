"use client"

import type React from "react"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createSchool, updateSchool } from "@/lib/api/supabase-mutations"
import { Loader2, ArrowLeft } from "lucide-react"

interface SchoolFormProps {
  initialData?: any
  isEditing?: boolean
}

export function SchoolForm({ initialData, isEditing = false }: SchoolFormProps) {
  const router = useRouter()
  const [loading, setLoading] = useState(false)

  // Form State
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    school_code: initialData?.school_code || "",
    board: initialData?.board || "",
    email: initialData?.email || "",
    phone: initialData?.phone || "",
    address: initialData?.address || "",
    city: initialData?.city || "",
    state: initialData?.state || "",
    pincode: initialData?.pincode || "",
  })

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)

    try {
      if (isEditing) {
        await updateSchool(initialData.id, formData)
      } else {
        await createSchool(formData)
      }
      router.push("/admin/schools")
      router.refresh()
    } catch (error) {
      console.error("Error saving school:", error)
      alert("Failed to save school. Please try again.")
    } finally {
      setLoading(false)
    }
  }

  return (
    <form onSubmit={handleSubmit}>
      <Card>
        <CardHeader>
          <CardTitle>{isEditing ? "Edit School" : "Add New School"}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="space-y-2">
              <Label htmlFor="name">School Name</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="school_code">School Code</Label>
              <Input
                id="school_code"
                value={formData.school_code}
                onChange={(e) => setFormData({ ...formData, school_code: e.target.value })}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="board">Board</Label>
              <Select value={formData.board} onValueChange={(value) => setFormData({ ...formData, board: value })}>
                <SelectTrigger>
                  <SelectValue placeholder="Select Board" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="CBSE">CBSE</SelectItem>
                  <SelectItem value="ICSE">ICSE</SelectItem>
                  <SelectItem value="State">State</SelectItem>
                  <SelectItem value="Other">Other</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="address">Address</Label>
              <Input
                id="address"
                value={formData.address}
                onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="city">City</Label>
              <Input
                id="city"
                value={formData.city}
                onChange={(e) => setFormData({ ...formData, city: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="state">State</Label>
              <Input
                id="state"
                value={formData.state}
                onChange={(e) => setFormData({ ...formData, state: e.target.value })}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="pincode">Pincode</Label>
              <Input
                id="pincode"
                value={formData.pincode}
                onChange={(e) => setFormData({ ...formData, pincode: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-between">
          <Button variant="outline" type="button" onClick={() => router.back()}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Cancel
          </Button>
          <Button type="submit" disabled={loading}>
            {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
            {isEditing ? "Update School" : "Create School"}
          </Button>
        </CardFooter>
      </Card>
    </form>
  )
}
