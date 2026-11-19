"use client"

import { useRef } from "react"

import {
  follow,
  hash,
  prepareCanvas,
  smoothstep,
  useArtFrame,
  type Frame,
} from "@/components/empty-states/engine"
import type { ArtProps, EmptyStateType } from "@/components/empty-states/states"

/**
 * Field: a grid of short strokes that turn together, like a combed surface.
 *
 * Every stroke keeps its own angle and ink, and each frame eases both toward
 * what the current state's flow asks of that spot. So a state change is the
 * whole surface re-combing itself from one flow to the next, and the cursor
 * is just one more term in the flow: strokes near it swirl round it.
 */

const GAP = { sm: 10, lg: 13 }
const LENGTH = { sm: 5, lg: 7 }
const WEIGHT = { sm: 1.75, lg: 2.25 }

/** Ink is drawn in this many steps, one path per step, not one per stroke. */
const INK_STEPS = 12

const TAU = Math.PI * 2

type Target = { angle: number; ink: number }

/**
 * The flow for each state at one point. `u`/`v` are centred on the art and
 * scaled so the shorter side runs -1..1; `i`/`j` are the stroke's grid cell,
 * for anything that should be random but stable.
 */
function flow(
  state: EmptyStateType,
  u: number,
  v: number,
  t: number,
  i: number,
  j: number
): Target {
  const r = Math.hypot(u, v)
  const a = Math.atan2(v, u)

  switch (state) {
    // A seed: strokes point out from the middle, and a ring keeps leaving it.
    case "first-use": {
      const ring = ((t * 0.45) % 1) * 1.7
      const wave = Math.exp(-(((r - ring) * 4.5) ** 2))
      const core = 1 - smoothstep(0.08, 0.3, r)
      return { angle: a, ink: 0.12 + 0.7 * wave + 0.6 * core }
    }

    // A lens with nothing in it: rings round an empty centre, swept slowly.
    case "no-results": {
      const sweep = (((a - t * 1.3) % TAU) + TAU) % TAU
      const beam = Math.pow(1 - sweep / TAU, 5)
      const hollow = smoothstep(0.28, 0.42, r)
      return {
        angle: a + Math.PI / 2,
        ink: (0.14 + 0.75 * beam) * hollow,
      }
    }

    // Combed flat. The calmest the surface ever gets.
    case "cleared":
      return {
        angle: 0.05 * Math.sin(t * 0.5 + u * 1.5),
        ink: 0.22 + 0.12 * Math.sin(u * 1.4 - t * 0.7),
      }

    // A gate: upright bars in the middle, and the flow parting round them.
    case "no-access": {
      const inside = Math.abs(u) < 0.42 && Math.abs(v) < 0.55
      if (inside) {
        return { angle: Math.PI / 2, ink: i % 2 === 0 ? 0.85 : 0.35 }
      }
      const reach = Math.exp(-Math.max(0, Math.abs(u) - 0.42) * 4)
      const side = u < 0 ? -1 : 1
      return {
        angle: side * Math.sign(v) * 0.7 * reach,
        ink: 0.14 + 0.28 * (0.5 + 0.5 * Math.sin(Math.abs(u) * 7 + t * 2.4)),
      }
    }

    // A clean diagonal grain with a band that keeps tearing out of it.
    case "error": {
      const step = Math.floor(t * 2.2)
      const band = hash(step, 7) * 1.6 - 0.8
      const torn = Math.abs(v - band) < 0.2
      if (torn) {
        const gone = hash(i + step, j) < 0.25
        return {
          angle: hash(i, j + step) * Math.PI,
          ink: gone ? 0 : 0.9,
        }
      }
      return { angle: 0.8, ink: 0.22 }
    }

    // The shifting pattern itself: diagonal bands of ink travelling through
    // a grain that rolls with them.
    case "working": {
      const band = 0.5 + 0.5 * Math.sin(u * 3.2 - v * 2 - t * 2.4)
      return {
        angle: 0.85 + 0.55 * Math.sin(u * 2.2 + v * 1.4 - t * 1.6),
        ink: 0.16 + 0.8 * band * band,
      }
    }
  }
}

/** Shortest way round for a stroke: it looks the same turned by half a turn. */
function turnToward(from: number, to: number, amount: number) {
  let diff = (to - from) % Math.PI
  if (diff > Math.PI / 2) diff -= Math.PI
  if (diff < -Math.PI / 2) diff += Math.PI
  return from + diff * amount
}

export function FieldArt({ state, size = "lg" }: ArtProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const strokes = useRef<{
    cols: number
    rows: number
    angle: Float32Array
    ink: Float32Array
  } | null>(null)

  useArtFrame(
    canvasRef,
    (frame: Frame) => {
      const canvas = canvasRef.current
      if (!canvas) return
      const prepared = prepareCanvas(canvas, frame.width, frame.height)
      if (!prepared) return
      const { context, ink } = prepared

      const gap = GAP[size]
      const cols = Math.floor(frame.width / gap)
      const rows = Math.floor(frame.height / gap)
      let field = strokes.current
      let snap = frame.snap
      if (!field || field.cols !== cols || field.rows !== rows) {
        field = {
          cols,
          rows,
          angle: new Float32Array(cols * rows),
          ink: new Float32Array(cols * rows),
        }
        strokes.current = field
        snap = true
      }

      const turn = snap ? 1 : follow(frame, 5)
      const fade = snap ? 1 : follow(frame, 6)
      const originX = (frame.width - (cols - 1) * gap) / 2
      const originY = (frame.height - (rows - 1) * gap) / 2
      const unit = Math.min(frame.width, frame.height) / 2
      const { pointer } = frame
      const reach = gap * 3.6

      const paths = Array.from({ length: INK_STEPS }, () => new Path2D())
      const half = LENGTH[size] / 2

      for (let j = 0; j < rows; j++) {
        for (let i = 0; i < cols; i++) {
          const index = j * cols + i
          const x = originX + i * gap
          const y = originY + j * gap
          const u = (x - frame.width / 2) / unit
          const v = (y - frame.height / 2) / unit

          const target = flow(state, u, v, frame.t, i, j)
          let targetAngle = target.angle
          let targetInk = target.ink

          if (pointer.inside) {
            const dx = x - pointer.x
            const dy = y - pointer.y
            const pull = Math.exp(-(dx * dx + dy * dy) / (2 * reach * reach))
            targetAngle = turnToward(
              targetAngle,
              Math.atan2(dy, dx) + Math.PI / 2,
              pull * 0.9
            )
            targetInk += pull * 0.55
          }

          field.angle[index] = turnToward(field.angle[index], targetAngle, turn)
          field.ink[index] += (targetInk - field.ink[index]) * fade

          // An elliptical vignette, so the field has no hard edge.
          const ex = (x - frame.width / 2) / (frame.width / 2)
          const ey = (y - frame.height / 2) / (frame.height / 2)
          const edge = 1 - smoothstep(0.62, 1, Math.hypot(ex, ey))
          const value = Math.min(field.ink[index], 1) * edge
          if (value < 0.03) continue

          const step = Math.min(INK_STEPS - 1, Math.floor(value * INK_STEPS))
          const length = half * (0.65 + 0.5 * value)
          const cos = Math.cos(field.angle[index]) * length
          const sin = Math.sin(field.angle[index]) * length
          paths[step].moveTo(x - cos, y - sin)
          paths[step].lineTo(x + cos, y + sin)
        }
      }

      context.strokeStyle = ink
      context.lineCap = "round"
      context.lineWidth = WEIGHT[size]
      paths.forEach((path, step) => {
        context.globalAlpha = (step + 0.5) / INK_STEPS
        context.stroke(path)
      })
      context.globalAlpha = 1
    },
    state
  )

  return <canvas ref={canvasRef} className="absolute inset-0 size-full" />
}
