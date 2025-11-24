"use client"

import { Popover, PopoverTrigger, PopoverContent } from "@/components/ui/popover"
import { Command, CommandInput, CommandList, CommandEmpty, CommandGroup, CommandItem } from "@/components/ui/command"
import { Check, SlidersHorizontal } from "lucide-react"
import { cn } from "@/lib/utils"

interface Option {
  value: string
  label: string
}

interface NLSelectProps {
  label: string
  value: string
  onValueChange: (v: string) => void
  options: Option[]
  empty: string
  className?: string
}

export function NLSelect({ label, value, onValueChange, options, empty, className }: NLSelectProps) {
  const selected = options.find((opt) => opt.value === value)

  return (
    <Popover>
      <PopoverTrigger asChild>
        <button
          className={cn(
            "inline-flex items-center gap-2 underline-offset-10 decoration-0 hover:decoration-primary/70 hover:underline transition-colors",
            "text-foreground/90",
            className,
          )}
          aria-label={`Change ${label}`}
        >
          <span className="font-semibold">{selected?.value === "any" ? label : selected?.label || label}</span>
          <SlidersHorizontal className="h-4 w-4 text-muted-foreground" />
        </button>
      </PopoverTrigger>
      <PopoverContent className="p-0 w-64" align="start">
        <Command>
          <CommandInput placeholder={`Filter ${label}...`} />
          <CommandList>
            <CommandEmpty>{empty}</CommandEmpty>
            <CommandGroup>
              {options.map((opt) => (
                <CommandItem
                  key={opt.value}
                  value={opt.value}
                  onSelect={() => onValueChange(opt.value)}
                  className="cursor-pointer"
                >
                  <Check className={cn("mr-2 h-4 w-4", value === opt.value ? "opacity-100" : "opacity-0")} />
                  {opt.label === "any" ? label : opt.label}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
