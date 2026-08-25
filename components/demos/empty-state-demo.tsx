"use client"

import type { ComponentProps } from "react"

import { EmptyState, type EmptyStateVariant } from "@/components/ui/empty-state"
import { cn } from "@/lib/utils"

/** The variant the docs page previews, and the one the playground shows. */
export const EMPTY_STATE_VARIANT: EmptyStateVariant = "no-results"

/**
 * The component is `w-full` by design, so the demo holds the measure itself:
 * it fills the page's content column in the docs and the same width on the
 * playground canvas, rather than stretching to whatever is around it.
 */
export function EmptyStateDemo({ className, ...props }: ComponentProps<"div">) {
  return (
    <div className={cn("w-content max-w-full", className)} {...props}>
      <EmptyState variant={EMPTY_STATE_VARIANT} />
    </div>
  )
}
