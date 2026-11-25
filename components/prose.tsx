import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Splits a paragraph on its markers and lifts what they hold. `**bold**` is
 * full foreground at medium weight, against body copy set a step back —
 * weight and colour together are what makes a phrase catch at a glance, either
 * one on its own reads as an accident. `` `code` `` is set in mono, for the
 * odd property name that has to be read exactly.
 */
function emphasise(paragraph: string) {
  // The capture group lands on every odd index; the rest is plain text.
  return paragraph.split(/(\*\*.+?\*\*|`.+?`)/g).map((part, index) => {
    if (index % 2 === 0) return part
    if (part.startsWith("`")) {
      return (
        <code
          key={index}
          className="rounded-sm bg-muted px-1 py-px font-mono text-[0.9em] text-foreground"
        >
          {part.slice(1, -1)}
        </code>
      )
    }
    return (
      <strong key={index} className="font-medium text-foreground">
        {part.slice(2, -2)}
      </strong>
    )
  })
}

/**
 * A run of body copy. Paragraphs are parted by a blank line rather than a
 * spacing step: `1lh` is one line of the text's own leading, so the gap tracks
 * the type instead of drifting from it when the size changes.
 */
export function Prose({
  className,
  paragraphs,
  children,
}: {
  className?: string
  /** Plain strings, with `**bold**` and `` `code` `` markers… */
  paragraphs?: readonly string[]
  /** …or your own `<p>`s, when a paragraph needs a link or a component. */
  children?: ReactNode
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[1lh] text-sm leading-normal text-body [&_strong]:font-medium [&_strong]:text-foreground",
        className
      )}
    >
      {paragraphs?.map((paragraph) => (
        <p key={paragraph}>{emphasise(paragraph)}</p>
      ))}
      {children}
    </div>
  )
}
