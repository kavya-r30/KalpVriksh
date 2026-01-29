"use client"

import { useState, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon } from "lucide-react"
import { getHolidaysInRange, Holiday, HOLIDAY_TYPE_COLORS, isHoliday } from "@/lib/api/holiday-service"
import { cn } from "@/lib/utils"

interface HolidayCalendarProps {
  schoolId: string
  className?: string
  compact?: boolean
}

const DAYS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"]
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
]

export function HolidayCalendar({ schoolId, className, compact = false }: HolidayCalendarProps) {
  const [currentDate, setCurrentDate] = useState(new Date())
  const [holidays, setHolidays] = useState<Holiday[]>([])
  const [loading, setLoading] = useState(true)
  const [selectedDate, setSelectedDate] = useState<Date | null>(null)

  const year = currentDate.getFullYear()
  const month = currentDate.getMonth()

  useEffect(() => {
    async function fetchHolidays() {
      if (!schoolId) return
      setLoading(true)
      try {
        const startOfMonth = new Date(year, month, 1).toLocaleDateString("en-CA")
        const endOfMonth = new Date(year, month + 1, 0).toLocaleDateString("en-CA")
        const data = await getHolidaysInRange(schoolId, startOfMonth, endOfMonth)
        setHolidays(data)
      } catch (error) {
        console.error("Error fetching holidays:", error)
      } finally {
        setLoading(false)
      }
    }
    fetchHolidays()
  }, [schoolId, year, month])

  const firstDayOfMonth = new Date(year, month, 1).getDay()
  const daysInMonth = new Date(year, month + 1, 0).getDate()
  const today = new Date()

  const prevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1))
    setSelectedDate(null)
  }

  const nextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1))
    setSelectedDate(null)
  }

  const goToToday = () => {
    setCurrentDate(new Date())
    setSelectedDate(new Date())
  }

  const handleDateClick = (day: number) => {
    setSelectedDate(new Date(year, month, day))
  }

  const selectedHoliday = selectedDate ? isHoliday(selectedDate, holidays) : null

  // Generate calendar grid
  const calendarDays: (number | null)[] = []
  for (let i = 0; i < firstDayOfMonth; i++) {
    calendarDays.push(null)
  }
  for (let i = 1; i <= daysInMonth; i++) {
    calendarDays.push(i)
  }

  return (
    <Card className={className}>
      <CardHeader className={compact ? "pb-2" : "pb-4"}>
        <div className="flex items-center justify-between">
          <CardTitle className={cn("flex items-center gap-2", compact && "text-base")}>
            <CalendarIcon className={compact ? "h-4 w-4" : "h-5 w-5"} />
            {compact ? `${MONTHS[month].slice(0, 3)} ${year}` : `${MONTHS[month]} ${year}`}
          </CardTitle>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon" onClick={prevMonth} className="h-8 w-8">
              <ChevronLeft className="h-4 w-4" />
            </Button>
            <Button variant="ghost" size="sm" onClick={goToToday} className="h-8 text-xs">
              Today
            </Button>
            <Button variant="ghost" size="icon" onClick={nextMonth} className="h-8 w-8">
              <ChevronRight className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent className={compact ? "pt-0" : ""}>
        {loading ? (
          <div className="flex items-center justify-center h-48">
            <div className="h-8 w-8 rounded-full border-2 border-primary border-t-transparent animate-spin" />
          </div>
        ) : (
          <>
            {/* Day headers */}
            <div className="grid grid-cols-7 gap-1 mb-2">
              {DAYS.map((day) => (
                <div
                  key={day}
                  className={cn(
                    "text-center font-medium text-muted-foreground",
                    compact ? "text-xs py-1" : "text-sm py-2"
                  )}
                >
                  {compact ? day.charAt(0) : day}
                </div>
              ))}
            </div>

            {/* Calendar grid */}
            <div className="grid grid-cols-7 gap-1">
              {calendarDays.map((day, index) => {
                if (day === null) {
                  return <div key={`empty-${index}`} className="aspect-square" />
                }

                const date = new Date(year, month, day)
                const holiday = isHoliday(date, holidays)
                const isToday =
                  day === today.getDate() &&
                  month === today.getMonth() &&
                  year === today.getFullYear()
                const isSelected =
                  selectedDate &&
                  day === selectedDate.getDate() &&
                  month === selectedDate.getMonth() &&
                  year === selectedDate.getFullYear()
                const isSunday = date.getDay() === 0

                return (
                  <button
                    key={day}
                    onClick={() => handleDateClick(day)}
                    className={cn(
                      "aspect-square rounded-md flex flex-col items-center justify-center relative transition-colors",
                      compact ? "text-xs" : "text-sm",
                      isToday && "ring-2 ring-primary",
                      isSelected && "bg-primary text-primary-foreground",
                      !isSelected && holiday && "bg-red-100 dark:bg-red-900/30",
                      !isSelected && !holiday && isSunday && "text-red-500",
                      !isSelected && !holiday && !isSunday && "hover:bg-muted"
                    )}
                  >
                    <span>{day}</span>
                    {holiday && (
                      <span
                        className={cn(
                          "absolute bottom-0.5 w-1.5 h-1.5 rounded-full",
                          HOLIDAY_TYPE_COLORS[holiday.holiday_type]
                        )}
                      />
                    )}
                  </button>
                )
              })}
            </div>

            {/* Selected date info or holiday list */}
            {!compact && (
              <div className="mt-4 pt-4 border-t">
                {selectedHoliday ? (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <span className="font-medium">{selectedHoliday.name}</span>
                      <Badge
                        variant="secondary"
                        className={cn("text-white", HOLIDAY_TYPE_COLORS[selectedHoliday.holiday_type])}
                      >
                        {selectedHoliday.holiday_type}
                      </Badge>
                    </div>
                    {selectedHoliday.description && (
                      <p className="text-sm text-muted-foreground">{selectedHoliday.description}</p>
                    )}
                  </div>
                ) : selectedDate ? (
                  <p className="text-sm text-muted-foreground text-center">
                    No events on {selectedDate.toLocaleDateString("en-IN", { weekday: "long", day: "numeric", month: "long" })}
                  </p>
                ) : holidays.length > 0 ? (
                  <div className="space-y-2">
                    <p className="text-sm font-medium">This Month:</p>
                    <div className="flex flex-wrap gap-1">
                      {holidays.slice(0, 3).map((h) => (
                        <Badge key={h.id} variant="outline" className="text-xs">
                          {new Date(h.holiday_date).getDate()} - {h.name}
                        </Badge>
                      ))}
                      {holidays.length > 3 && (
                        <Badge variant="outline" className="text-xs">
                          +{holidays.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-sm text-muted-foreground text-center">
                    No holidays this month
                  </p>
                )}
              </div>
            )}

            {/* Legend */}
            {!compact && (
              <div className="mt-4 pt-4 border-t">
                <p className="text-xs text-muted-foreground mb-2">Legend:</p>
                <div className="flex flex-wrap gap-2">
                  {Object.entries(HOLIDAY_TYPE_COLORS).map(([type, color]) => (
                    <div key={type} className="flex items-center gap-1">
                      <span className={cn("w-2 h-2 rounded-full", color)} />
                      <span className="text-xs">{type}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
