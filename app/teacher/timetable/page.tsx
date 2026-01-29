"use client"

import { useEffect, useState } from "react"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRole } from "@/contexts/role-context"
import { getStaffByUserId } from "@/lib/api/supabase-queries"
import { getTeacherTimetable, DAYS_OF_WEEK, formatTime, getDayName, type TimetableEntry } from "@/lib/api/timetable-service"
import { TimetableTable } from "@/components/timetable-table"
import { Clock, Calendar, MapPin, BookOpen, Users } from "lucide-react"

export default function TeacherTimetablePage() {
  const { userId } = useRole()
  const [staffInfo, setStaffInfo] = useState<any>(null)
  const [timetable, setTimetable] = useState<TimetableEntry[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function fetchData() {
      if (!userId) return
      setLoading(true)
      try {
        const staff = await getStaffByUserId(userId)
        setStaffInfo(staff)

        if (staff?.id) {
          const data = await getTeacherTimetable(staff.id)
          setTimetable(data)
        }
      } catch (error) {
        console.error("Error fetching timetable:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [userId])

  // Get today's day of week (0 = Sunday, 1 = Monday, etc.)
  const today = new Date().getDay()
  const todaySchedule = timetable
    .filter((t) => t.day_of_week === today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="h-12 w-12 rounded-full border-4 border-primary border-t-transparent animate-spin" />
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold tracking-tight">My Timetable</h1>
        <p className="text-muted-foreground">View your weekly teaching schedule</p>
      </div>

      {/* Today's Schedule Summary */}
      <Card className="bg-primary/5 border-primary/20">
        <CardHeader className="pb-2">
          <CardTitle className="flex items-center gap-2">
            <Calendar className="h-5 w-5" />
            Today&apos;s Schedule - {getDayName(today)}
          </CardTitle>
        </CardHeader>
        <CardContent>
          {todaySchedule.length === 0 ? (
            <p className="text-muted-foreground">No classes scheduled for today</p>
          ) : (
            <div className="flex flex-wrap gap-3">
              {todaySchedule.map((entry) => (
                <Badge key={entry.id} variant="secondary" className="px-3 py-2 text-sm">
                  <Clock className="h-3 w-3 mr-1" />
                  {formatTime(entry.start_time)} - {entry.subject?.name} ({entry.class?.name}
                  {entry.section?.name ? ` ${entry.section?.name}` : ""})
                </Badge>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <Tabs defaultValue="table" className="space-y-4">
        <TabsList>
          <TabsTrigger value="table">Table View</TabsTrigger>
          <TabsTrigger value="grid">Grid View</TabsTrigger>
          <TabsTrigger value="list">List View</TabsTrigger>
        </TabsList>

        <TabsContent value="table">
          <TimetableTable
            entries={timetable}
            title="Weekly Teaching Schedule"
            description="Your classes across the week"
            showTeacher={false}
            showRoom={true}
            showClass={true}
          />
        </TabsContent>

        <TabsContent value="grid">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {DAYS_OF_WEEK.filter((d) => d.value >= 1 && d.value <= 6).map((day) => {
              const dayEntries = timetable
                .filter((t) => t.day_of_week === day.value)
                .sort((a, b) => a.start_time.localeCompare(b.start_time))

              const isToday = day.value === today

              return (
                <Card key={day.value.toString()} className={isToday ? "border-primary border-2" : ""}>
                  <CardHeader className="pb-2">
                    <CardTitle className="text-lg flex items-center justify-between">
                      {day.label}
                      {isToday && <Badge>Today</Badge>}
                    </CardTitle>
                    <CardDescription>{dayEntries.length} classes</CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-2">
                    {dayEntries.length === 0 ? (
                      <p className="text-sm text-muted-foreground py-4 text-center">No classes</p>
                    ) : (
                      dayEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center justify-between mb-1">
                            <span className="font-medium text-sm">{entry.subject?.name}</span>
                            <Badge variant="outline" className="text-xs">
                              {formatTime(entry.start_time)} - {formatTime(entry.end_time)}
                            </Badge>
                          </div>
                          <div className="flex items-center gap-3 text-xs text-muted-foreground">
                            <span className="flex items-center gap-1">
                              <Users className="h-3 w-3" />
                              {entry.class?.name} {entry.section?.name || ""}
                            </span>
                            {entry.room_number && (
                              <span className="flex items-center gap-1">
                                <MapPin className="h-3 w-3" />
                                Room {entry.room_number}
                              </span>
                            )}
                          </div>
                        </div>
                      ))
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        </TabsContent>

        <TabsContent value="list" className="space-y-4">
          {DAYS_OF_WEEK.filter((d) => d.value >= 1 && d.value <= 6).map((day) => {
            const dayEntries = timetable
              .filter((t) => t.day_of_week === day.value)
              .sort((a, b) => a.start_time.localeCompare(b.start_time))

            const isToday = day.value === today

            return (
              <Card key={day.value.toString()} className={isToday ? "border-primary border-2" : ""}>
                <CardHeader className="pb-2">
                  <CardTitle className="text-lg flex items-center justify-between">
                    {day.label}
                    {isToday && <Badge>Today</Badge>}
                  </CardTitle>
                  <CardDescription>{dayEntries.length} classes</CardDescription>
                </CardHeader>
                <CardContent>
                  {dayEntries.length === 0 ? (
                    <p className="text-sm text-muted-foreground py-4 text-center">No classes</p>
                  ) : (
                    <div className="space-y-2">
                      {dayEntries.map((entry) => (
                        <div
                          key={entry.id}
                          className="flex items-center justify-between p-3 rounded-lg bg-muted/50 hover:bg-muted transition-colors"
                        >
                          <div className="flex items-center gap-4">
                            <div className="text-center min-w-[80px]">
                              <div className="text-sm font-medium">{formatTime(entry.start_time)}</div>
                              <div className="text-xs text-muted-foreground">
                                {formatTime(entry.end_time)}
                              </div>
                            </div>
                            <div>
                              <div className="font-medium flex items-center gap-2">
                                <BookOpen className="h-4 w-4" />
                                {entry.subject?.name}
                              </div>
                              <div className="text-sm text-muted-foreground flex items-center gap-1">
                                <Users className="h-3 w-3" />
                                {entry.class?.name} {entry.section?.name || ""}
                              </div>
                            </div>
                          </div>
                          {entry.room_number && (
                            <Badge variant="outline">
                              <MapPin className="h-3 w-3 mr-1" />
                              Room {entry.room_number}
                            </Badge>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </CardContent>
              </Card>
            )
          })}
        </TabsContent>
      </Tabs>

      {/* Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{timetable.length}</div>
            <p className="text-xs text-muted-foreground">Total Classes/Week</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {new Set(timetable.map((t) => t.subject_id)).size}
            </div>
            <p className="text-xs text-muted-foreground">Subjects</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">
              {new Set(timetable.map((t) => `${t.class_id}-${t.section_id}`)).size}
            </div>
            <p className="text-xs text-muted-foreground">Class Sections</p>
          </CardContent>
        </Card>
        <Card>
          <CardContent className="pt-6">
            <div className="text-2xl font-bold">{todaySchedule.length}</div>
            <p className="text-xs text-muted-foreground">Classes Today</p>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
