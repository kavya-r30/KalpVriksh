"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Users, BookOpen, Calendar, Clock, MapPin } from "lucide-react"
import { getTeacherClasses, getSupabaseClient, getStaffByUserId } from "@/lib/api/supabase-queries"
import { getTeacherTimetable, formatTime, getDayName } from "@/lib/api/timetable-service"
import { useRole } from "@/contexts/role-context"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import Link from "next/link"

export default function ClassesPage() {
  const { userId } = useRole()
  const [classes, setClasses] = useState<any[]>([])
  const [timetable, setTimetable] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  const supabase = getSupabaseClient()

  useEffect(() => {
    async function fetchClasses() {
      if (!userId) return
      try {
        const staff = await getStaffByUserId(userId)
        const data = await getTeacherClasses(userId)

        // Fetch student counts for each class
        const classesWithStudentCount = await Promise.all(
          (data || []).map(async (cls) => {
            const { count } = await supabase
              .from("students")
              .select("*", { count: "exact", head: true })
              .eq("current_class_id", cls.class_id)

            return { ...cls, studentCount: count || 0 }
          }),
        )

        setClasses(classesWithStudentCount)

        // Fetch timetable for this teacher
        if (staff?.id) {
          const timetableData = await getTeacherTimetable(staff.id)
          setTimetable(timetableData)
        }
      } catch (error) {
        console.error("Error fetching classes:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchClasses()
  }, [userId])

  // Get today's day of week
  const today = new Date().getDay()

  // Group timetable by class
  const getTimetableForClass = (classId: string, subjectId: string) => {
    return timetable
      .filter(t => t.class_id === classId && t.subject_id === subjectId)
      .sort((a, b) => a.day_of_week - b.day_of_week || a.start_time.localeCompare(b.start_time))
  }

  // Get next class for a subject
  const getNextClass = (classId: string, subjectId: string) => {
    const classSchedule = getTimetableForClass(classId, subjectId)
    const now = new Date()
    const currentTime = now.toTimeString().slice(0, 5)
    const currentDay = now.getDay()

    // Find next class today or in coming days
    for (let dayOffset = 0; dayOffset < 7; dayOffset++) {
      const checkDay = (currentDay + dayOffset) % 7
      const dayClasses = classSchedule.filter(t => t.day_of_week === checkDay)

      for (const cls of dayClasses) {
        if (dayOffset === 0 && cls.start_time <= currentTime) continue
        return { ...cls, isToday: dayOffset === 0 }
      }
    }
    return null
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">My Classes</h2>
          <p className="text-muted-foreground mt-1">Classes you&apos;re teaching this academic year</p>
        </div>
        <Button asChild>
          <Link href="/teacher/timetable">
            <Clock className="mr-2 h-4 w-4" />
            View Full Timetable
          </Link>
        </Button>
      </div>

      {/* Today's Schedule Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today&apos;s Classes - {getDayName(today)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {timetable.filter(t => t.day_of_week === today).length === 0 ? (
            <p className="text-muted-foreground">No classes scheduled for today</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {timetable
                .filter(t => t.day_of_week === today)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))
                .map((entry) => (
                  <Badge key={entry.id} variant="secondary" className="px-3 py-2 text-sm">
                    <Clock className="h-3 w-3 mr-1" />
                    {formatTime(entry.start_time)} - {entry.subjects?.name} ({entry.classes?.name})
                  </Badge>
                ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {classes.map((cls, index) => {
          const classSchedule = getTimetableForClass(cls.class_id, cls.subject_id)
          const nextClass = getNextClass(cls.class_id, cls.subject_id)

          return (
            <Card key={index} className="border-border/50 shadow-sm hover:shadow-md transition-shadow">
              <CardHeader>
                <div className="flex items-start gap-4">
                  <Avatar className="h-12 w-12 border-2 border-border">
                    <AvatarFallback className="bg-primary text-primary-foreground text-lg font-bold">
                      {cls.class?.name?.substring(0, 2) || "CL"}
                    </AvatarFallback>
                  </Avatar>
                  <div className="flex-1">
                    <CardTitle className="text-lg">{cls.class?.name}</CardTitle>
                    <CardDescription className="mt-1">{cls.subject?.name}</CardDescription>
                    {cls.class?.school?.name && (
                      <p className="text-xs text-muted-foreground mt-1">{cls.class.school.name}</p>
                    )}
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Students</p>
                      <p className="text-sm font-semibold">{cls.studentCount}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <BookOpen className="h-4 w-4 text-muted-foreground" />
                    <div>
                      <p className="text-xs text-muted-foreground">Subject Code</p>
                      <p className="text-sm font-semibold">{cls.subject?.code || "N/A"}</p>
                    </div>
                  </div>
                </div>

                {/* Schedule Info */}
                <div className="border-t pt-3">
                  <p className="text-xs font-medium text-muted-foreground mb-2">Weekly Schedule</p>
                  {classSchedule.length === 0 ? (
                    <p className="text-xs text-muted-foreground">No schedule set</p>
                  ) : (
                    <div className="flex flex-wrap gap-1">
                      {classSchedule.slice(0, 3).map((entry) => (
                        <Badge key={entry.id} variant="outline" className="text-xs">
                          {getDayName(entry.day_of_week).slice(0, 3)} {formatTime(entry.start_time)}
                        </Badge>
                      ))}
                      {classSchedule.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{classSchedule.length - 3} more
                        </Badge>
                      )}
                    </div>
                  )}
                </div>

                {/* Next Class */}
                {nextClass && (
                  <div className="bg-muted/50 rounded-lg p-2">
                    <p className="text-xs text-muted-foreground">
                      {nextClass.isToday ? "Next class today" : `Next: ${getDayName(nextClass.day_of_week)}`}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <Clock className="h-3 w-3 text-primary" />
                      <span className="text-sm font-medium">
                        {formatTime(nextClass.start_time)} - {formatTime(nextClass.end_time)}
                      </span>
                      {nextClass.room_number && (
                        <>
                          <MapPin className="h-3 w-3 text-muted-foreground ml-2" />
                          <span className="text-xs text-muted-foreground">Room {nextClass.room_number}</span>
                        </>
                      )}
                    </div>
                  </div>
                )}

                <div className="flex gap-2">
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
                    <Link href="/teacher/attendance">
                      <Calendar className="h-4 w-4 mr-2" />
                      Attendance
                    </Link>
                  </Button>
                  <Button variant="outline" size="sm" className="flex-1 bg-transparent" asChild>
                    <Link href="/teacher/marks">
                      <BookOpen className="h-4 w-4 mr-2" />
                      Marks
                    </Link>
                  </Button>
                </div>
              </CardContent>
            </Card>
          )
        })}
      </div>

      {classes.length === 0 && (
        <Card className="border-border/50 shadow-sm">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Users className="h-12 w-12 text-muted-foreground mb-4" />
            <p className="text-lg font-medium">No Classes Assigned</p>
            <p className="text-sm text-muted-foreground mt-2">You don&apos;t have any classes assigned yet.</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
