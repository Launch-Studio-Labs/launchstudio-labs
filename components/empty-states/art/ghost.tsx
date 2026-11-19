"use client"

import { useRef } from "react"
import { CheckIcon, LockSimpleIcon, PlusIcon } from "@phosphor-icons/react"

import {
  follow,
  hash,
  lerp,
  useArtFrame,
  type Frame,
} from "@/components/empty-states/engine"
import type { ArtProps, EmptyStateType } from "@/components/empty-states/states"
import {
  useStyleTuning,
  type StyleTuning,
} from "@/components/empty-states/tuning"
import { cn } from "@/lib/utils"

/**
 * Ghost: the rows that would be here, drawn as skeletons and rearranged to
 * say why they aren't.
 *
 * It is the most literal of the four and the closest to shipping as-is: the
 * ghost rows tell a reader what kind of thing will fill the space. The rows
 * (three by default) move between per-state arrangements on CSS transitions, so a change of
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

/** Knocked-out-of-line offsets for the error state, reused down the stack. */
const JOLT_X = [-12, 10, -5, 8, -9, 6]
const JOLT_ROTATE = [-3, 2.5, -1.5, 2, -2.5, 1]

/**
 * Each state's arrangement, for row `i` of `n` rows spaced `pitch` apart.
 * Written as rules rather than fixed positions so the stack holds its shape
 * at any row count.
 */
function layout(
  state: EmptyStateType,
  i: number,
  n: number,
  pitch: number
): RowLook {
  const y = (i - (n - 1) / 2) * pitch
  // 0 for the top row, 1 for the bottom.
  const depth = n > 1 ? i / (n - 1) : 0
  // The same, but over the rows after the first.
  const rest = n > 2 ? (i - 1) / (n - 2) : 0

  switch (state) {
    // The first row is an open slot waiting to be filled.
    case "first-use":
      return { y, opacity: i === 0 ? 1 : lerp(0.45, 0.2, rest) }
    // Rows dimmed while a scan line passes through them, finding nothing.
    case "no-results":
      return { y, opacity: lerp(0.5, 0.2, depth) }
    // Done and squared away into a neat pile, a check on top.
    case "cleared":
      return {
        y: -6 + i * 8,
        scale: 1 - i * 0.08,
        opacity: i === 0 ? 1 : lerp(0.5, 0.22, rest),
      }
    // There, but out of focus, behind a lock.
    case "no-access":
      return { y, opacity: lerp(0.65, 0.25, depth), blur: 3 }
    // Knocked out of line.
    case "error":
      return {
        y: y + 2,
        x: JOLT_X[i % JOLT_X.length],
        rotate: JOLT_ROTATE[i % JOLT_ROTATE.length],
        opacity: lerp(0.85, 0.3, depth),
      }
    // The classic loading skeleton: a sheen running down the rows.
    case "working":
      return { y, opacity: lerp(0.9, 0.5, depth) }
  }
}

function Row({
  state,
  index,
  look,
  tuning,
}: {
  state: EmptyStateType
  index: number
  look: RowLook
  tuning: StyleTuning<"ghost">
}) {
  const slot = index === 0 && state === "first-use"
  const done = index === 0 && state === "cleared"
  const avatar = Math.round(tuning.rowHeight * 0.53)
  const spread = tuning.barSpread

  return (
    <div
      style={{
        width: tuning.rowWidth,
        height: tuning.rowHeight,
        borderRadius: tuning.radius,
        transform: `translate(-50%, -50%) translate(${look.x ?? 0}px, ${look.y}px) rotate(${look.rotate ?? 0}deg) scale(${look.scale ?? 1})`,
        opacity: look.opacity * tuning.opacity,
        filter: `blur(${look.blur ?? 0}px)`,
        zIndex: 10 - index,
        transitionDuration: `${tuning.morph}ms`,
        // Top row leads; the others follow close behind.
        transitionDelay: `${Math.round(index * 45 - index * index * 5)}ms`,
      }}
      className={cn(
        "absolute top-1/2 left-1/2 flex items-center gap-2.5 overflow-hidden border bg-background px-2.5",
        "transition-[transform,opacity,filter,border-color] ease-morph motion-reduce:transition-opacity",
        slot ? "border-dashed border-foreground/30" : "border-foreground/10"
      )}
    >
      <span
        style={{
          width: avatar,
          height: avatar,
          borderRadius: tuning.avatarRadius,
        }}
        className={cn(
          "relative flex shrink-0 items-center justify-center transition-[background-color,opacity] duration-300",
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
        <span
          style={{ width: `${64 + spread * (hash(index, 1) - 0.5) * 60}%` }}
          className="h-1.5 rounded-full bg-foreground/12"
        />
        <span
          style={{ width: `${38 + spread * (hash(index, 2) - 0.5) * 50}%` }}
          className="h-1.5 rounded-full bg-foreground/8"
        />
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
        style={{
          animationDelay: `${index * 140}ms`,
          animationDuration: `${tuning.shimmer}s`,
        }}
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
  const tuning = useStyleTuning("ghost")

  // The stack is the only thing driven per frame: a slow sway at rest, and
  // a turn toward the cursor. Rows themselves move on CSS transitions.
  useArtFrame(rootRef, (frame: Frame) => {
    const { pointer } = frame
    const held = tuning.cursor && pointer.inside
    const nx = held ? pointer.x / frame.width - 0.5 : 0
    const ny = held ? pointer.y / frame.height - 0.5 : 0
    const targetX = tuning.lean - ny * 18 * tuning.hoverTilt
    const targetY = held
      ? nx * 22 * tuning.hoverTilt
      : Math.sin(frame.t * 0.5) * tuning.sway
    const ease = follow(frame, 6)
    tilt.current.x = lerp(tilt.current.x, targetX, ease)
    tilt.current.y = lerp(tilt.current.y, targetY, ease)
    if (stackRef.current) {
      stackRef.current.style.transform = `scale(${size === "sm" ? 0.62 : 1}) rotateX(${tilt.current.x.toFixed(2)}deg) rotateY(${tilt.current.y.toFixed(2)}deg)`
    }
  })

  const rows = Math.max(1, Math.round(tuning.rows))
  const pitch = tuning.rowHeight + tuning.rowGap
  // The scan line travels the height of the stack.
  const scan = (rows * pitch) / 2

  return (
    <div
      ref={rootRef}
      style={{ perspective: tuning.perspective }}
      className="absolute inset-0"
    >
      <div
        ref={stackRef}
        className="absolute inset-0 [transform-style:preserve-3d]"
      >
        <div className={cn("absolute inset-0", state === "error" && "es-jolt")}>
          {Array.from({ length: rows }, (_, index) => (
            <Row
              key={index}
              state={state}
              index={index}
              look={layout(state, index, rows, pitch)}
              tuning={tuning}
            />
          ))}
        </div>

        {/* The scan line that finds nothing. */}
        <span
          aria-hidden
          style={{
            width: tuning.rowWidth + 28,
            ["--es-scan" as string]: `${scan}px`,
          }}
          className={cn(
            "pointer-events-none absolute top-1/2 left-1/2 z-20 h-px -translate-x-1/2 transition-opacity duration-300",
            state === "no-results" ? "opacity-100" : "opacity-0"
          )}
        >
          <span className="es-scan absolute inset-0 bg-linear-to-r from-transparent via-foreground/50 to-transparent" />
        </span>

        {/* The lock over the blurred rows. */}
        <span
          aria-hidden
          className={cn(
            "absolute top-1/2 left-1/2 z-20 flex size-9 -translate-1/2 items-center justify-center rounded-full bg-foreground text-background shadow-sm transition-[opacity,scale] duration-300 ease-settle",
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
