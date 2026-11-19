"use client"

import { useRef } from "react"

import {
  createMorph,
  follow,
  lerp,
  pointerInViewBox,
  stepMorph,
  type Morph,
  useArtFrame,
  type Frame,
} from "@/components/empty-states/engine"
import type { ArtProps, EmptyStateType } from "@/components/empty-states/states"

/**
 * Fold: one sheet of paper, eight flat facets, refolded into each state's
 * object.
 *
 * Every state is the same eight triangles. A state that needs fewer folds the
 * spare ones flat into a single point, so a change of state is the paper
 * visibly refolding, never a crossfade. Each facet faces a direction, and its
 * shade comes from how squarely it faces the light: the light orbits slowly
 * on its own and follows the cursor when there is one, so the creases catch
 * as you move.
 */

const VIEW = 120
const FACETS = 8
const CENTER = 60

/** Offsets into the live array: points, then tones, then facing vectors. */
const TONE = FACETS * 6
const FACE_X = TONE + FACETS
const FACE_Y = FACE_X + FACETS
const VALUES = FACE_Y + FACETS

type Facet = {
  points: [number, number, number, number, number, number]
  /** Ink at rest, 0 (paper white) to 1 (full ink). */
  tone: number
  /** Which way the facet faces, in radians, for lighting. */
  facing: number
}

type Shape = { facets: Facet[]; float: number }

const UP = -Math.PI / 2
const DOWN = Math.PI / 2
const LEFT = Math.PI
const RIGHT = 0

function facet(points: Facet["points"], tone: number, facing: number): Facet {
  return { points, tone, facing }
}

/** A facet folded away into one point. */
function flat(x: number, y: number): Facet {
  return facet([x, y, x, y, x, y], 0, 0)
}

function rotate(x: number, y: number, angle: number): [number, number] {
  const cos = Math.cos(angle)
  const sin = Math.sin(angle)
  return [CENTER + x * cos - y * sin, CENTER + x * sin + y * cos]
}

/**
 * The shapes. Coordinates are on a 120 grid; each state's comment says what
 * the paper has become.
 */
function shapeFor(state: EmptyStateType, t: number): Shape {
  switch (state) {
    // A blank page with its corner turned down: somewhere to start.
    case "first-use":
      return {
        float: 0,
        facets: [
          facet([32, 28, 60, 28, 32, 92], 0.1, LEFT + 0.6),
          facet([60, 28, 60, 92, 32, 92], 0.12, LEFT + 0.6),
          facet([60, 28, 88, 28, 88, 76], 0.2, RIGHT - 0.4),
          facet([60, 28, 88, 76, 72, 92], 0.2, RIGHT - 0.4),
          facet([60, 28, 72, 92, 60, 92], 0.2, RIGHT - 0.4),
          facet([88, 76, 72, 92, 72, 76], 0.62, LEFT - 0.8),
          flat(72, 76),
          flat(72, 76),
        ],
      }

    // An open box with nothing in it.
    case "no-results":
      return {
        float: 0,
        facets: [
          facet([28, 50, 60, 66, 60, 92], 0.32, LEFT - 0.5),
          facet([28, 50, 60, 92, 28, 76], 0.32, LEFT - 0.5),
          facet([60, 66, 92, 50, 92, 76], 0.5, RIGHT + 0.5),
          facet([60, 66, 92, 76, 60, 92], 0.5, RIGHT + 0.5),
          facet([28, 50, 60, 34, 60, 60], 0.44, RIGHT + 0.3),
          facet([60, 34, 92, 50, 60, 60], 0.28, LEFT - 0.3),
          facet([28, 50, 60, 60, 60, 66], 0.12, UP),
          facet([60, 60, 92, 50, 60, 66], 0.12, UP),
        ],
      }

    // A paper plane: sent, nothing left to do.
    case "cleared":
      return {
        float: 2.5,
        facets: [
          facet([98, 30, 22, 58, 54, 62], 0.1, UP),
          facet([98, 30, 54, 62, 58, 74], 0.55, DOWN + 0.4),
          facet([98, 30, 58, 74, 62, 94], 0.26, RIGHT + 0.8),
          facet([54, 62, 58, 74, 44, 76], 0.7, DOWN),
          flat(98, 30),
          flat(98, 30),
          flat(98, 30),
          flat(98, 30),
        ],
      }

    // A sealed envelope.
    case "no-access":
      return {
        float: 0,
        facets: [
          facet([26, 38, 60, 64, 26, 86], 0.24, LEFT),
          facet([94, 38, 94, 86, 60, 64], 0.24, RIGHT),
          facet([26, 86, 94, 86, 60, 60], 0.32, DOWN),
          facet([26, 38, 94, 38, 60, 68], 0.12, UP),
          facet([53, 68, 60, 61, 67, 68], 0.82, UP),
          facet([53, 68, 67, 68, 60, 75], 0.94, DOWN),
          flat(60, 68),
          flat(60, 68),
        ],
      }

    // A sheet torn in two, the halves easing apart and back.
    case "error": {
      const gap = 2 + 2.5 * Math.sin(t * 1.4)
      const lx = -gap / 2
      const rx = gap / 2
      const L = (x: number) => x + lx
      const R = (x: number) => x + rx
      return {
        float: 0,
        facets: [
          facet([L(30), 30, L(56), 30, L(50), 52], 0.12, UP + 0.4),
          facet([L(30), 30, L(50), 52, L(58), 70], 0.22, LEFT),
          facet([L(30), 30, L(58), 70, L(52), 92], 0.14, LEFT + 0.6),
          facet([L(30), 30, L(52), 92, L(30), 92], 0.26, DOWN),
          facet([R(92), 22, R(94), 84, R(60), 88], 0.2, RIGHT),
          facet([R(92), 22, R(60), 88, R(66), 66], 0.32, DOWN + 0.5),
          facet([R(92), 22, R(66), 66, R(58), 48], 0.14, UP),
          facet([R(92), 22, R(58), 48, R(64), 26], 0.24, RIGHT - 0.7),
        ],
      }
    }

    // A pinwheel, turning while it waits.
    case "working": {
      const spin = t * 1.1
      const facets: Facet[] = []
      for (let blade = 0; blade < 4; blade++) {
        const angle = spin + (blade * Math.PI) / 2
        const [ax, ay] = rotate(0, -36, angle)
        const [bx, by] = rotate(34, -34, angle)
        const [cx, cy] = rotate(14, -5, angle)
        facets.push(
          facet([CENTER, CENTER, ax, ay, bx, by], 0.12, angle + UP),
          facet([CENTER, CENTER, bx, by, cx, cy], 0.6, angle + RIGHT)
        )
      }
      return { float: 0, facets }
    }
  }
}

function polygonPoints(points: ArrayLike<number>, offset: number) {
  return `${points[offset].toFixed(2)},${points[offset + 1].toFixed(2)} ${points[offset + 2].toFixed(2)},${points[offset + 3].toFixed(2)} ${points[offset + 4].toFixed(2)},${points[offset + 5].toFixed(2)}`
}

/**
 * Lighter the more squarely a facet faces the light. Facings are kept as
 * vectors, so a facet turning past a full revolution (the pinwheel) eases the
 * short way instead of spinning back through every angle.
 */
function shade(
  tone: number,
  faceX: number,
  faceY: number,
  light: number,
  strength: number
) {
  const lit = faceX * Math.cos(light) + faceY * Math.sin(light)
  return Math.min(Math.max(tone - 0.18 * strength * lit, 0.035), 0.96)
}

export function FoldArt({ state }: ArtProps) {
  const svgRef = useRef<SVGSVGElement>(null)
  const groupRef = useRef<SVGGElement>(null)
  const facetRefs = useRef<(SVGPolygonElement | null)[]>([])

  // Everything that folds lives in one array, so one morph moves it all:
  // six coordinates per facet, then each facet's tone and facing vector.
  const live = useRef<{
    values: Float32Array
    target: Float32Array
    morph: Morph
    float: number
    light: number
    strength: number
    tiltX: number
    tiltY: number
  } | null>(null)

  useArtFrame(
    svgRef,
    (frame: Frame) => {
      const shape = shapeFor(state, frame.t)
      if (!live.current) {
        live.current = {
          values: new Float32Array(VALUES),
          target: new Float32Array(VALUES),
          morph: createMorph(VALUES),
          float: 0,
          light: 0,
          strength: 0.6,
          tiltX: 0,
          tiltY: 0,
        }
      }
      const s = live.current
      const settle = follow(frame, 5)

      shape.facets.forEach((next, f) => {
        s.target.set(next.points, f * 6)
        s.target[TONE + f] = next.tone
        s.target[FACE_X + f] = Math.cos(next.facing)
        s.target[FACE_Y + f] = Math.sin(next.facing)
      })
      stepMorph(s.morph, frame, state, s.values, s.target)

      const pointer = pointerInViewBox(frame, VIEW, VIEW)
      const lightTarget = pointer.inside
        ? Math.atan2(pointer.y - CENTER, pointer.x - CENTER)
        : frame.t * 0.5
      // Ease the light round the short way.
      let turn = (lightTarget - s.light) % (Math.PI * 2)
      if (turn > Math.PI) turn -= Math.PI * 2
      if (turn < -Math.PI) turn += Math.PI * 2
      s.light += turn * settle
      s.strength = lerp(s.strength, pointer.inside ? 1 : 0.6, settle)
      s.float = lerp(s.float, shape.float, settle)

      for (let f = 0; f < FACETS; f++) {
        const polygon = facetRefs.current[f]
        if (!polygon) continue
        polygon.setAttribute("points", polygonPoints(s.values, f * 6))
        polygon.setAttribute(
          "fill-opacity",
          shade(
            s.values[TONE + f],
            s.values[FACE_X + f],
            s.values[FACE_Y + f],
            s.light,
            s.strength
          ).toFixed(3)
        )
      }

      // A small tilt toward the cursor, as if the paper were held.
      const tiltX = pointer.inside ? ((pointer.y - CENTER) / CENTER) * -10 : 0
      const tiltY = pointer.inside ? ((pointer.x - CENTER) / CENTER) * 12 : 0
      s.tiltX = lerp(s.tiltX, tiltX, settle)
      s.tiltY = lerp(s.tiltY, tiltY, settle)
      const bob = Math.sin(frame.t * 1.3) * s.float
      if (groupRef.current) {
        groupRef.current.setAttribute(
          "transform",
          `translate(0 ${bob.toFixed(2)})`
        )
      }
      if (svgRef.current) {
        svgRef.current.style.transform = `perspective(400px) rotateX(${s.tiltX.toFixed(2)}deg) rotateY(${s.tiltY.toFixed(2)}deg)`
      }
    },
    state
  )

  return (
    <svg
      ref={svgRef}
      viewBox={`0 0 ${VIEW} ${VIEW}`}
      preserveAspectRatio="xMidYMid meet"
      className="absolute inset-0 size-full"
    >
      <g ref={groupRef}>
        {Array.from({ length: FACETS }, (_, f) => (
          <polygon
            key={f}
            ref={(node) => {
              facetRefs.current[f] = node
            }}
            fill="currentColor"
            fillOpacity={0}
            stroke="var(--background)"
            strokeWidth={0.75}
            strokeLinejoin="round"
          />
        ))}
      </g>
    </svg>
  )
}
