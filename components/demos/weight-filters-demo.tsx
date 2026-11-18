"use client"

import { useId, useState, type ComponentProps } from "react"

import { DemoFrame } from "@/components/demos/demo-frame"
import { ReservedWeight } from "@/components/demos/reserved-weight"
import { studioFont } from "@/components/demos/studio-font"
import { cn } from "@/lib/utils"

const FILTERS = [
  "Websites",
  "Product design",
  "Branding",
  "Pitch decks",
  "Design systems",
  "Motion",
  "Illustration",
] as const

/**
 * A row of filter chips that wraps. Turning a chip on fills it and moves its
 * label from 500 to 600. Each label already holds its semibold width, so the
 * pill never grows, and the chips after it never move or rewrap.
 *
 * Selection is the only trigger: no hover weight, no press styling.
 */
export function WeightFiltersDemo({
  className,
  ...props
}: ComponentProps<"div">) {
  const labelId = useId()
  const [selected, setSelected] = useState<string[]>(["Websites", "Branding"])

  function toggle(filter: string) {
    setSelected((current) =>
      current.includes(filter)
        ? current.filter((item) => item !== filter)
        : [...current, filter]
    )
  }

  return (
    <div
      className={cn("flex w-content max-w-full flex-col", className)}
      {...props}
    >
      <DemoFrame className="w-full min-w-0! items-stretch gap-4 px-5 py-6 sm:px-8 sm:py-8">
        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span id={labelId}>Filter work</span>
          {/* Fades rather than mounts, so this row never reflows. */}
          <button
            type="button"
            onClick={() => setSelected([])}
            disabled={selected.length === 0}
            className="rounded-sm transition-[opacity,color] duration-150 ease-out outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 disabled:pointer-events-none disabled:opacity-0 motion-reduce:transition-none"
          >
            Clear
          </button>
        </div>

        <div
          role="group"
          aria-labelledby={labelId}
          className={cn(studioFont.className, "flex flex-wrap gap-2")}
        >
          {FILTERS.map((filter) => {
            const on = selected.includes(filter)
            return (
              <button
                key={filter}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(filter)}
                className={cn(
                  "inline-flex h-8 items-center rounded-full px-3.5 text-sm font-medium outline-none",
                  "transition-[color,background-color,box-shadow,font-weight] duration-150 ease-out motion-reduce:transition-none",
                  "focus-visible:ring-[3px] focus-visible:ring-ring/50",
                  on
                    ? "bg-foreground font-semibold text-background shadow-[inset_0_0_0_1px_var(--color-foreground)]"
                    : "bg-background text-foreground/70 shadow-[inset_0_0_0_1px_var(--color-border)] hover:text-foreground"
                )}
              >
                <ReservedWeight weight="semibold">{filter}</ReservedWeight>
              </button>
            )
          })}
        </div>
      </DemoFrame>
    </div>
  )
}
