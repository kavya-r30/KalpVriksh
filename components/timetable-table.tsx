"use client"

import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { type TimetableEntry, DAYS_OF_WEEK, formatTime, getUniqueTimeSlots, getEntryForSlot } from "@/lib/api/timetable-service"
import { Clock, User, MapPin } from "lucide-react"

interface TimetableTableProps {
  entries: TimetableEntry[]
  title?: string
  description?: string
  showTeacher?: boolean
  showRoom?: boolean
  showClass?: boolean
  highlightToday?: boolean
}

export function TimetableTable({
  entries,
  title = "Weekly Timetable",
  description = "Class schedule for the week",
  showTeacher = true,
  showRoom = true,
  showClass = false,
  highlightToday = true,
}: TimetableTableProps) {
  const today = new Date().getDay()
  const timeSlots = getUniqueTimeSlots(entries)
  const workingDays = DAYS_OF_WEEK.filter((d) => d.value >= 1 && d.value <= 6) // Mon-Sat

  if (entries.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>{title}</CardTitle>
          <CardDescription>{description}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-12 text-muted-foreground">
            <Clock className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p>No timetable entries found</p>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription>{description}</CardDescription>
      </CardHeader>
      <CardContent className="overflow-x-auto">
        <table className="w-full border-collapse min-w-[800px]">
          <thead>
            <tr>
              <th className="border p-2 bg-muted text-left font-semibold text-sm min-w-[100px]">
                Time
              </th>
              {workingDays.map((day) => (
                <th
                  key={day.value}
                  className={`border p-2 text-center font-semibold text-sm ${
                    highlightToday && day.value === today
                      ? "bg-primary/10 text-primary"
                      : "bg-muted"
                  }`}
                >
                  {day.label}
                  {highlightToday && day.value === today && (
                    <Badge variant="default" className="ml-2 text-xs">
                      Today
                    </Badge>
                  )}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {timeSlots.map((slot, index) => (
              <tr key={`${slot.start_time}-${slot.end_time}`}>
                <td className="border p-2 bg-muted/50 text-sm font-medium">
                  <div className="flex items-center gap-1">
                    <Clock className="h-3 w-3 text-muted-foreground" />
                    <span>{formatTime(slot.start_time)}</span>
                  </div>
                  <div className="text-xs text-muted-foreground">
                    {formatTime(slot.end_time)}
                  </div>
                </td>
                {workingDays.map((day) => {
                  const entry = getEntryForSlot(entries, day.value, slot.start_time, slot.end_time)
                  const isToday = highlightToday && day.value === today

                  return (
                    <td
                      key={`${day.value}-${slot.start_time}`}
                      className={`border p-2 text-center align-top ${
                        isToday ? "bg-primary/5" : ""
                      } ${entry ? "hover:bg-muted/50" : ""}`}
                    >
                      {entry ? (
                        <div className="space-y-1">
                          <div className="font-medium text-sm">
                            {entry.subject?.name || "Unknown Subject"}
                          </div>
                          {showClass && entry.class && (
                            <Badge variant="outline" className="text-xs">
                              {entry.class.name}
                              {entry.section?.name ? ` - ${entry.section.name}` : ""}
                            </Badge>
                          )}
                          {showTeacher && entry.teacher && (
                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                              <User className="h-3 w-3" />
                              {entry.teacher.first_name} {entry.teacher.last_name}
                            </div>
                          )}
                          {showRoom && entry.room_number && (
                            <div className="text-xs text-muted-foreground flex items-center justify-center gap-1">
                              <MapPin className="h-3 w-3" />
                              Room {entry.room_number}
                            </div>
                          )}
                        </div>
                      ) : (
                        <span className="text-muted-foreground text-xs">-</span>
                      )}
                    </td>
                  )
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </CardContent>
    </Card>
  )
}

// Compact timetable view for dashboard widgets
export function TimetableCompact({
  entries,
  title = "Today's Schedule",
}: {
  entries: TimetableEntry[]
  title?: string
}) {
  const today = new Date().getDay()
  const todayEntries = entries
    .filter((e) => e.day_of_week === today)
    .sort((a, b) => a.start_time.localeCompare(b.start_time))

  if (todayEntries.length === 0) {
    return (
      <Card>
        <CardHeader className="pb-2">
          <CardTitle className="text-lg">{title}</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-muted-foreground text-sm">No classes scheduled for today</p>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-lg flex items-center gap-2">
          <Clock className="h-4 w-4" />
          {title}
        </CardTitle>
        <CardDescription>{todayEntries.length} classes today</CardDescription>
      </CardHeader>
      <CardContent className="space-y-2">
        {todayEntries.map((entry) => (
          <div
            key={entry.id}
            className="flex items-center justify-between p-2 rounded-lg bg-muted/50"
          >
            <div>
              <div className="font-medium text-sm">{entry.subject?.name}</div>
              {entry.teacher && (
                <div className="text-xs text-muted-foreground">
                  {entry.teacher.first_name} {entry.teacher.last_name}
                </div>
              )}
            </div>
            <Badge variant="outline" className="text-xs">
              {formatTime(entry.start_time)}
            </Badge>
          </div>
        ))}
      </CardContent>
    </Card>
  )
}
