"use client"

import type { ComponentProps } from "react"

import {
  EMPTY_STATES,
  type EmptyStateType,
} from "@/components/empty-states/states"
import {
  getEmptyStateStyle,
  type EmptyStateStyleId,
} from "@/components/empty-states/styles"
import { useGlobalTuning } from "@/components/empty-states/tuning"
import {
  Empty,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

/**
 * A full empty state: one style's art over the state's title and description.
 *
 * The art and the words are separate on purpose. The art only knows which
 * state to draw; the copy comes from `states.ts`. Swapping the style changes
 * the picture and nothing else.
 */
export function EmptyStatePanel({
  state,
  styleId,
  className,
  ...props
}: ComponentProps<"div"> & {
  state: EmptyStateType
  styleId: EmptyStateStyleId
}) {
  const Art = getEmptyStateStyle(styleId).art
  const { stageHeight } = useGlobalTuning()
  const copy = EMPTY_STATES[state]

  return (
    <Empty
      data-empty-state
      data-state={state}
      data-style={styleId}
      className={cn("gap-6 px-6 pt-8 pb-10", className)}
      {...props}
    >
      <EmptyMedia
        aria-hidden
        style={{ height: stageHeight }}
        className="relative mb-0 w-full max-w-sm"
      >
        <Art state={state} />
      </EmptyMedia>

      {/* Keyed on the state, so its words arrive with it. */}
      <EmptyHeader key={state} className="es-swap">
        <EmptyTitle>{copy.title}</EmptyTitle>
        {/* Two lines held open, so shorter copy doesn't jolt the layout. */}
        <EmptyDescription className="min-h-[2lh]">
          {copy.description}
        </EmptyDescription>
      </EmptyHeader>
    </Empty>
  )
}
