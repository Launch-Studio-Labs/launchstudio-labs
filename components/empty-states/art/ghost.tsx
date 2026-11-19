"use client"

import { useRef, type CSSProperties } from "react"
import { CheckIcon, LockSimpleIcon, PlusIcon } from "@phosphor-icons/react"

import {
  follow,
  lerp,
  useArtFrame,
  type Frame,
} from "@/components/empty-states/engine"
import type { ArtProps, EmptyStateType } from "@/components/empty-states/states"
import { cn } from "@/lib/utils"

/**
 * Ghost: the rows that would be here, drawn as skeletons and rearranged to
 * say why they aren't.
 *
 * It is the most literal of the five and the closest to shipping as-is: the
 * ghost rows tell a reader what kind of thing will fill the space. Three rows
 * move between per-state arrangements on CSS transitions, so a change of
 * state is interruptible and staggered for free. The stack is held in light
 * perspective and turns toward the cursor.
 */

type RowLook = {
  y: number
  x?: number
  rotate?: number
  scale?: number
  opacity: number
  blur?: number
}

/** Each state's arrangement of the three rows, top row first. */
const LAYOUT: Record<EmptyStateType, [RowLook, RowLook, RowLook]> = {
  // The first row is an open slot waiting to be filled.
  "first-use": [
    { y: -42, opacity: 1 },
    { y: 0, opacity: 0.45 },
    { y: 42, opacity: 0.2 },
  ],
  // Rows dimmed while a scan line passes through them, finding nothing.
  "no-results": [
    { y: -42, opacity: 0.5 },
    { y: 0, opacity: 0.35 },
    { y: 42, opacity: 0.2 },
  ],
  // Done and squared away into a neat pile, a check on top.
  cleared: [
    { y: -6, opacity: 1 },
    { y: 2, scale: 0.92, opacity: 0.5 },
    { y: 10, scale: 0.84, opacity: 0.22 },
  ],
  // There, but out of focus, behind a lock.
  "no-access": [
    { y: -42, opacity: 0.65, blur: 3 },
    { y: 0, opacity: 0.45, blur: 3 },
    { y: 42, opacity: 0.25, blur: 3 },
  ],
  // Knocked out of line.
  error: [
    { y: -40, x: -12, rotate: -3, opacity: 0.85 },
    { y: 2, x: 10, rotate: 2.5, opacity: 0.55 },
    { y: 44, x: -5, rotate: -1.5, opacity: 0.3 },
  ],
  // The classic loading skeleton: a sheen running down the rows.
  working: [
    { y: -42, opacity: 0.9 },
    { y: 0, opacity: 0.7 },
    { y: 42, opacity: 0.5 },
  ],
}

function rowStyle(look: RowLook, index: number): CSSProperties {
  return {
    transform: `translate(-50%, -50%) translate(${look.x ?? 0}px, ${look.y}px) rotate(${look.rotate ?? 0}deg) scale(${look.scale ?? 1})`,
    opacity: look.opacity,
    filter: `blur(${look.blur ?? 0}px)`,
    zIndex: 3 - index,
    // Top row leads; the others follow close behind.
    transitionDelay: `${[0, 45, 80][index]}ms`,
  }
}

function Row({
  state,
  index,
  look,
}: {
  state: EmptyStateType
  index: number
  look: RowLook
}) {
  const slot = index === 0 && state === "first-use"
  const done = index === 0 && state === "cleared"

  return (
    <div
      style={rowStyle(look, index)}
      className={cn(
        "absolute top-1/2 left-1/2 flex h-[34px] w-[184px] items-center gap-2.5 overflow-hidden rounded-lg border bg-background px-2.5",
        "transition-[transform,opacity,filter,border-color] duration-500 ease-morph motion-reduce:transition-opacity",
        slot ? "border-dashed border-foreground/30" : "border-foreground/10"
      )}
    >
      <span
        className={cn(
          "relative flex size-[18px] shrink-0 items-center justify-center rounded-[5px] transition-[background-color,opacity] duration-300",
          done ? "bg-foreground" : "bg-foreground/10",
          slot && "opacity-0"
        )}
      >
        <CheckIcon
          weight="bold"
          className={cn(
            "size-3 text-background transition-[opacity,scale] duration-300 ease-settle",
            done ? "scale-100 opacity-100" : "scale-90 opacity-0"
          )}
        />
      </span>
      <span
        className={cn(
          "flex flex-1 flex-col gap-1.5 transition-opacity duration-300",
          slot && "opacity-0"
        )}
      >
        <span className="h-1.5 w-[64%] rounded-full bg-foreground/12" />
        <span className="h-1.5 w-[38%] rounded-full bg-foreground/8" />
      </span>

      {/* An open slot's plus. */}
      <PlusIcon
        weight="bold"
        className={cn(
          "absolute top-1/2 left-1/2 size-3.5 -translate-1/2 text-foreground/60 transition-[opacity,scale] duration-300 ease-settle",
          slot ? "es-pulse scale-100 opacity-100" : "scale-90 opacity-0"
        )}
      />

      {/* The loading sheen, set off a beat later on each row. */}
      <span
        aria-hidden
        style={{ animationDelay: `${index * 140}ms` }}
        className={cn(
          "es-sweep pointer-events-none absolute inset-y-0 -left-1/2 w-1/2 bg-linear-to-r from-transparent via-foreground/8 to-transparent transition-opacity duration-300",
          state === "working" ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  )
}

export function GhostArt({ state, size = "lg" }: ArtProps) {
  const rootRef = useRef<HTMLDivElement>(null)
  const stackRef = useRef<HTMLDivElement>(null)
  const tilt = useRef({ x: 0, y: 0 })

  // The stack is the only thing driven per frame: a slow sway at rest, and
  // a turn toward the cursor. Rows themselves move on CSS transitions.
  useArtFrame(
    rootRef,
    (frame: Frame) => {
      const { pointer } = frame
      const nx = pointer.inside ? pointer.x / frame.width - 0.5 : 0
      const ny = pointer.inside ? pointer.y / frame.height - 0.5 : 0
      const targetX = 14 - ny * 18
      const targetY = pointer.inside ? nx * 22 : Math.sin(frame.t * 0.5) * 6
      const ease = follow(frame, 6)
      tilt.current.x = lerp(tilt.current.x, targetX, ease)
      tilt.current.y = lerp(tilt.current.y, targetY, ease)
      if (stackRef.current) {
        stackRef.current.style.transform = `scale(${size === "sm" ? 0.62 : 1}) rotateX(${tilt.current.x.toFixed(2)}deg) rotateY(${tilt.current.y.toFixed(2)}deg)`
      }
    },
    state
  )

  const layout = LAYOUT[state]

  return (
    <div ref={rootRef} className="absolute inset-0 [perspective:700px]">
      <div
        ref={stackRef}
        className="absolute inset-0 [transform-style:preserve-3d]"
      >
        <div className={cn("absolute inset-0", state === "error" && "es-jolt")}>
          {layout.map((look, index) => (
            <Row key={index} state={state} index={index} look={look} />
          ))}
        </div>

        {/* The scan line that finds nothing. */}
        <span
          aria-hidden
          className={cn(
            "pointer-events-none absolute top-1/2 left-1/2 z-10 h-px w-[212px] -translate-x-1/2 transition-opacity duration-300",
            state === "no-results" ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="es-scan absolute inset-0 bg-linear-to-r from-transparent via-foreground/50 to-transparent" />
        </span>

        {/* The lock over the blurred rows. */}
        <span
          aria-hidden
          className={cn(
            "absolute top-1/2 left-1/2 z-10 flex size-9 -translate-1/2 items-center justify-center rounded-full bg-foreground text-background shadow-sm transition-[opacity,scale] duration-300 ease-settle",
            state === "no-access"
              ? "scale-100 opacity-100"
              : "scale-90 opacity-0"
          )}
        >
          <LockSimpleIcon weight="bold" className="size-4" />
        </span>
      </div>
    </div>
  )
}
