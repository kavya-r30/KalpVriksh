"use client"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

interface InlineSelectProps {
  label?: string
  placeholder?: string
  options: { label: string; value: string }[]
  value?: string
  onChange: (value: string) => void
  className?: string
}

export function InlineSelect({
  label,
  placeholder = "Select...",
  options,
  value,
  onChange,
  className,
}: InlineSelectProps) {
  return (
    <div className="flex items-center gap-2">
      {label && <span className="text-sm font-medium text-muted-foreground whitespace-nowrap">{label}:</span>}
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-8 w-[180px] bg-background border-border/60 focus:ring-0 focus:ring-offset-0">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>
          {options.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  )
}
