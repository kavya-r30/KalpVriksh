"use client"

import type React from "react"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Plus, Video, Calendar, Clock, Users, Play, StopCircle, Copy, Edit2, Trash2, ExternalLink } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { InlineSelect } from "@/components/ui/inline-select"
import { useState, useEffect } from "react"
import { useRole } from "@/contexts/role-context"
import { getTeacherMeetings, getTeacherClasses, getStaffByUserId } from "@/lib/api/supabase-queries"
import { createMeeting, updateMeeting, deleteMeeting, updateMeetingStatus } from "@/lib/api/supabase-mutations"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

// Jitsi configuration
const JITSI_DOMAIN = "meet.jit.si"

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
  class_id?: string
  class?: { name: string }
  host?: { first_name: string; last_name: string }
}

export default function TeacherMeetingsPage() {
  const { userId } = useRole()
  const [meetings, setMeetings] = useState<Meeting[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [staffId, setStaffId] = useState<string>("")
  const [schoolId, setSchoolId] = useState<string>("")
  const [statusFilter, setStatusFilter] = useState<string>("all")
  const [loading, setLoading] = useState(true)

  // Dialog states
  const [isCreateOpen, setIsCreateOpen] = useState(false)
  const [isEditOpen, setIsEditOpen] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [selectedMeeting, setSelectedMeeting] = useState<Meeting | null>(null)

  // Form state
  const [newMeeting, setNewMeeting] = useState({
    title: "",
    description: "",
    class_id: "",
    scheduled_date: "",
    scheduled_time: "",
    duration_minutes: 60,
    meeting_type: "Class",
  })

  useEffect(() => {
    async function fetchData() {
      if (!userId) return

      try {
        const [meetingsData, classesData, staffData] = await Promise.all([
          getTeacherMeetings(userId),
          getTeacherClasses(userId),
          getStaffByUserId(userId),
        ])

        setMeetings(meetingsData || [])
        setClasses(classesData || [])
        setStaffId(staffData?.id || "")
        setSchoolId(staffData?.school_id || "")
      } catch (error) {
        console.error("Error fetching meetings data:", error)
      } finally {
        setLoading(false)
      }
    }

    fetchData()
  }, [userId])

  const generateRoomName = () => {
    const timestamp = Date.now()
    const random = Math.random().toString(36).substring(2, 8)
    return `nexus-${timestamp}-${random}`
  }

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!staffId || !schoolId) return
    setIsSubmitting(true)

    try {
      const roomName = generateRoomName()
      const meetingUrl = `https://${JITSI_DOMAIN}/${roomName}`
      const scheduledAt = new Date(`${newMeeting.scheduled_date}T${newMeeting.scheduled_time}`).toISOString()

      const payload = {
        title: newMeeting.title,
        description: newMeeting.description,
        class_id: newMeeting.class_id || null,
        school_id: schoolId,
        host_id: staffId,
        meeting_url: meetingUrl,
        room_name: roomName,
        scheduled_at: scheduledAt,
        duration_minutes: newMeeting.duration_minutes,
        meeting_type: newMeeting.meeting_type,
      }

      await createMeeting(payload)
      const fresh = await getTeacherMeetings(userId!)
      setMeetings(fresh || [])
      setIsCreateOpen(false)
      resetForm()
    } catch (error) {
      console.error("Error creating meeting:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleEdit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!selectedMeeting) return
    setIsSubmitting(true)

    try {
      const scheduledAt = new Date(`${newMeeting.scheduled_date}T${newMeeting.scheduled_time}`).toISOString()

      const payload = {
        title: newMeeting.title,
        description: newMeeting.description,
        class_id: newMeeting.class_id || null,
        scheduled_at: scheduledAt,
        duration_minutes: newMeeting.duration_minutes,
        meeting_type: newMeeting.meeting_type,
      }

      await updateMeeting(selectedMeeting.id, payload)
      const fresh = await getTeacherMeetings(userId!)
      setMeetings(fresh || [])
      setIsEditOpen(false)
      setSelectedMeeting(null)
      resetForm()
    } catch (error) {
      console.error("Error updating meeting:", error)
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleDelete = async (meetingId: string) => {
    if (!confirm("Are you sure you want to delete this meeting?")) return

    try {
      await deleteMeeting(meetingId)
      const fresh = await getTeacherMeetings(userId!)
      setMeetings(fresh || [])
    } catch (error) {
      console.error("Error deleting meeting:", error)
    }
  }

  const handleStartMeeting = async (meeting: Meeting) => {
    try {
      await updateMeetingStatus(meeting.id, "In Progress")
      const fresh = await getTeacherMeetings(userId!)
      setMeetings(fresh || [])
      window.open(meeting.meeting_url, "_blank")
    } catch (error) {
      console.error("Error starting meeting:", error)
    }
  }

  const handleEndMeeting = async (meeting: Meeting) => {
    try {
      await updateMeetingStatus(meeting.id, "Completed")
      const fresh = await getTeacherMeetings(userId!)
      setMeetings(fresh || [])
    } catch (error) {
      console.error("Error ending meeting:", error)
    }
  }

  const copyMeetingLink = (url: string) => {
    navigator.clipboard.writeText(url)
    alert("Meeting link copied to clipboard!")
  }

  const openEditDialog = (meeting: Meeting) => {
    setSelectedMeeting(meeting)
    const scheduledDate = new Date(meeting.scheduled_at)
    setNewMeeting({
      title: meeting.title,
      description: meeting.description || "",
      class_id: meeting.class_id || "",
      scheduled_date: scheduledDate.toISOString().split("T")[0],
      scheduled_time: scheduledDate.toTimeString().slice(0, 5),
      duration_minutes: meeting.duration_minutes,
      meeting_type: meeting.meeting_type,
    })
    setIsEditOpen(true)
  }

  const resetForm = () => {
    setNewMeeting({
      title: "",
      description: "",
      class_id: "",
      scheduled_date: "",
      scheduled_time: "",
      duration_minutes: 60,
      meeting_type: "Class",
    })
  }

  const filteredMeetings = meetings.filter((m) => {
    if (statusFilter === "all") return true
    return m.status === statusFilter
  })

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "In Progress":
        return <Badge className="bg-green-500/10 text-green-500 animate-pulse">Live</Badge>
      case "Completed":
        return <Badge variant="secondary">Completed</Badge>
      case "Cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge className="bg-blue-500/10 text-blue-500">Scheduled</Badge>
    }
  }

  const stats = {
    total: meetings.length,
    scheduled: meetings.filter((m) => m.status === "Scheduled").length,
    inProgress: meetings.filter((m) => m.status === "In Progress").length,
    completed: meetings.filter((m) => m.status === "Completed").length,
  }

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
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Online Meetings</h2>
          <p className="text-muted-foreground mt-1">Schedule and manage virtual classroom sessions</p>
        </div>
        <div className="flex items-center gap-3">
          <InlineSelect
            label="Status"
            placeholder="All"
            value={statusFilter}
            onChange={setStatusFilter}
            options={[
              { label: "All", value: "all" },
              { label: "Scheduled", value: "Scheduled" },
              { label: "In Progress", value: "In Progress" },
              { label: "Completed", value: "Completed" },
            ]}
          />
          <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Schedule Meeting
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Schedule New Meeting</DialogTitle>
                <DialogDescription>Create a new virtual classroom session using Jitsi Meet.</DialogDescription>
              </DialogHeader>
              <form onSubmit={handleCreate} className="space-y-4">
                <div className="space-y-2">
                  <Label htmlFor="title">Meeting Title</Label>
                  <Input
                    id="title"
                    value={newMeeting.title}
                    onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                    placeholder="e.g., Math Class - Chapter 5"
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="class">Class (Optional)</Label>
                  <Select
                    value={newMeeting.class_id}
                    onValueChange={(val) => setNewMeeting({ ...newMeeting, class_id: val })}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="none">No specific class</SelectItem>
                      {classes.map((cls) => (
                        <SelectItem key={cls.class_id} value={cls.class_id}>
                          {cls.class?.name} - {cls.subject?.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="date">Date</Label>
                    <Input
                      id="date"
                      type="date"
                      value={newMeeting.scheduled_date}
                      onChange={(e) => setNewMeeting({ ...newMeeting, scheduled_date: e.target.value })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="time">Time</Label>
                    <Input
                      id="time"
                      type="time"
                      value={newMeeting.scheduled_time}
                      onChange={(e) => setNewMeeting({ ...newMeeting, scheduled_time: e.target.value })}
                      required
                    />
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label htmlFor="duration">Duration (minutes)</Label>
                    <Input
                      id="duration"
                      type="number"
                      value={newMeeting.duration_minutes}
                      onChange={(e) => setNewMeeting({ ...newMeeting, duration_minutes: parseInt(e.target.value) })}
                      required
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="type">Meeting Type</Label>
                    <Select
                      value={newMeeting.meeting_type}
                      onValueChange={(val) => setNewMeeting({ ...newMeeting, meeting_type: val })}
                    >
                      <SelectTrigger>
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Class">Class Session</SelectItem>
                        <SelectItem value="Parent-Teacher">Parent-Teacher</SelectItem>
                        <SelectItem value="Staff">Staff Meeting</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
                <div className="space-y-2">
                  <Label htmlFor="description">Description (Optional)</Label>
                  <Textarea
                    id="description"
                    value={newMeeting.description}
                    onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                    rows={2}
                    placeholder="Add meeting agenda or notes..."
                  />
                </div>
                <DialogFooter>
                  <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting ? "Creating..." : "Schedule Meeting"}
                  </Button>
                </DialogFooter>
              </form>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-blue-500/10 rounded-lg">
                <Video className="h-5 w-5 text-blue-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.total}</p>
                <p className="text-sm text-muted-foreground">Total Meetings</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-yellow-500/10 rounded-lg">
                <Calendar className="h-5 w-5 text-yellow-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.scheduled}</p>
                <p className="text-sm text-muted-foreground">Scheduled</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-green-500/10 rounded-lg">
                <Play className="h-5 w-5 text-green-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.inProgress}</p>
                <p className="text-sm text-muted-foreground">In Progress</p>
              </div>
            </div>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="p-4">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-purple-500/10 rounded-lg">
                <Users className="h-5 w-5 text-purple-500" />
              </div>
              <div>
                <p className="text-2xl font-bold">{stats.completed}</p>
                <p className="text-sm text-muted-foreground">Completed</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Meetings List */}
      <div className="grid gap-4">
        {filteredMeetings.map((meeting) => {
          const scheduledDate = new Date(meeting.scheduled_at)
          const isLive = meeting.status === "In Progress"
          const isPast = meeting.status === "Completed" || meeting.status === "Cancelled"

          return (
            <Card key={meeting.id} className={`border-border/50 shadow-sm hover:shadow-md transition-shadow ${isLive ? "ring-2 ring-green-500" : ""}`}>
              <CardContent className="p-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className={`rounded-lg p-3 ring-1 ring-border/50 ${
                      isLive ? "bg-green-500/10" : isPast ? "bg-muted" : "bg-secondary/50"
                    }`}>
                      <Video className={`h-6 w-6 ${
                        isLive ? "text-green-500" : isPast ? "text-muted-foreground" : "text-foreground"
                      }`} />
                    </div>
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h3 className="font-semibold text-lg">{meeting.title}</h3>
                        {getStatusBadge(meeting.status)}
                        {meeting.meeting_type && (
                          <Badge variant="outline">{meeting.meeting_type}</Badge>
                        )}
                      </div>
                      {meeting.class?.name && (
                        <p className="text-sm text-muted-foreground mt-1">{meeting.class.name}</p>
                      )}
                      {meeting.description && (
                        <p className="text-sm text-muted-foreground mt-2 line-clamp-2">{meeting.description}</p>
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
                  <div className="flex gap-2">
                    {meeting.status === "Scheduled" && (
                      <>
                        <Button size="sm" onClick={() => handleStartMeeting(meeting)}>
                          <Play className="h-4 w-4 mr-1" />
                          Start
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copyMeetingLink(meeting.meeting_url)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" onClick={() => openEditDialog(meeting)}>
                          <Edit2 className="h-4 w-4" />
                        </Button>
                        <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(meeting.id)}>
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </>
                    )}
                    {meeting.status === "In Progress" && (
                      <>
                        <Button size="sm" onClick={() => window.open(meeting.meeting_url, "_blank")}>
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Join
                        </Button>
                        <Button variant="outline" size="sm" onClick={() => copyMeetingLink(meeting.meeting_url)}>
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button variant="destructive" size="sm" onClick={() => handleEndMeeting(meeting)}>
                          <StopCircle className="h-4 w-4 mr-1" />
                          End
                        </Button>
                      </>
                    )}
                    {meeting.status === "Completed" && (
                      <Button variant="ghost" size="sm" className="text-destructive" onClick={() => handleDelete(meeting.id)}>
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {filteredMeetings.length === 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Video className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Meetings Found</p>
            <p className="text-sm text-muted-foreground mt-2">Schedule your first meeting to get started.</p>
          </CardContent>
        </Card>
      )}

      {/* Edit Meeting Dialog */}
      <Dialog open={isEditOpen} onOpenChange={setIsEditOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Meeting</DialogTitle>
            <DialogDescription>Update meeting details.</DialogDescription>
          </DialogHeader>
          <form onSubmit={handleEdit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Meeting Title</Label>
              <Input
                id="edit-title"
                value={newMeeting.title}
                onChange={(e) => setNewMeeting({ ...newMeeting, title: e.target.value })}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-class">Class (Optional)</Label>
              <Select
                value={newMeeting.class_id}
                onValueChange={(val) => setNewMeeting({ ...newMeeting, class_id: val })}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Select class" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">No specific class</SelectItem>
                  {classes.map((cls) => (
                    <SelectItem key={cls.class_id} value={cls.class_id}>
                      {cls.class?.name} - {cls.subject?.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-date">Date</Label>
                <Input
                  id="edit-date"
                  type="date"
                  value={newMeeting.scheduled_date}
                  onChange={(e) => setNewMeeting({ ...newMeeting, scheduled_date: e.target.value })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-time">Time</Label>
                <Input
                  id="edit-time"
                  type="time"
                  value={newMeeting.scheduled_time}
                  onChange={(e) => setNewMeeting({ ...newMeeting, scheduled_time: e.target.value })}
                  required
                />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="edit-duration">Duration (minutes)</Label>
                <Input
                  id="edit-duration"
                  type="number"
                  value={newMeeting.duration_minutes}
                  onChange={(e) => setNewMeeting({ ...newMeeting, duration_minutes: parseInt(e.target.value) })}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-type">Meeting Type</Label>
                <Select
                  value={newMeeting.meeting_type}
                  onValueChange={(val) => setNewMeeting({ ...newMeeting, meeting_type: val })}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="Class">Class Session</SelectItem>
                    <SelectItem value="Parent-Teacher">Parent-Teacher</SelectItem>
                    <SelectItem value="Staff">Staff Meeting</SelectItem>
                    <SelectItem value="Other">Other</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-description">Description (Optional)</Label>
              <Textarea
                id="edit-description"
                value={newMeeting.description}
                onChange={(e) => setNewMeeting({ ...newMeeting, description: e.target.value })}
                rows={2}
              />
            </div>
            <DialogFooter>
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? "Updating..." : "Update Meeting"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  )
}
