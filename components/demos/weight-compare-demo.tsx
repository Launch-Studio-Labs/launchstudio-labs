"use client"

import { useEffect, useRef, useState, type ComponentProps } from "react"

import {
  ReservedWeight,
  weightTabClassName,
} from "@/components/demos/reserved-weight"
import { DemoFrame } from "@/components/demos/demo-frame"
import { studioFont } from "@/components/demos/studio-font"
import { Switch } from "@/components/ui/switch"
import {
  Tabs,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

const TABS = [
  { value: "work", label: "Our Work" },
  { value: "questions", label: "Often asked" },
] as const

/**
 * A tab's rendered width, watched. It changes during the weight transition
 * as well as after it, so the number follows the label rather than jumping
 * once it has settled.
 */
function useWidth() {
  const ref = useRef<HTMLButtonElement>(null)
  const [width, setWidth] = useState(0)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(() =>
      setWidth(element.getBoundingClientRect().width)
    )
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return [ref, width] as const
}

function MeasuredTrigger({
  value,
  label,
  reserved,
  measure,
}: {
  value: string
  label: string
  reserved: boolean
  measure: boolean
}) {
  const [ref, width] = useWidth()

  return (
    <TabsTrigger
      ref={ref}
      value={value}
      className={cn(
        weightTabClassName,
        // The tab's own box, drawn while measuring. An outline takes no
        // space, so drawing it cannot change what it measures.
        "outline-offset-0",
        measure && "outline-1 outline-foreground/20 outline-dashed"
      )}
    >
      {reserved ? <ReservedWeight>{label}</ReservedWeight> : label}
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute top-full left-1/2 mt-3.5 -translate-x-1/2 text-[11px] font-normal text-muted-foreground tabular-nums transition-opacity duration-150 ease-out",
          measure ? "opacity-100" : "opacity-0"
        )}
      >
        {width ? `${Math.round(width)}px` : ""}
      </span>
    </TabsTrigger>
  )
}

function Row({
  title,
  reserved,
  value,
  onValueChange,
  measure,
}: {
  title: string
  reserved: boolean
  value: string
  onValueChange: (value: string) => void
  measure: boolean
}) {
  return (
    <div className="flex flex-col gap-3">
      <p className="text-xs text-muted-foreground">{title}</p>
      <Tabs
        value={value}
        onValueChange={(next) => onValueChange(String(next))}
        className={cn(studioFont.className, "w-full")}
      >
        <TabsList
          variant="line"
          aria-label={title}
          className="w-full justify-start pl-0"
        >
          {TABS.map((tab) => (
            <MeasuredTrigger
              key={tab.value}
              value={tab.value}
              label={tab.label}
              reserved={reserved}
              measure={measure}
            />
          ))}
          <TabsIndicator />
        </TabsList>
      </Tabs>
      {/* Room for the widths printed under the rail. */}
      <div aria-hidden className="h-5" />
    </div>
  )
}

/**
 * The same pair of tabs twice, sharing one selection. The top row only
 * changes `font-weight`; the bottom row also reserves the bold width. Switch
 * tabs and watch the second label, the underline and the widths.
 */
export function WeightCompareDemo({
  className,
  ...props
}: ComponentProps<"div">) {
  const [tab, setTab] = useState("work")
  const [measure, setMeasure] = useState(true)

  return (
    <div
      className={cn("flex w-content max-w-full flex-col gap-6", className)}
      {...props}
    >
      <div className="flex items-center">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none">
          <Switch size="sm" checked={measure} onCheckedChange={setMeasure} />
          Widths
        </label>
      </div>

      <DemoFrame className="w-full min-w-0! items-stretch gap-6 px-5 py-6 sm:px-8 sm:py-8">
        <Row
          title="Weight only"
          reserved={false}
          value={tab}
          onValueChange={setTab}
          measure={measure}
        />
        <Row
          title="Width reserved"
          reserved
          value={tab}
          onValueChange={setTab}
          measure={measure}
        />
      </DemoFrame>
    </div>
  )
}
