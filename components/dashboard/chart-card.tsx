"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import {
  Bar,
  BarChart,
  Line,
  LineChart,
  ResponsiveContainer,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts"
import { ChartContainer, ChartTooltip, ChartTooltipContent } from "@/components/ui/chart"

interface ChartCardProps {
  title: string
  description?: string
  data: any[]
  type?: "bar" | "line" | "bar-multi"
  dataKey?: string
  xAxisKey: string
  bars?: { key: string; label: string; color?: string }[]
  height?: number
  color?: string
}

export function ChartCard({
  title,
  description,
  data,
  type = "bar",
  dataKey,
  xAxisKey,
  bars = [],
  height = 300,
  color = "var(--primary)",
}: ChartCardProps) {
  const ChartComponent = type === "line" ? LineChart : BarChart

  const processedBars = bars.map((b, i) => ({
    ...b,
    color: b.color || `var(--chart-${(i % 5) + 1})`,
  }))

  return (
    <Card className="border-border/50 shadow-sm">
      <CardHeader className="pb-4">
        <CardTitle className="text-xl">{title}</CardTitle>
        {description && <CardDescription className="text-sm">{description}</CardDescription>}
      </CardHeader>

      <CardContent className="pt-0 pl-2">
        <ChartContainer
          config={
            type === "bar-multi"
              ? Object.fromEntries(processedBars.map((b) => [b.key, { label: b.label, color: b.color }]))
              : {
                  [dataKey!]: {
                    label: dataKey?.charAt(0).toUpperCase() + dataKey!.slice(1),
                    color,
                  },
                }
          }
          style={{ height, width: "100%" }}
        >
          <ResponsiveContainer width="100%" height="100%">
            <ChartComponent data={data} margin={{ top: 10, right: 10, left: 0, bottom: 0 }}>
              <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
              <XAxis
                dataKey={xAxisKey}
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <YAxis
                tickLine={false}
                axisLine={false}
                tickMargin={10}
                tick={{ fill: "hsl(var(--muted-foreground))", fontSize: 12 }}
              />
              <ChartTooltip content={<ChartTooltipContent />} cursor={false} />

              {type === "bar-multi" &&
                processedBars.map((b, i) => (
                  <Bar
                    key={i}
                    dataKey={b.key}
                    fill={b.color}
                    radius={[4, 4, 0, 0]}
                  />
                ))}

              {type === "bar" && (
                <Bar
                  dataKey={dataKey}
                  fill={color}
                  radius={[4, 4, 0, 0]}
                />
              )}

              {type === "line" && (
                <Line
                  type="monotone"
                  dataKey={dataKey}
                  stroke={color}
                  strokeWidth={2}
                  dot={{ fill: color, strokeWidth: 2, r: 4 }}
                  activeDot={{ r: 6 }}
                />
              )}
            </ChartComponent>
          </ResponsiveContainer>
        </ChartContainer>
      </CardContent>
    </Card>
  )
}
