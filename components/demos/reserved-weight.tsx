import { cn } from "@/lib/utils"

/**
 * The studio's line tabs, with the selected label set heavier: 500 at rest,
 * 700 when selected. Selection is the only trigger. There is no `:active`,
 * hover or press styling, so the weight is the one thing that changes and
 * any movement you see comes from wider letters, nothing else.
 *
 * `font-weight` transitions because the face is variable: the browser moves
 * along the `wght` axis instead of swapping one file for another.
 */
export const weightTabClassName = cn(
  "font-medium data-active:font-bold",
  "transition-[color,font-weight] duration-100 ease-out",
  "motion-reduce:transition-none"
)

/**
 * The reserved copy has to be drawn at the heaviest weight the label reaches.
 * Listed whole so Tailwind can see each class.
 */
const RESERVE_WEIGHT = {
  semibold: "after:font-semibold",
  bold: "after:font-bold",
} as const

/**
 * A label that is already as wide as its heavier self.
 *
 * The `::after` holds a copy of the same words at the heavier weight. It is
 * invisible and has no height, but it still takes part in layout, so the
 * label's box is the width of the heavier text from the start. When the
 * visible text gets heavier it fills room that was already there, and
 * nothing around it moves.
 *
 * The text is centred in that box, so it grows evenly to both sides.
 * `visibility: hidden` keeps the copy out of the accessibility tree and
 * `user-select: none` out of copy and paste, so the label is read once.
 */
export function ReservedWeight({
  children,
  weight = "bold",
}: {
  children: string
  weight?: keyof typeof RESERVE_WEIGHT
}) {
  return (
    <span
      data-text={children}
      className={cn(
        "inline-flex flex-col items-center",
        "after:pointer-events-none after:invisible after:h-0 after:overflow-hidden after:content-[attr(data-text)] after:select-none",
        RESERVE_WEIGHT[weight]
      )}
    >
      {children}
    </span>
  )
}
