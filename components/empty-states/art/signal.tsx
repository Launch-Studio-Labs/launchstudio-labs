"use client"

import { useRef } from "react"

import {
  follow,
  hash,
  prepareCanvas,
  useArtFrame,
  type Frame,
} from "@/components/empty-states/engine"
import type { ArtProps, EmptyStateType } from "@/components/empty-states/states"
import { useStyleTuning } from "@/components/empty-states/tuning"

/**
 * Signal: the dot matrix of an AI tool waiting on a reply, used for every
 * state.
 *
 * A square grid of dots (11 a side by default), each with its own brightness easing toward what
 * the state's pattern asks of it. Glyphs are 7 by 7 bitmaps in the middle;
 * the waiting state is a turning spiral over the whole disc. The cursor is a
 * small torch: dots near it come up as it passes.
 */

const LEVELS = 10

/** Matrix tiles draw a smaller pitch. */
const SMALL = 0.7

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

/**
 * Brightness 0..1 for the dot at grid offset (x, y) from the centre. `half`
 * is the grid's reach from centre to edge; `floor` is an unlit cell.
 */
function pattern(
  state: EmptyStateType,
  x: number,
  y: number,
  t: number,
  half: number,
  BACKGROUND: number
) {
  const r = Math.hypot(x, y)

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
      if (r > half + 0.3) return BACKGROUND * 0.5
      const angle = Math.atan2(y, x)
      const phase = (angle / (Math.PI * 2)) * 2 + r * 0.16 - t * 0.9
      const arm = phase - Math.floor(phase)
      return 0.08 + 0.92 * Math.pow(arm, 5)
    }
  }
}

export function SignalArt({ state, size = "lg" }: ArtProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const tuning = useStyleTuning("signal")
  const dots = useRef<Float32Array | null>(null)

  useArtFrame(canvasRef, (frame: Frame) => {
    const canvas = canvasRef.current
    if (!canvas) return
    const prepared = prepareCanvas(canvas, frame.width, frame.height)
    if (!prepared) return
    const { context, ink } = prepared

    // Odd, so there is a centre cell for the glyphs to sit on.
    const grid = Math.max(9, Math.round(tuning.grid) | 1)
    const half = (grid - 1) / 2
    if (!dots.current || dots.current.length !== grid * grid) {
      dots.current = new Float32Array(grid * grid)
    }
    const brightness = dots.current
    const fade = follow(frame, tuning.fade)
    const t = frame.t * tuning.tempo

    const pitch = Math.min(
      tuning.pitch * (size === "sm" ? SMALL : 1),
      (Math.min(frame.width, frame.height) * 0.92) / grid
    )
    const originX = frame.width / 2 - half * pitch
    const originY = frame.height / 2 - half * pitch
    const torch = pitch * tuning.torch
    const paths = Array.from({ length: LEVELS }, () => new Path2D())

    for (let j = 0; j < grid; j++) {
      for (let i = 0; i < grid; i++) {
        const index = j * grid + i
        const px = originX + i * pitch
        const py = originY + j * pitch
        let target = pattern(state, i - half, j - half, t, half, tuning.floor)

        if (tuning.cursor && frame.pointer.inside) {
          const dx = px - frame.pointer.x
          const dy = py - frame.pointer.y
          target +=
            tuning.torchInk *
            Math.exp(-(dx * dx + dy * dy) / (2 * torch * torch))
        }

        brightness[index] += (target - brightness[index]) * fade
        const value = Math.min(Math.max(brightness[index], 0), 1)
        const level = Math.min(LEVELS - 1, Math.floor(value * LEVELS))
        const radius = pitch * (tuning.size + tuning.grow * value)
        const path = paths[level]
        if (tuning.cell === "square") {
          path.roundRect(
            px - radius,
            py - radius,
            radius * 2,
            radius * 2,
            radius * tuning.corner
          )
        } else {
          path.moveTo(px + radius, py)
          path.arc(px, py, radius, 0, Math.PI * 2)
        }
      }
    }

    context.fillStyle = ink
    paths.forEach((path, level) => {
      context.globalAlpha =
        tuning.minAlpha + (1 - tuning.minAlpha) * ((level + 0.5) / LEVELS)
      context.fill(path)
    })
    context.globalAlpha = 1
  })

  return <canvas ref={canvasRef} className="absolute inset-0 size-full" />
}
