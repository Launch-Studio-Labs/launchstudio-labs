import { cn } from "@/lib/utils"

/**
 * The trigger styles the studio's line tabs use, plus the weight change.
 *
 * Resting labels are 500. A pressed or active one is 700. `font-weight`
 * transitions because the face is variable: the browser moves along the
 * `wght` axis rather than swapping one file for another. The press itself is
 * the studio's: 0.97 scale over 100ms, ease-out.
 */
export const bolderTriggerClassName = cn(
  "touch-manipulation font-medium select-none",
  "data-active:font-bold active:font-bold",
  "transition-[color,scale,font-weight] duration-100 ease-out",
  "active:scale-[0.97] motion-reduce:transition-none motion-reduce:active:scale-100"
)

/**
 * A label that is already as wide as its bold self.
 *
 * The `::after` holds a bold copy of the same words. It is invisible and has
 * no height, but it still takes part in layout, so the label's box is the
 * width of the bold text from the start. When the visible text thickens it
 * fills room that was already there, and nothing around it moves.
 *
 * The text is centred in that box, so it grows evenly to both sides.
 * `visibility: hidden` also keeps the copy out of the accessibility tree:
 * the tab is announced once.
 */
export function BolderLabel({ children }: { children: string }) {
  return (
    <span
      data-text={children}
      className={cn(
        "inline-flex flex-col items-center",
        "after:pointer-events-none after:invisible after:h-0 after:overflow-hidden after:font-bold after:select-none after:content-[attr(data-text)]"
      )}
    >
      {children}
    </span>
  )
}
