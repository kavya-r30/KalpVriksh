"use client"

import { useState, useCallback } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Badge } from "@/components/ui/badge"
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert"
import { Upload, FileSpreadsheet, Image, CheckCircle, XCircle, Loader2, Info, Download } from "lucide-react"
import { useRole } from "@/contexts/role-context"

interface IngestionResult {
  success: boolean
  inserted?: number
  processed?: number
  total_records?: number
  extracted_records?: number
  errors?: string[]
  message?: string
  raw_extraction?: string
}

export default function DataIngestionPage() {
  const { userId } = useRole()
  const [dataType, setDataType] = useState<string>("")
  const [schoolId, setSchoolId] = useState<string>("")
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState<IngestionResult | null>(null)

  const handleFileChange = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0])
      setResult(null)
    }
  }, [])

  const handleUpload = async (type: "csv" | "image") => {
    if (!file || !dataType || !schoolId) {
      return
    }

    setLoading(true)
    setResult(null)

    try {
      const formData = new FormData()
      formData.append("file", file)
      formData.append("data_type", dataType)
      formData.append("school_id", schoolId)

      const response = await fetch(`http://localhost:8000/api/data-ingestion/${type}`, {
        method: "POST",
        body: formData
      })

      const data = await response.json()
      setResult(data)
    } catch (error) {
      setResult({
        success: false,
        message: "Failed to connect to server. Make sure the backend is running."
      })
    } finally {
      setLoading(false)
    }
  }

  const dataTypes = [
    { value: "attendance", label: "Attendance Records", description: "Import daily attendance data" },
    { value: "students", label: "Student Records", description: "Import new student information" },
    { value: "fees", label: "Fee Payments", description: "Import fee payment records" },
    { value: "marks", label: "Marks/Grades", description: "Import examination marks" }
  ]

  const csvTemplates = {
    attendance: "student_admission_number,date,status\nADM001,2024-01-15,Present\nADM002,2024-01-15,Absent",
    students: "admission_number,first_name,last_name,date_of_birth,gender,class_name\nADM003,John,Doe,2010-05-15,Male,Class 5",
    fees: "student_admission_number,amount,payment_date,payment_method,fee_type\nADM001,5000,2024-01-15,UPI,Tuition",
    marks: "student_admission_number,subject,marks_obtained,max_marks\nADM001,Mathematics,85,100"
  }

  const downloadTemplate = () => {
    if (!dataType) return

    const template = csvTemplates[dataType as keyof typeof csvTemplates]
    const blob = new Blob([template], { type: "text/csv" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${dataType}_template.csv`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Data Ingestion</h2>
        <p className="text-muted-foreground mt-1">
          Import legacy paper records into the system using CSV files or scanned images
        </p>
      </div>

      <Tabs defaultValue="csv" className="space-y-4">
        <TabsList>
          <TabsTrigger value="csv">
            <FileSpreadsheet className="h-4 w-4 mr-2" />
            CSV Import
          </TabsTrigger>
          <TabsTrigger value="image">
            <Image className="h-4 w-4 mr-2" />
            Image/Scan Import
          </TabsTrigger>
        </TabsList>

        <TabsContent value="csv">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upload CSV File</CardTitle>
                <CardDescription>
                  Import data from a CSV file. Download a template to see the required format.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>School ID</Label>
                  <Input
                    placeholder="Enter school UUID"
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Data Type</Label>
                  <Select value={dataType} onValueChange={setDataType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select data type" />
                    </SelectTrigger>
                    <SelectContent>
                      {dataTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  {dataType && (
                    <p className="text-xs text-muted-foreground">
                      {dataTypes.find((t) => t.value === dataType)?.description}
                    </p>
                  )}
                </div>

                {dataType && (
                  <Button variant="outline" size="sm" onClick={downloadTemplate}>
                    <Download className="h-4 w-4 mr-2" />
                    Download CSV Template
                  </Button>
                )}

                <div className="space-y-2">
                  <Label>CSV File</Label>
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Input
                      type="file"
                      accept=".csv"
                      onChange={handleFileChange}
                      className="hidden"
                      id="csv-upload"
                    />
                    <label htmlFor="csv-upload" className="cursor-pointer">
                      <Upload className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {file ? file.name : "Click to upload CSV file"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Maximum file size: 10MB
                      </p>
                    </label>
                  </div>
                </div>

                <Button
                  className="w-full"
                  disabled={!file || !dataType || !schoolId || loading}
                  onClick={() => handleUpload("csv")}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Import Data
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>CSV Format Guide</CardTitle>
                <CardDescription>Required columns for each data type</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  {dataTypes.map((type) => (
                    <div
                      key={type.value}
                      className={`p-3 rounded-lg border ${
                        dataType === type.value ? "border-primary bg-primary/5" : ""
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-2">
                        <Badge variant={dataType === type.value ? "default" : "outline"}>
                          {type.label}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground font-mono">
                        {type.value === "attendance" && "student_admission_number, date, status"}
                        {type.value === "students" && "admission_number, first_name, last_name, date_of_birth, gender, class_name"}
                        {type.value === "fees" && "student_admission_number, amount, payment_date, payment_method, fee_type"}
                        {type.value === "marks" && "student_admission_number, subject, marks_obtained, max_marks"}
                      </p>
                    </div>
                  ))}
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Important Notes</AlertTitle>
                  <AlertDescription className="text-xs mt-2 space-y-1">
                    <p>• Dates should be in YYYY-MM-DD format</p>
                    <p>• Attendance status: Present, Absent, or Late</p>
                    <p>• Student admission numbers must already exist</p>
                    <p>• For new students, class names must match existing classes</p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>

        <TabsContent value="image">
          <div className="grid gap-6 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Upload Scanned Document</CardTitle>
                <CardDescription>
                  Upload scanned attendance sheets, mark sheets, or fee receipts.
                  AI will extract the data automatically.
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-2">
                  <Label>School ID</Label>
                  <Input
                    placeholder="Enter school UUID"
                    value={schoolId}
                    onChange={(e) => setSchoolId(e.target.value)}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Document Type</Label>
                  <Select value={dataType} onValueChange={setDataType}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select document type" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="attendance">Attendance Sheet</SelectItem>
                      <SelectItem value="marks">Mark Sheet / Report</SelectItem>
                      <SelectItem value="fees">Fee Receipt</SelectItem>
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Image File</Label>
                  <div className="border-2 border-dashed border-muted rounded-lg p-6 text-center hover:border-primary/50 transition-colors">
                    <Input
                      type="file"
                      accept="image/*"
                      onChange={handleFileChange}
                      className="hidden"
                      id="image-upload"
                    />
                    <label htmlFor="image-upload" className="cursor-pointer">
                      <Image className="h-10 w-10 mx-auto text-muted-foreground mb-2" />
                      <p className="text-sm text-muted-foreground">
                        {file ? file.name : "Click to upload image"}
                      </p>
                      <p className="text-xs text-muted-foreground mt-1">
                        Supported: PNG, JPG, JPEG (max 10MB)
                      </p>
                    </label>
                  </div>
                </div>

                <Button
                  className="w-full"
                  disabled={!file || !dataType || !schoolId || loading}
                  onClick={() => handleUpload("image")}
                >
                  {loading ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Extracting & Processing...
                    </>
                  ) : (
                    <>
                      <Upload className="h-4 w-4 mr-2" />
                      Extract & Import Data
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>AI-Powered Extraction</CardTitle>
                <CardDescription>How image processing works</CardDescription>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="space-y-3">
                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-blue-500 text-white flex items-center justify-center text-sm font-bold">
                      1
                    </div>
                    <div>
                      <p className="font-medium text-sm">Upload Image</p>
                      <p className="text-xs text-muted-foreground">
                        Upload a clear scan of attendance sheet, marks sheet, or receipt
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-purple-500 text-white flex items-center justify-center text-sm font-bold">
                      2
                    </div>
                    <div>
                      <p className="font-medium text-sm">AI Analysis</p>
                      <p className="text-xs text-muted-foreground">
                        Gemini AI extracts text and structures the data
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-green-500 text-white flex items-center justify-center text-sm font-bold">
                      3
                    </div>
                    <div>
                      <p className="font-medium text-sm">Student Matching</p>
                      <p className="text-xs text-muted-foreground">
                        System matches names/IDs to existing student records
                      </p>
                    </div>
                  </div>

                  <div className="flex gap-3 p-3 rounded-lg bg-muted/50">
                    <div className="w-8 h-8 rounded-full bg-orange-500 text-white flex items-center justify-center text-sm font-bold">
                      4
                    </div>
                    <div>
                      <p className="font-medium text-sm">Data Import</p>
                      <p className="text-xs text-muted-foreground">
                        Verified data is imported into the database
                      </p>
                    </div>
                  </div>
                </div>

                <Alert>
                  <Info className="h-4 w-4" />
                  <AlertTitle>Best Practices</AlertTitle>
                  <AlertDescription className="text-xs mt-2 space-y-1">
                    <p>• Use clear, high-resolution scans</p>
                    <p>• Ensure good lighting and no shadows</p>
                    <p>• Avoid handwritten text when possible</p>
                    <p>• Crop to show only relevant data</p>
                  </AlertDescription>
                </Alert>
              </CardContent>
            </Card>
          </div>
        </TabsContent>
      </Tabs>

      {/* Results Section */}
      {result && (
        <Card className={result.success ? "border-green-500" : "border-red-500"}>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              {result.success ? (
                <>
                  <CheckCircle className="h-5 w-5 text-green-500" />
                  Import Successful
                </>
              ) : (
                <>
                  <XCircle className="h-5 w-5 text-red-500" />
                  Import Failed
                </>
              )}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            {result.success ? (
              <div className="grid gap-4 md:grid-cols-3">
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-3xl font-bold text-green-600">
                    {result.inserted || result.processed || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Records Imported</p>
                </div>
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-3xl font-bold">
                    {result.total_records || result.extracted_records || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Total Records</p>
                </div>
                <div className="p-4 rounded-lg bg-muted text-center">
                  <p className="text-3xl font-bold text-orange-600">
                    {result.errors?.length || 0}
                  </p>
                  <p className="text-sm text-muted-foreground">Errors</p>
                </div>
              </div>
            ) : (
              <p className="text-muted-foreground">{result.message}</p>
            )}

            {result.errors && result.errors.length > 0 && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Errors:</p>
                <div className="max-h-40 overflow-y-auto space-y-1">
                  {result.errors.map((error, i) => (
                    <p key={i} className="text-xs text-red-500 font-mono bg-red-50 dark:bg-red-950 p-2 rounded">
                      {error}
                    </p>
                  ))}
                </div>
              </div>
            )}

            {result.raw_extraction && (
              <div className="space-y-2">
                <p className="font-medium text-sm">Raw Extraction:</p>
                <pre className="text-xs bg-muted p-3 rounded overflow-x-auto">
                  {result.raw_extraction}
                </pre>
              </div>
            )}
          </CardContent>
        </Card>
      )}
    </div>
  )
}
