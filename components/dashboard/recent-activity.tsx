import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { formatDistanceToNow } from "date-fns"

interface Activity {
  id: string
  title: string
  description: string
  timestamp: string
  user?: {
    name: string
    avatar?: string
  }
  type?: "info" | "success" | "warning" | "error"
}

interface RecentActivityProps {
  activities: Activity[]
  title?: string
  description?: string
}

export function RecentActivity({ activities, title = "Recent Activity", description }: RecentActivityProps) {
  const getTypeColor = (type?: string) => {
    switch (type) {
      case "success":
        return "bg-green-100 text-green-700"
      case "warning":
        return "bg-yellow-100 text-yellow-700"
      case "error":
        return "bg-red-100 text-red-700"
      default:
        return "bg-blue-100 text-blue-700"
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        {description && <CardDescription>{description}</CardDescription>}
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {activities.length === 0 ? (
            <p className="text-sm text-muted-foreground text-center py-8">No recent activity</p>
          ) : (
            activities.map((activity) => (
              <div key={activity.id} className="flex items-start gap-4">
                {activity.user ? (
                  <Avatar className="h-9 w-9">
                    <AvatarFallback className={getTypeColor(activity.type)}>
                      {activity.user.name
                        .split(" ")
                        .map((n) => n[0])
                        .join("")
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                ) : (
                  <div
                    className={`h-9 w-9 rounded-full flex items-center justify-center ${getTypeColor(activity.type)}`}
                  >
                    <span className="text-xs font-medium">•</span>
                  </div>
                )}
                <div className="flex-1 space-y-1">
                  <p className="text-sm font-medium leading-none">{activity.title}</p>
                  <p className="text-sm text-muted-foreground">{activity.description}</p>
                  <p className="text-xs text-muted-foreground">
                    {formatDistanceToNow(new Date(activity.timestamp), { addSuffix: true })}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </CardContent>
    </Card>
  )
}
