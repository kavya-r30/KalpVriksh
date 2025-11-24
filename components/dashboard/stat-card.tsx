import { Card, CardContent } from "@/components/ui/card"
import type { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"

interface StatCardProps {
  title: string
  value: string | number
  icon: LucideIcon
  description?: string
  trend?: {
    value: number
    isPositive: boolean
  }
  className?: string
  iconClassName?: string
  variant?: "default" | "blue" | "purple" | "orange" | "green"
}

const variants = {
  default: "bg-card text-card-foreground",
  blue: "bg-primary/10 border-primary/20",
  purple: "bg-chart-2/10 border-chart-2/20",
  orange: "bg-chart-3/10 border-chart-3/20",
  green: "bg-chart-4/10 border-chart-4/20",
}

const iconVariants = {
  default: "bg-secondary/50 text-foreground",
  blue: "bg-primary/20 text-primary",
  purple: "bg-chart-2/20 text-chart-2",
  orange: "bg-chart-3/20 text-chart-3",
  green: "bg-chart-4/20 text-chart-4",
}

export function StatCard({
  title,
  value,
  icon: Icon,
  description,
  trend,
  className,
  iconClassName,
  variant = "default",
}: StatCardProps) {
  return (
    <Card
      className={cn(
        "overflow-hidden border-border/50 shadow-sm hover:shadow-md transition-all duration-200",
        variants[variant],
        className,
      )}
    >
      <CardContent className="p-6">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-2 flex-1">
            <p className="text-sm font-medium text-muted-foreground uppercase tracking-wide">{title}</p>
            <p className="text-3xl font-bold tracking-tight">{value}</p>
            {description && <p className="text-xs text-muted-foreground leading-relaxed">{description}</p>}
            {trend && (
              <div className="flex items-center gap-1 pt-1">
                <span
                  className={cn(
                    "text-xs font-semibold",
                    trend.isPositive ? "text-green-600 dark:text-green-400" : "text-red-600 dark:text-red-400",
                  )}
                >
                  {trend.isPositive ? "↑" : "↓"} {Math.abs(trend.value)}%
                </span>
                <span className="text-xs text-muted-foreground">vs last period</span>
              </div>
            )}
          </div>
          <div
            className={cn(
              "rounded-xl p-3 ring-1 ring-inset ring-black/5 dark:ring-white/10",
              iconVariants[variant],
              iconClassName,
            )}
          >
            <Icon className="h-6 w-6" />
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
