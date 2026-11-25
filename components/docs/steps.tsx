import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Numbered steps joined by a dashed thread from each number down to the next,
 * 4px clear of each badge, so they read as one run (DESIGN.md › Surfaces).
 */
export function Steps({
  steps,
  className,
}: {
  /** A string body is one paragraph; anything else (commands, lists) is laid out 12px apart. */
  steps: readonly { title: string; body: ReactNode }[]
  className?: string
}) {
  return (
    <ol className={cn("flex flex-col gap-4", className)}>
      {steps.map((step, index) => (
        <li key={step.title} className="relative flex gap-3">
          {index < steps.length - 1 && (
            <span
              aria-hidden
              className="absolute top-7 -bottom-3 left-[11.5px] w-px bg-[repeating-linear-gradient(to_bottom,currentColor_0_3px,transparent_3px_6px)] text-foreground/20"
            />
          )}
          <span className="flex size-6 shrink-0 items-center justify-center rounded-full bg-muted text-xs font-medium tabular-nums">
            {index + 1}
          </span>
          <div className="flex min-w-0 flex-1 flex-col gap-1 pt-0.5">
            <p className="text-sm font-medium">{step.title}</p>
            {typeof step.body === "string" ? (
              <p className="text-sm leading-normal text-pretty text-body">
                {step.body}
              </p>
            ) : (
              <div className="flex flex-col gap-3 pt-2 text-sm leading-normal text-body">
                {step.body}
              </div>
            )}
          </div>
        </li>
      ))}
    </ol>
  )
}
