"use client"

import type { ComponentProps } from "react"

import { DemoFrame } from "@/components/demos/demo-frame"
import {
  EMPTY_STATE_TYPES,
  EMPTY_STATES,
} from "@/components/empty-states/states"
import { EMPTY_STATE_STYLES } from "@/components/empty-states/styles"
import { focusStyle, useGlobalTuning } from "@/components/empty-states/tuning"
import { cn } from "@/lib/utils"

/**
 * Every state in every style, art only: a row per style, a column per state.
 * Reading across a row shows whether a style holds together; reading down a
 * column shows how differently the four say the same thing.
 *
 * Each tile is its own hover target, and art that scrolls out of view stops
 * drawing, so thirty of them cost little more than the ones on screen.
 */
export function EmptyStateMatrixDemo({
  className,
  ...props
}: ComponentProps<"div">) {
  const { tileHeight } = useGlobalTuning()

  return (
    <div className={cn("w-full overflow-x-auto", className)} {...props}>
      <DemoFrame className="mx-auto">
        <div
          role="table"
          aria-label="Empty states by style"
          className="grid grid-cols-[4.5rem_repeat(6,8.5rem)] gap-2"
        >
          <div role="row" className="contents">
            <span role="columnheader" />
            {EMPTY_STATE_TYPES.map((type) => (
              <span
                key={type}
                role="columnheader"
                className="px-1 pb-1 text-xs text-muted-foreground"
              >
                {EMPTY_STATES[type].name}
              </span>
            ))}
          </div>

          {EMPTY_STATE_STYLES.map((style) => {
            const Art = style.art
            return (
              <div key={style.id} role="row" className="contents">
                <span
                  role="rowheader"
                  className="flex items-center text-sm font-medium"
                >
                  {style.name}
                </span>
                {EMPTY_STATE_TYPES.map((type) => (
                  <div
                    key={type}
                    role="cell"
                    data-empty-state
                    aria-label={`${style.name}: ${EMPTY_STATES[type].name}`}
                    style={{ height: tileHeight }}
                    // Hovering a tile points the dev dials at its style.
                    onPointerEnter={() => focusStyle(style.id)}
                    className="relative overflow-hidden rounded-lg border border-border bg-background"
                  >
                    <div aria-hidden className="absolute inset-0">
                      <Art state={type} size="sm" />
                    </div>
                  </div>
                ))}
              </div>
            )
          })}
        </div>
      </DemoFrame>
    </div>
  )
}
