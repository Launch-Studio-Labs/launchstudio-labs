import type { CSSProperties, ComponentProps, ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * Pencil notes scribbled in the margin of a `HandFormula`, each with a loose
 * arrow to the term it explains. From `sm` up the notes sit around the
 * formula; below that there is no margin to write in, so they line up under
 * it as a short list instead, without arrows.
 */
export type Scribble = {
  text: ReactNode
  /**
   * Where the note sits from `sm` up, measured from the top-left of the term
   * it is anchored on (see `ScribbleAnchor`), and its tilt in degrees. Lengths
   * are in units of a 23px formula; `SCALE` sizes them to the real one.
   */
  at: { left: number; top: number; width: number; rotate: number }
  /**
   * The arrow from the note to the term, as SVG path data in the same
   * units. Leave it out for a note that needs none.
   */
  arrow?: string[]
}

/**
 * How much bigger the formula is than the 23px the positions were drawn at
 * (`HandFormula` is 28px). Notes, arrows and the room around them all grow by
 * it, so the drawing keeps its proportions.
 */
const SCALE = 28 / 23

/** Pencil: the hand font, upright, a shade lighter than the formula's ink. */
const PENCIL =
  "font-hand text-[22px] leading-[1.2] font-medium tracking-normal text-[#6f6c66] not-italic"

/**
 * A formula with margin notes. `room` is the space kept above and below the
 * formula from `sm` up, so notes written there never run into what's around
 * it. `example` is a worked example, scribbled under everything.
 */
export function ScribbledFormula({
  scribbles,
  room,
  example,
  className,
  children,
  ...props
}: {
  scribbles: Scribble[]
  room: { top: number; bottom: number }
  example?: ReactNode
} & ComponentProps<"figure">) {
  return (
    <figure
      className={cn("flex min-w-0 flex-col gap-3", className)}
      {...props}
    >
      <div
        style={
          {
            "--room-top": `${room.top * SCALE}px`,
            "--room-bottom": `${room.bottom * SCALE}px`,
          } as CSSProperties
        }
        className="sm:pt-(--room-top) sm:pb-(--room-bottom)"
      >
        {children}
      </div>
      <ul className="flex flex-col gap-1.5 sm:hidden">
        {scribbles.map((scribble, index) => (
          <li key={index} className={PENCIL}>
            {scribble.text}
          </li>
        ))}
      </ul>
      {example && (
        <figcaption className={cn(PENCIL, "origin-top-left -rotate-1")}>
          {example}
        </figcaption>
      )}
    </figure>
  )
}

/**
 * Wraps the term a scribble points at. The note and its arrow hang off this
 * span, so they stay on the term whatever the font's exact widths.
 */
export function ScribbleAnchor({
  scribble,
  children,
}: {
  scribble: Scribble
  children: ReactNode
}) {
  const { at, arrow } = scribble

  return (
    <span className="relative">
      {children}
      <span
        style={{
          left: at.left * SCALE,
          top: at.top * SCALE,
          width: at.width * SCALE,
          transform: `rotate(${at.rotate}deg)`,
        }}
        className={cn(
          PENCIL,
          "absolute hidden origin-top-left whitespace-normal sm:block"
        )}
      >
        {scribble.text}
      </span>
      {arrow && (
        <svg
          aria-hidden="true"
          width="1"
          height="1"
          fill="none"
          stroke="#6f6c66"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
          className="pointer-events-none absolute top-0 left-0 hidden overflow-visible sm:block"
        >
          <g transform={`scale(${SCALE})`}>
            {arrow.map((d) => (
              <path key={d} d={d} vectorEffect="non-scaling-stroke" />
            ))}
          </g>
        </svg>
      )}
    </span>
  )
}
