"use client"

import { useRef } from "react"

import {
  follow,
  hash,
  prepareCanvas,
  useArtFrame,
  type Frame,
} from "@/components/empty-states/engine"
import {
  EMPTY_STATES,
  type ArtProps,
  type EmptyStateType,
} from "@/components/empty-states/states"
import { cn } from "@/lib/utils"

/**
 * Signal: the dot matrix and shimmering status line of an AI tool waiting on
 * a reply, used for every state.
 *
 * An 11 by 11 grid of dots, each with its own brightness easing toward what
 * the state's pattern asks of it. Glyphs are 7 by 7 bitmaps in the middle;
 * the waiting state is a turning spiral over the whole disc. The cursor is a
 * small torch: dots near it come up as it passes.
 */

const GRID = 11
const HALF = (GRID - 1) / 2
const LEVELS = 10

/** 7x7 glyphs, centred on the grid. `#` is lit. */
const GLYPHS: Partial<Record<EmptyStateType, string[]>> = {
  "first-use": [
    "...#...",
    "...#...",
    "...#...",
    "#######",
    "...#...",
    "...#...",
    "...#...",
  ],
  cleared: [
    ".......",
    "......#",
    ".....#.",
    "#...#..",
    ".#.#...",
    "..#....",
    ".......",
  ],
  "no-access": [
    "..###..",
    ".#...#.",
    ".#...#.",
    "#######",
    "###.###",
    "###.###",
    "#######",
  ],
  error: [
    "...#...",
    "...#...",
    "...#...",
    "...#...",
    "...#...",
    ".......",
    "...#...",
  ],
}

function lit(state: EmptyStateType, x: number, y: number) {
  const rows = GLYPHS[state]
  if (!rows) return false
  const row = rows[y + 3]
  return row !== undefined && row[x + 3] === "#"
}

/** Brightness 0..1 for the dot at grid offset (x, y) from the centre. */
function pattern(state: EmptyStateType, x: number, y: number, t: number) {
  const r = Math.hypot(x, y)
  const BACKGROUND = 0.06

  switch (state) {
    // The plus, with a ripple running out along its arms.
    case "first-use": {
      if (!lit(state, x, y)) return BACKGROUND
      return 0.35 + 0.65 * (0.5 + 0.5 * Math.cos(r * 1.3 - t * 4))
    }

    // An empty ring, swept by a beam that keeps finding nothing.
    case "no-results": {
      if (Math.abs(r - 3.6) > 0.6) return BACKGROUND
      const angle = Math.atan2(y, x)
      const sweep =
        (((angle - t * 2.6) % (Math.PI * 2)) + Math.PI * 2) % (Math.PI * 2)
      return 0.18 + 0.82 * Math.pow(1 - sweep / (Math.PI * 2), 3)
    }

    // The check, with a sheen crossing the whole grid now and then.
    case "cleared": {
      const sweep = ((t * 0.45) % 1) * 22 - 11
      const sheen = Math.exp(-(((x + y) * 0.7 - sweep) ** 2) / 2)
      return lit(state, x, y) ? 0.6 + 0.4 * sheen : BACKGROUND + 0.14 * sheen
    }

    // The lock, breathing slowly.
    case "no-access":
      return lit(state, x, y) ? 0.72 + 0.16 * Math.sin(t * 1.6) : BACKGROUND
    // The bang, which drops out in bursts like a weak signal.
    case "error": {
      const burst = Math.pow(Math.max(0, Math.sin(t * 1.9)), 8)
      const step = Math.floor(t * 12)
      if (lit(state, x, y)) {
        return hash(x * 13 + y, step) < 0.4 * burst ? 0.1 : 0.9
      }
      return BACKGROUND + (hash(x + step, y) < 0.08 * burst ? 0.4 : 0)
    }

    // Two spiral arms turning over the disc, the shape of waiting.
    case "working": {
      if (r > HALF + 0.3) return BACKGROUND * 0.5
      const angle = Math.atan2(y, x)
      const phase = (angle / (Math.PI * 2)) * 2 + r * 0.16 - t * 0.9
      const arm = phase - Math.floor(phase)
      return 0.08 + 0.92 * Math.pow(arm, 5)
    }
  }
}

export function SignalArt({ state, size = "lg" }: ArtProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const dots = useRef<Float32Array | null>(null)

  useArtFrame(
    canvasRef,
    (frame: Frame) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const prepared = prepareCanvas(canvas, frame.width, frame.height)
      if (!prepared) return
      const { context, ink } = prepared

      if (!dots.current) dots.current = new Float32Array(GRID * GRID)
      const brightness = dots.current
      const fade = follow(frame, 10)

      const pitch = Math.min(
        size === "sm" ? 7 : 10,
        (Math.min(frame.width, frame.height) * 0.92) / GRID
      )
      const originX = frame.width / 2 - HALF * pitch
      const originY = frame.height / 2 - HALF * pitch
      const torch = pitch * 1.8
      const paths = Array.from({ length: LEVELS }, () => new Path2D())

      for (let j = 0; j < GRID; j++) {
        for (let i = 0; i < GRID; i++) {
          const index = j * GRID + i
          const px = originX + i * pitch
          const py = originY + j * pitch
          let target = pattern(state, i - HALF, j - HALF, frame.t)

          if (frame.pointer.inside) {
            const dx = px - frame.pointer.x
            const dy = py - frame.pointer.y
            target += 0.6 * Math.exp(-(dx * dx + dy * dy) / (2 * torch * torch))
          }

          brightness[index] += (target - brightness[index]) * fade
          const value = Math.min(Math.max(brightness[index], 0), 1)
          const level = Math.min(LEVELS - 1, Math.floor(value * LEVELS))
          const radius = pitch * (0.14 + 0.16 * value)
          paths[level].moveTo(px + radius, py)
          paths[level].arc(px, py, radius, 0, Math.PI * 2)
        }
      }

      context.fillStyle = ink
      paths.forEach((path, level) => {
        context.globalAlpha = 0.1 + 0.9 * ((level + 0.5) / LEVELS)
        context.fill(path)
      })
      context.globalAlpha = 1
    },
    state
  )

  return (
    <div className="absolute inset-0 flex flex-col items-center justify-center gap-2">
      <div className="relative w-full flex-1">
        <canvas ref={canvasRef} className="absolute inset-0 size-full" />
      </div>
      {/* The status line, shimmering only while there is something to wait
          for. Keyed, so a new state's words arrive rather than swap. */}
      <span
        key={state}
        className={cn(
          "es-swap shrink-0 font-medium whitespace-nowrap text-muted-foreground",
          size === "sm" ? "text-[11px] leading-4" : "text-xs leading-5",
          state === "working" && "es-shimmer"
        )}
      >
        {EMPTY_STATES[state].status}
      </span>
    </div>
  )
}
