"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Plus, Clock, Edit, Trash2, Calendar, TableIcon, List } from "lucide-react"
import { getSupabaseClient } from "@/lib/supabase"
import { getPrincipalDashboardStatsForUser, getClasses, getSubjects, getStaff } from "@/lib/api/supabase-queries"
import {
  getSchoolTimetable,
  getClassTimetable,
  createTimetableEntry,
  updateTimetableEntry,
  deleteTimetableEntry,
  DAYS_OF_WEEK,
  formatTime,
  getDayName,
  groupByDay,
  type TimetableEntry,
} from "@/lib/api/timetable-service"
import { TimetableTable } from "@/components/timetable-table"
import { useRole } from "@/contexts/role-context"
import { toast } from "sonner"

export default function PrincipalTimetablePage() {
  const { userId } = useRole()
  const [schoolId, setSchoolId] = useState("")
  const [timetable, setTimetable] = useState<TimetableEntry[]>([])
  const [classes, setClasses] = useState<any[]>([])
  const [sections, setSections] = useState<any[]>([])
  const [subjects, setSubjects] = useState<any[]>([])
  const [teachers, setTeachers] = useState<any[]>([])
  const [loading, setLoading] = useState(true)

  // Filter state
  const [selectedClass, setSelectedClass] = useState<string>("all")
  const [selectedDay, setSelectedDay] = useState<string>("all")

  // Form state for add/edit
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEntry, setEditingEntry] = useState<TimetableEntry | null>(null)
  const [formData, setFormData] = useState({
    class_id: "",
    section_id: "",
    subject_id: "",
    teacher_id: "",
    day_of_week: 1,
    start_time: "08:00",
    end_time: "08:45",
    room_number: "",
  })

  const supabase = getSupabaseClient()

  useEffect(() => {
    fetchData()
  }, [userId])

  async function fetchData() {
    if (!userId) return
    try {
      const stats = await getPrincipalDashboardStatsForUser(userId)
      setSchoolId(stats.schoolId)

      const [classesData, subjectsData, staffData, timetableData] = await Promise.all([
        getClasses(stats.schoolId),
        getSubjects(stats.schoolId),
        getStaff(stats.schoolId),
        getSchoolTimetable(stats.schoolId),
      ])

      setClasses(classesData || [])
      setSubjects(subjectsData || [])
      setTeachers(staffData || [])
      setTimetable(timetableData)

      // Fetch sections
      const { data: sectionsData } = await supabase
        .from("sections")
        .select("*")
        .in("class_id", (classesData || []).map((c: any) => c.id))

      setSections(sectionsData || [])
    } catch (error) {
      console.error("[Principal Timetable] Error fetching data:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async () => {
    if (!formData.class_id || !formData.subject_id || !formData.start_time || !formData.end_time) {
      toast.error("Please fill in all required fields")
      return
    }

    try {
      if (editingEntry) {
        const updated = await updateTimetableEntry(editingEntry.id, {
          ...formData,
          day_of_week: Number(formData.day_of_week),
        })
        if (updated) {
          setTimetable((prev) => prev.map((t) => (t.id === editingEntry.id ? updated : t)))
          toast.success("Timetable entry updated!")
        }
      } else {
        const created = await createTimetableEntry({
          school_id: schoolId,
          class_id: formData.class_id,
          section_id: formData.section_id || undefined,
          subject_id: formData.subject_id,
          teacher_id: formData.teacher_id || undefined,
          day_of_week: Number(formData.day_of_week),
          start_time: formData.start_time,
          end_time: formData.end_time,
          room_number: formData.room_number || undefined,
          academic_year: "2024-25",
          is_active: true,
        })
        if (created) {
          setTimetable((prev) => [...prev, created])
          toast.success("Timetable entry created!")
        }
      }
      setIsDialogOpen(false)
      resetForm()
    } catch (error) {
      console.error("[Principal Timetable] Error saving entry:", error)
      toast.error("Failed to save timetable entry")
    }
  }

  const handleDelete = async (id: string) => {
    if (!confirm("Are you sure you want to delete this entry?")) return

    const success = await deleteTimetableEntry(id)
    if (success) {
      setTimetable((prev) => prev.filter((t) => t.id !== id))
      toast.success("Timetable entry deleted!")
    } else {
      toast.error("Failed to delete entry")
    }
  }

  const handleEdit = (entry: TimetableEntry) => {
    setEditingEntry(entry)
    setFormData({
      class_id: entry.class_id,
      section_id: entry.section_id || "",
      subject_id: entry.subject_id,
      teacher_id: entry.teacher_id || "",
      day_of_week: entry.day_of_week,
      start_time: entry.start_time,
      end_time: entry.end_time,
      room_number: entry.room_number || "",
    })
    setIsDialogOpen(true)
  }

  const resetForm = () => {
    setEditingEntry(null)
    setFormData({
      class_id: "",
      section_id: "",
      subject_id: "",
      teacher_id: "",
      day_of_week: 1,
      start_time: "08:00",
      end_time: "08:45",
      room_number: "",
    })
  }

  const filteredTimetable = timetable.filter((entry) => {
    if (selectedClass !== "all" && entry.class_id !== selectedClass) return false
    if (selectedDay !== "all" && entry.day_of_week !== Number(selectedDay)) return false
    return true
  })

  const groupedByDay = groupByDay(filteredTimetable)

  if (loading) {
    return (
      <div className="flex items-center justify-center h-[60vh]">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Timetable Management</h2>
          <p className="text-muted-foreground mt-1">Create and manage class schedules</p>
        </div>
        <Dialog open={isDialogOpen} onOpenChange={(open) => { setIsDialogOpen(open); if (!open) resetForm(); }}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="h-4 w-4 mr-2" />
              Add Entry
            </Button>
          </DialogTrigger>
          <DialogContent className="max-w-md">
            <DialogHeader>
              <DialogTitle>{editingEntry ? "Edit Timetable Entry" : "Add Timetable Entry"}</DialogTitle>
              <DialogDescription>Fill in the class schedule details</DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Class *</Label>
                  <Select value={formData.class_id} onValueChange={(v) => setFormData({ ...formData, class_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select class" />
                    </SelectTrigger>
                    <SelectContent>
                      {classes.map((c) => (
                        <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Section</Label>
                  <Select value={formData.section_id} onValueChange={(v) => setFormData({ ...formData, section_id: v })}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select section" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="">All Sections</SelectItem>
                      {sections.filter((s) => s.class_id === formData.class_id).map((s) => (
                        <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div className="space-y-2">
                <Label>Subject *</Label>
                <Select value={formData.subject_id} onValueChange={(v) => setFormData({ ...formData, subject_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select subject" />
                  </SelectTrigger>
                  <SelectContent>
                    {subjects.map((s) => (
                      <SelectItem key={s.id} value={s.id}>{s.name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Teacher</Label>
                <Select value={formData.teacher_id} onValueChange={(v) => setFormData({ ...formData, teacher_id: v })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select teacher" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="">Not Assigned</SelectItem>
                    {teachers.map((t) => (
                      <SelectItem key={t.id} value={t.id}>{t.first_name} {t.last_name}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label>Day *</Label>
                <Select value={String(formData.day_of_week)} onValueChange={(v) => setFormData({ ...formData, day_of_week: Number(v) })}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select day" />
                  </SelectTrigger>
                  <SelectContent>
                    {DAYS_OF_WEEK.filter((d) => d.value !== 0).map((d) => (
                      <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Start Time *</Label>
                  <Input
                    type="time"
                    value={formData.start_time}
                    onChange={(e) => setFormData({ ...formData, start_time: e.target.value })}
                  />
                </div>
                <div className="space-y-2">
                  <Label>End Time *</Label>
                  <Input
                    type="time"
                    value={formData.end_time}
                    onChange={(e) => setFormData({ ...formData, end_time: e.target.value })}
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label>Room Number</Label>
                <Input
                  placeholder="e.g., Room 101"
                  value={formData.room_number}
                  onChange={(e) => setFormData({ ...formData, room_number: e.target.value })}
                />
              </div>

              <Button className="w-full" onClick={handleSubmit}>
                {editingEntry ? "Update Entry" : "Add Entry"}
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="p-4">
          <div className="flex items-center gap-4 flex-wrap">
            <div className="flex items-center gap-2">
              <Label>Class:</Label>
              <Select value={selectedClass} onValueChange={setSelectedClass}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Classes" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Classes</SelectItem>
                  {classes.map((c) => (
                    <SelectItem key={c.id} value={c.id}>{c.name}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center gap-2">
              <Label>Day:</Label>
              <Select value={selectedDay} onValueChange={setSelectedDay}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="All Days" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Days</SelectItem>
                  {DAYS_OF_WEEK.filter((d) => d.value !== 0).map((d) => (
                    <SelectItem key={d.value} value={String(d.value)}>{d.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Tabs for Table View and Management */}
      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table" className="flex items-center gap-2">
            <TableIcon className="h-4 w-4" />
            Table View
          </TabsTrigger>
          <TabsTrigger value="list" className="flex items-center gap-2">
            <List className="h-4 w-4" />
            List View
          </TabsTrigger>
        </TabsList>

        {/* Table View - Grid style like student timetable */}
        <TabsContent value="table">
          <TimetableTable
            entries={filteredTimetable}
            title="Weekly Timetable"
            description={selectedClass !== "all"
              ? `Schedule for ${classes.find(c => c.id === selectedClass)?.name || "selected class"}`
              : "School-wide class schedule"
            }
            showTeacher={true}
            showRoom={true}
            showClass={selectedClass === "all"}
          />
        </TabsContent>

        {/* List View - Management with edit/delete */}
        <TabsContent value="list" className="space-y-6">
          {selectedDay === "all" ? (
            // Show by day
            DAYS_OF_WEEK.filter((d) => d.value !== 0 && groupedByDay[d.value]?.length > 0).map((day) => (
              <Card key={day.value}>
                <CardHeader className="pb-3">
                  <CardTitle className="flex items-center gap-2">
                    <Calendar className="h-5 w-5" />
                    {day.label}
                  </CardTitle>
                  <CardDescription>{groupedByDay[day.value]?.length || 0} classes scheduled</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {groupedByDay[day.value]?.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground min-w-[100px]">
                            <Clock className="h-4 w-4" />
                            {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entry.subject?.name}</span>
                              <Badge variant="outline">{entry.class?.name}</Badge>
                              {entry.section?.name && <Badge variant="secondary">{entry.section.name}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {entry.teacher ? `${entry.teacher.first_name} ${entry.teacher.last_name}` : "No teacher assigned"}
                              {entry.room_number && ` • ${entry.room_number}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                </CardContent>
              </Card>
            ))
          ) : (
            // Show selected day only
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2">
                  <Calendar className="h-5 w-5" />
                  {getDayName(Number(selectedDay))}
                </CardTitle>
                <CardDescription>{filteredTimetable.length} classes scheduled</CardDescription>
              </CardHeader>
              <CardContent>
                {filteredTimetable.length === 0 ? (
                  <div className="text-center py-8 text-muted-foreground">No classes scheduled for this day</div>
                ) : (
                  <div className="space-y-2">
                    {filteredTimetable.map((entry) => (
                      <div
                        key={entry.id}
                        className="flex items-center justify-between p-3 border rounded-lg hover:bg-muted/50 transition-colors"
                      >
                        <div className="flex items-center gap-4">
                          <div className="flex items-center gap-2 text-sm font-medium text-muted-foreground min-w-[100px]">
                            <Clock className="h-4 w-4" />
                            {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                          </div>
                          <div>
                            <div className="flex items-center gap-2">
                              <span className="font-medium">{entry.subject?.name}</span>
                              <Badge variant="outline">{entry.class?.name}</Badge>
                              {entry.section?.name && <Badge variant="secondary">{entry.section.name}</Badge>}
                            </div>
                            <p className="text-sm text-muted-foreground">
                              {entry.teacher ? `${entry.teacher.first_name} ${entry.teacher.last_name}` : "No teacher assigned"}
                              {entry.room_number && ` • ${entry.room_number}`}
                            </p>
                          </div>
                        </div>
                        <div className="flex items-center gap-2">
                          <Button variant="ghost" size="icon" onClick={() => handleEdit(entry)}>
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button variant="ghost" size="icon" onClick={() => handleDelete(entry.id)}>
                            <Trash2 className="h-4 w-4 text-destructive" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          )}

          {filteredTimetable.length === 0 && selectedDay === "all" && (
            <Card>
              <CardContent className="py-12 text-center text-muted-foreground">
                <Calendar className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No timetable entries found</p>
                <p className="text-sm mt-1">Click "Add Entry" to create the first class schedule</p>
              </CardContent>
            </Card>
          )}
        </TabsContent>
      </Tabs>
    </div>
  )
}
