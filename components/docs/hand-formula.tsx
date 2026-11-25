import type { ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * A formula written out by hand, as if on a whiteboard: one line per step,
 * with each named quantity picked out in its own marker colour so the same
 * term reads as the same thing from one formula to the next.
 */
export function HandFormula({ className, ...props }: ComponentProps<"div">) {
  return (
    <div
      className={cn(
        "flex min-w-0 flex-col font-hand text-[28px] leading-normal font-medium tracking-[-0.02em] text-[#272624] italic",
        className
      )}
      {...props}
    />
  )
}

/** One line of a formula. Wraps rather than scrolls on a narrow screen. */
export function HandFormulaLine({ className, ...props }: ComponentProps<"p">) {
  return <p className={cn("whitespace-pre-wrap", className)} {...props} />
}

/**
 * Each quantity's ink and marker. The marker is a band across the lower part
 * of the word, tilted a degree or two either way so it looks drawn, not set.
 */
const TERMS = {
  inner:
    "text-[#304f9c] bg-[linear-gradient(177deg,transparent_60%,#dce5ff_62%,#dce5ff_89%,transparent_91%)]",
  outer:
    "text-[#9a4316] bg-[linear-gradient(183deg,transparent_60%,#ffd3a8_62%,#ffd3a8_89%,transparent_91%)]",
  padding:
    "text-[#246448] bg-[linear-gradient(177deg,transparent_60%,#d4eddb_62%,#d4eddb_89%,transparent_91%)]",
  floor:
    "text-[#7a5b07] bg-[linear-gradient(182deg,transparent_60%,#fbe8a6_62%,#fbe8a6_89%,transparent_91%)]",
}

export function HandTerm({
  term,
  className,
  ...props
}: { term: keyof typeof TERMS } & ComponentProps<"span">) {
  return (
    <span
      className={cn("box-decoration-clone", TERMS[term], className)}
      {...props}
    />
  )
}
