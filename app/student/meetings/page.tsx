"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Video, Calendar, Clock, Users, ExternalLink, Play } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { useState, useEffect } from "react"
import { useRole } from "@/contexts/role-context"
import { getStudentMeetings } from "@/lib/api/supabase-queries"

interface Meeting {
  id: string
  title: string
  description?: string
  meeting_url: string
  room_name: string
  scheduled_at: string
  duration_minutes: number
  status: string
  meeting_type: string
  class?: { name: string }
  host?: { first_name: string; last_name: string }
}

export default function StudentMeetingsPage() {
  const { userId } = useRole()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const meetingsData = await getStudentMeetings(userId)
        setMeetings(meetingsData || [])
      } catch (error) {
        console.error("Error fetching meetings:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Progress":
        return <Badge className="bg-green-500/10 text-green-500 animate-pulse">Live Now</Badge>
      case "Completed":
        return <Badge variant="secondary">Ended</Badge>
      default:
        return <Badge className="bg-blue-500/10 text-blue-500">Upcoming</Badge>
    }
  }

  const getTimeUntil = (scheduledAt: string) => {
    const now = new Date()
    const scheduled = new Date(scheduledAt)
    const diff = scheduled.getTime() - now.getTime()

    if (diff < 0) return "Started"

    const hours = Math.floor(diff / (1000 * 60 * 60))
    const minutes = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60))

    if (hours > 24) {
      const days = Math.floor(hours / 24)
      return `In ${days} day${days > 1 ? "s" : ""}`
    }
    if (hours > 0) {
      return `In ${hours}h ${minutes}m`
    }
    return `In ${minutes} minutes`
  }

  const liveMeetings = meetings.filter((m) => m.status === "In Progress")
  const upcomingMeetings = meetings.filter((m) => m.status === "Scheduled")

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Online Classes</h2>
        <p className="text-muted-foreground mt-1">Join your scheduled virtual classroom sessions</p>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-3">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Play className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{liveMeetings.length}</p>
                <p className="text-sm text-muted-foreground">Live Now</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{upcomingMeetings.length}</p>
                <p className="text-sm text-muted-foreground">Upcoming</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Video className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{meetings.length}</p>
                <p className="text-sm text-muted-foreground">Total</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Live Meetings */}
      {liveMeetings.length > 0 && (
        <div className="space-y-4">
          <h3 className="text-lg font-semibold flex items-center gap-2">
            <span className="h-2 w-2 bg-green-500 rounded-full animate-pulse" />
            Live Now
          </h3>
          <div className="grid gap-4">
            {liveMeetings.map((meeting) => {
              const scheduledDate = new Date(meeting.scheduled_at)

              return (
                <Card key={meeting.id} className="border-green-500/50 ring-2 ring-green-500/20 shadow-lg">
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="rounded-lg bg-green-500/10 p-3 ring-1 ring-green-500/50">
                          <Video className="h-6 w-6 text-green-500" />
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg">{meeting.title}</h3>
                            {getStatusBadge(meeting.status)}
                          </div>
                          {meeting.class?.name && (
                            <p className="text-sm text-muted-foreground mt-1">{meeting.class.name}</p>
                          )}
                          {meeting.host && (
                            <p className="text-sm text-muted-foreground">
                              Host: {meeting.host.first_name} {meeting.host.last_name}
                            </p>
                          )}
                          {meeting.description && (
                            <p className="text-sm text-muted-foreground mt-2">{meeting.description}</p>
                          )}
                          <div className="flex items-center gap-4 mt-3 text-sm">
                            <span className="text-muted-foreground flex items-center">
                              <Clock className="h-3 w-3 mr-1" />
                              Started at {scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                            </span>
                            <span className="text-muted-foreground">
                              {meeting.duration_minutes} min session
                            </span>
                          </div>
                        </div>
                      </div>
                      <Button size="lg" className="bg-green-600 hover:bg-green-700" onClick={() => window.open(meeting.meeting_url, "_blank")}>
                        <ExternalLink className="h-4 w-4 mr-2" />
                        Join Now
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </div>
      )}

      {/* Upcoming Meetings */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Upcoming Classes</h3>
        <div className="grid gap-4">
          {upcomingMeetings.map((meeting) => {
            const scheduledDate = new Date(meeting.scheduled_at)
            const timeUntil = getTimeUntil(meeting.scheduled_at)

            return (
              <Card key={meeting.id} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex items-start gap-4 flex-1">
                      <div className="rounded-lg bg-secondary/50 p-3 ring-1 ring-border/50">
                        <Video className="h-6 w-6 text-foreground" />
                      </div>
                      <div className="flex-1">
                        <div className="flex items-center gap-2">
                          <h3 className="font-semibold text-lg">{meeting.title}</h3>
                          {getStatusBadge(meeting.status)}
                        </div>
                        {meeting.class?.name && (
                          <p className="text-sm text-muted-foreground mt-1">{meeting.class.name}</p>
                        )}
                        {meeting.host && (
                          <p className="text-sm text-muted-foreground">
                            Host: {meeting.host.first_name} {meeting.host.last_name}
                          </p>
                        )}
                        {meeting.description && (
                          <p className="text-sm text-muted-foreground mt-2">{meeting.description}</p>
                        )}
                        <div className="flex items-center gap-4 mt-3 text-sm">
                          <span className="text-muted-foreground flex items-center">
                            <Calendar className="h-3 w-3 mr-1" />
                            {scheduledDate.toLocaleDateString()}
                          </span>
                          <span className="text-muted-foreground flex items-center">
                            <Clock className="h-3 w-3 mr-1" />
                            {scheduledDate.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                          <span className="text-muted-foreground">
                            {meeting.duration_minutes} min
                          </span>
                        </div>
                      </div>
                    </div>
                    <div className="flex flex-col items-end gap-2">
                      <span className="text-sm font-medium text-blue-600">{timeUntil}</span>
                      <Button variant="outline" size="sm" disabled>
                        <Clock className="h-4 w-4 mr-1" />
                        Waiting
                      </Button>
                    </div>
                  </div>
                </CardContent>
              </Card>
            )
          })}
        </div>
      </div>

      {meetings.length === 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Meetings Scheduled</p>
            <p className="text-sm text-muted-foreground mt-2">Your teacher hasn't scheduled any online classes yet.</p>
          </CardContent>
        </Card>
      )}

      {upcomingMeetings.length === 0 && liveMeetings.length === 0 && meetings.length > 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Upcoming Classes</p>
            <p className="text-sm text-muted-foreground mt-2">Check back later for new scheduled meetings.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
