"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Database, Bell, Shield, Globe } from "lucide-react"
import { Separator } from "@/components/ui/separator"
import { useEffect, useState } from "react"
import { getSupabaseClient } from "@/lib/supabase"

export default function SettingsPage() {
  const [dbStatus, setDbStatus] = useState<"Connected" | "Disconnected" | "Checking">("Checking")
  const [lastBackup, setLastBackup] = useState<string>("Checking...")
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function checkSystemStatus() {
      try {
        const { error } = await supabase.from("schools").select("count", { count: "exact", head: true })
        if (error) throw error
        setDbStatus("Connected")
        // Simulate fetching last backup time
        setLastBackup("2 hours ago")
      } catch (e) {
        setDbStatus("Disconnected")
        setLastBackup("Unknown")
      }
    }
    checkSystemStatus()
  }, [])

  const settingsCategories = [
    {
      icon: Database,
      title: "System Configuration",
      description: "Database and system-wide settings",
      settings: [
        { label: "Auto-backup enabled", checked: true },
        { label: "Maintenance mode", checked: false },
        { label: "Debug logging", checked: false },
      ],
    },
    {
      icon: Bell,
      title: "Notification Settings",
      description: "Configure notification preferences",
      settings: [
        { label: "Email notifications", checked: true },
        { label: "SMS notifications", checked: true },
        { label: "Push notifications", checked: false },
      ],
    },
    {
      icon: Shield,
      title: "Security Settings",
      description: "Security and access control",
      settings: [
        { label: "Two-factor authentication", checked: true },
        { label: "Password policy enforcement", checked: true },
        { label: "Session timeout (30 min)", checked: true },
      ],
    },
    {
      icon: Globe,
      title: "General Settings",
      description: "Application preferences",
      settings: [
        { label: "Dark mode", checked: false },
        { label: "Auto-save forms", checked: true },
        { label: "Show system notifications", checked: true },
      ],
    },
  ]

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Settings</h2>
        <p className="text-muted-foreground mt-1">Manage system configuration and preferences</p>
      </div>

      <div className="grid gap-6">
        {settingsCategories.map((category, index) => {
          const Icon = category.icon
          return (
            <Card key={index} className="border-border/50 shadow-sm">
              <CardHeader>
                <div className="flex items-center gap-3">
                  <div className="rounded-lg bg-secondary/50 p-2 ring-1 ring-border/50">
                    <Icon className="h-5 w-5 text-foreground" />
                  </div>
                  <div>
                    <CardTitle className="text-lg">{category.title}</CardTitle>
                    <CardDescription>{category.description}</CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  {category.settings.map((setting, idx) => (
                    <div key={idx}>
                      <div className="flex items-center justify-between">
                        <Label htmlFor={`${category.title}-${idx}`} className="text-sm font-medium">
                          {setting.label}
                        </Label>
                        <Switch id={`${category.title}-${idx}`} defaultChecked={setting.checked} />
                      </div>
                      {idx < category.settings.length - 1 && <Separator className="mt-4" />}
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
          )
        })}

        <Card className="border-border/50 shadow-sm">
          <CardHeader>
            <CardTitle className="text-lg">System Information</CardTitle>
            <CardDescription>Current system configuration details</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <Label className="text-xs text-muted-foreground">Version</Label>
                <p className="text-sm font-medium">v1.0.0</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Last Backup</Label>
                <p className="text-sm font-medium">{lastBackup}</p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Database Status</Label>
                <p className={`text-sm font-medium ${dbStatus === "Connected" ? "text-green-600" : "text-red-600"}`}>
                  {dbStatus}
                </p>
              </div>
              <div>
                <Label className="text-xs text-muted-foreground">Server Status</Label>
                <p className="text-sm font-medium text-green-600">Online</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
