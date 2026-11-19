"use client"

import { useRef } from "react"

import {
  createMorph,
  follow,
  pointerInViewBox,
  stepMorph,
  type Morph,
  useArtFrame,
  type Frame,
} from "@/components/empty-states/engine"
import type { ArtProps, EmptyStateType } from "@/components/empty-states/states"

/**
 * Line: one sharp stroke, redrawn into each state.
 *
 * Every glyph is a polyline resampled to the same number of points by length,
 * so any glyph can become any other: point n of the old shape travels to
 * point n of the new one. Three echoes follow the stroke, each a step behind
 * the last. At rest they sit exactly underneath it and vanish; whenever the
 * line moves (a state change, the cursor tugging it) they fan out behind it
 * like the onion-skin of a frame-by-frame drawing.
 */

const WIDTH = 240
const HEIGHT = 120
const POINTS = 160
const ECHOES = [0.3, 0.16, 0.07]

type Point = [number, number]

/** The glyph for each state, as corner points. Sharp joins, no curves. */
function glyph(state: EmptyStateType, t: number): Point[] {
  switch (state) {
    // A plus, drawn as one stroke that doubles back on itself.
    case "first-use":
      return [
        [96, 60],
        [144, 60],
        [120, 60],
        [120, 36],
        [120, 84],
      ]

    // A lens with a handle. Octagonal, to keep every corner sharp.
    case "no-results": {
      const cx = 112
      const cy = 54
      const r = 22
      const lens: Point[] = []
      for (let k = 0; k <= 8; k++) {
        const angle = Math.PI / 4 + (k * Math.PI) / 4
        lens.push([cx + r * Math.cos(angle), cy + r * Math.sin(angle)])
      }
      return [[150, 92], ...lens]
    }

    // A check.
    case "cleared":
      return [
        [88, 62],
        [108, 82],
        [152, 38],
      ]

    // A padlock: shackle first, then the body, closing along its top edge.
    case "no-access":
      return [
        [104, 60],
        [104, 42],
        [110, 36],
        [130, 36],
        [136, 42],
        [136, 60],
        [146, 60],
        [146, 90],
        [94, 90],
        [94, 60],
        [136, 60],
      ]

    // A signal that breaks: flat, a burst of spikes, flat again. Every so
    // often the burst flinches.
    case "error": {
      const flinch = Math.pow(Math.max(0, Math.sin(t * 2.1)), 14)
      const k = 1 + 0.25 * flinch * Math.sin(t * 40)
      const y = (offset: number) => 60 + offset * k
      return [
        [72, 60],
        [100, 60],
        [106, y(-20)],
        [114, y(22)],
        [122, y(-30)],
        [130, y(14)],
        [136, y(-8)],
        [140, 60],
        [168, 60],
      ]
    }

    // The wave, made sharp: a zigzag travelling right, tapering to rest at
    // both ends.
    case "working": {
      const start = 64
      const span = 112
      const period = 16
      const phase = (t * 26) % period
      const points: Point[] = [[start, 60]]
      for (let x = start - period + phase; x < start + span; x += period / 2) {
        if (x <= start) continue
        const envelope = Math.sin((Math.PI * (x - start)) / span)
        const index = Math.round((x - start - phase) / (period / 2))
        const sign = index % 2 === 0 ? 1 : -1
        points.push([x, 60 + sign * 18 * envelope ** 1.4])
      }
      points.push([start + span, 60])
      return points
    }
  }
}

/**
 * Resample a polyline to exactly `count` points, keeping every corner.
 *
 * Points are shared out between segments by length, but each segment starts
 * on its own corner, so corners are always sampled exactly. Spacing them
 * evenly by length alone would slice through corners, and a travelling
 * zigzag would shimmer at every peak.
 */
function resample(points: Point[], count: number) {
  const segments = points.length - 1
  const lengths: number[] = []
  let total = 0
  for (let k = 0; k < segments; k++) {
    const [ax, ay] = points[k]
    const [bx, by] = points[k + 1]
    const length = Math.hypot(bx - ax, by - ay)
    lengths.push(length)
    total += length
  }

  // Every segment gets at least its starting corner, then the rest of the
  // budget goes out by length, largest remainders first.
  const budget = count - 1
  const shares = lengths.map((length) => (length / (total || 1)) * budget)
  const given = shares.map((share) => Math.max(1, Math.floor(share)))
  let left = budget - given.reduce((sum, n) => sum + n, 0)
  const order = shares
    .map((share, k) => ({ k, rest: share - Math.floor(share) }))
    .sort((a, b) => b.rest - a.rest)
  for (let n = 0; left > 0; n = (n + 1) % order.length, left--) {
    given[order[n].k]++
  }
  for (
    let n = order.length - 1;
    left < 0;
    n = (n - 1 + order.length) % order.length
  ) {
    const k = order[n].k
    if (given[k] > 1) {
      given[k]--
      left++
    }
  }

  const out = new Float32Array(count * 2)
  let index = 0
  for (let k = 0; k < segments; k++) {
    const [ax, ay] = points[k]
    const [bx, by] = points[k + 1]
    for (let n = 0; n < given[k]; n++) {
      const amount = n / given[k]
      out[index * 2] = ax + (bx - ax) * amount
      out[index * 2 + 1] = ay + (by - ay) * amount
      index++
    }
  }
  const [lx, ly] = points[segments]
  out[index * 2] = lx
  out[index * 2 + 1] = ly
  return out
}

function toPoints(values: Float32Array) {
  let out = ""
  for (let n = 0; n < values.length; n += 2) {
    out += `${values[n].toFixed(2)},${values[n + 1].toFixed(2)} `
  }
  return out
}

export function LineArt({ state, size = "lg" }: ArtProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const strokeRef = useRef<SVGPolylineElement>(null)
  const echoRefs = useRef<(SVGPolylineElement | null)[]>([])
  const live = useRef<{
    shape: Float32Array
    tug: Float32Array
    stroke: Float32Array
    echoes: Float32Array[]
    morph: Morph
  } | null>(null)

  useArtFrame(
    svgRef,
    (frame: Frame) => {
      const target = resample(glyph(state, frame.t), POINTS)

      if (!live.current) {
        live.current = {
          shape: new Float32Array(target),
          tug: new Float32Array(POINTS * 2),
          stroke: new Float32Array(target),
          echoes: ECHOES.map(() => new Float32Array(target)),
          morph: createMorph(POINTS * 2),
        }
      }
      const { shape, tug, stroke, echoes, morph } = live.current

      stepMorph(morph, frame, state, shape, target)

      // The cursor tugs the stroke toward itself, most where it is nearest.
      // Kept apart from the shape so it eases on its own and lets go cleanly.
      const pointer = pointerInViewBox(frame, WIDTH, HEIGHT)
      const give = follow(frame, 10)
      for (let n = 0; n < POINTS; n++) {
        let tx = 0
        let ty = 0
        if (pointer.inside) {
          const dx = pointer.x - shape[n * 2]
          const dy = pointer.y - shape[n * 2 + 1]
          const pull = 0.4 * Math.exp(-(dx * dx + dy * dy) / (2 * 18 * 18))
          tx = dx * pull
          ty = dy * pull
        }
        tug[n * 2] += (tx - tug[n * 2]) * give
        tug[n * 2 + 1] += (ty - tug[n * 2 + 1]) * give
      }
      for (let k = 0; k < stroke.length; k++) stroke[k] = shape[k] + tug[k]

      // Each echo chases the one in front of it, so the lag compounds.
      const chase = follow(frame, 12)
      echoes.forEach((echo, e) => {
        const leader = e === 0 ? stroke : echoes[e - 1]
        for (let k = 0; k < echo.length; k++) {
          echo[k] += (leader[k] - echo[k]) * chase
        }
        echoRefs.current[e]?.setAttribute("points", toPoints(echo))
      })
      strokeRef.current?.setAttribute("points", toPoints(stroke))
    },
    state
  )

  const weight = size === "sm" ? 2.75 : 2

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${WIDTH} ${HEIGHT}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 size-full overflow-visible"
      fill="none"
      stroke="currentColor"
      strokeWidth={weight}
      strokeLinejoin="miter"
      strokeMiterlimit={8}
      strokeLinecap="butt"
    >
      {ECHOES.map((opacity, e) => (
        <polyline
          key={e}
          ref={(node) => {
            echoRefs.current[e] = node
          }}
          strokeOpacity={opacity}
          strokeWidth={weight * 0.75}
        />
      ))}
      <polyline ref={strokeRef} />
    </svg>
  )
}
