"use client"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { FileText, Download, Eye } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export default function StudentCertificatesPage() {
  // Mock certificates data
  const certificates = [
    { id: 1, title: "Bonafide Certificate", type: "Administrative", date: "2024-01-15", status: "Issued" },
    { id: 2, title: "Transfer Certificate", type: "Administrative", date: "2023-12-20", status: "Pending" },
    { id: 3, title: "Character Certificate", type: "Conduct", date: "2023-11-05", status: "Issued" },
    { id: 4, title: "Sports Participation", type: "Extracurricular", date: "2023-10-12", status: "Issued" },
  ]

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Certificates</h2>
          <p className="text-muted-foreground mt-1">View and download your official documents</p>
        </div>
        <Button>Request New Certificate</Button>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {certificates.map((cert) => (
          <Card key={cert.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="p-2 bg-primary/10 rounded-lg">
                  <FileText className="h-6 w-6 text-primary" />
                </div>
                <Badge variant={cert.status === "Issued" ? "default" : "secondary"}>{cert.status}</Badge>
              </div>
              <CardTitle className="mt-4">{cert.title}</CardTitle>
              <CardDescription>{cert.type}</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="text-sm text-muted-foreground mb-4">Date: {new Date(cert.date).toLocaleDateString()}</div>
              <div className="flex gap-2">
                <Button variant="outline" className="flex-1 bg-transparent" disabled={cert.status !== "Issued"}>
                  <Eye className="mr-2 h-4 w-4" /> View
                </Button>
                <Button variant="outline" className="flex-1 bg-transparent" disabled={cert.status !== "Issued"}>
                  <Download className="mr-2 h-4 w-4" /> PDF
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
