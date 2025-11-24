"use client"

import { useEffect, useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Bell } from "lucide-react"
import { ScrollArea } from "@/components/ui/scroll-area"
import { getSupabaseClient } from "@/lib/supabase"

interface Announcement {
  id: string
  title: string
  message: string
  created_at: string
  notification_type: string
}

export function AnnouncementsModal() {
  const [announcements, setAnnouncements] = useState<Announcement[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)

  const fetchAnnouncements = async () => {
    setLoading(true)
    const supabase = getSupabaseClient()
    const { data, error } = await supabase
      .from("notifications")
      .select("*")
      .order("created_at", { ascending: false })
      .limit(10)

    if (data) {
      setAnnouncements(data)
    }
    setLoading(false)
  }

  useEffect(() => {
    if (open) {
      fetchAnnouncements()
    }
  }, [open])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" className="relative rounded-full text-muted-foreground hover:text-foreground">
          <Bell className="h-5 w-5" />
          <span className="absolute top-2 right-2 h-2 w-2 rounded-full bg-destructive ring-2 ring-background" />
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle>Announcements</DialogTitle>
          <DialogDescription>Latest updates and notifications from the school.</DialogDescription>
        </DialogHeader>
        <ScrollArea className="h-[400px] w-full rounded-md border p-4">
          {loading ? (
            <div className="flex items-center justify-center h-full">Loading...</div>
          ) : announcements.length === 0 ? (
            <div className="flex items-center justify-center h-full text-muted-foreground">No announcements yet.</div>
          ) : (
            <div className="flex flex-col gap-4">
              {announcements.map((item) => (
                <div key={item.id} className="flex flex-col gap-1 border-b pb-3 last:border-0 last:pb-0">
                  <div className="flex items-center justify-between">
                    <span className="font-semibold text-sm">{item.title}</span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(item.created_at).toLocaleDateString()}
                    </span>
                  </div>
                  <p className="text-sm text-muted-foreground">{item.message}</p>
                </div>
              ))}
            </div>
          )}
        </ScrollArea>
      </DialogContent>
    </Dialog>
  )
}
