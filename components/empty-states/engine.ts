"use client"

import { useEffect, useLayoutEffect, useRef, type RefObject } from "react"

/**
 * What every art component draws from. The art never runs its own loop: it is
 * handed a frame and moves its current values a step toward the state it was
 * asked for. That one rule is what makes every style morph, and what makes a
 * switch mid-morph pick up from wherever the shape had got to.
 */
export type Frame = {
  /** Seconds since the art mounted. Frozen under reduced motion. */
  t: number
  /** Seconds since the last frame, clamped so a backgrounded tab can't lurch. */
  dt: number
  /** Jump straight to the target: first paint, and every reduced-motion paint. */
  snap: boolean
  /** Pixel size of the art's box. */
  width: number
  height: number
  /** In the art's own pixels. `inside` is false until a mouse or pen enters. */
  pointer: { x: number; y: number; inside: boolean }
}

/** The still frame reduced motion shows: far enough in that loops look settled. */
const STILL_T = 2.4

/* ------------------------------------------------------------------------ */
/* One ticker for the whole page                                            */
/* ------------------------------------------------------------------------ */

const subscribers = new Set<(now: number) => void>()
let rafId = 0

function loop(now: number) {
  for (const subscriber of subscribers) subscriber(now)
  rafId = subscribers.size > 0 ? requestAnimationFrame(loop) : 0
}

/** Thirty pieces of art share one requestAnimationFrame rather than thirty. */
function subscribe(callback: (now: number) => void) {
  subscribers.add(callback)
  if (!rafId) rafId = requestAnimationFrame(loop)
  return () => {
    subscribers.delete(callback)
  }
}

/* ------------------------------------------------------------------------ */
/* The hook                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * Drives one piece of art.
 *
 * - Runs only while the art is on screen and the tab is visible.
 * - Tracks the pointer across the whole empty state (the nearest
 *   `[data-empty-state]`), not just the art, so the art answers the card the
 *   reader is actually hovering. Touch is ignored: a tap is not a hover.
 * - Under `prefers-reduced-motion` it never subscribes to the ticker. It
 *   paints one still frame, and paints again, snapped, whenever `stateKey`
 *   changes or the box resizes.
 */
export function useArtFrame(
  ref: RefObject<Element | null>,
  draw: (frame: Frame) => void,
  stateKey: unknown
) {
  const drawRef = useRef(draw)
  const paintStillRef = useRef<(() => void) | null>(null)

  useLayoutEffect(() => {
    drawRef.current = draw
  })

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const host = element.closest("[data-empty-state]") ?? element
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)")

    let reduced = motionQuery.matches
    let visible = false
    let width = 0
    let height = 0
    let first = true
    let last = performance.now()
    const start = last
    const pointer = { x: 0, y: 0, inside: false }
    let unsubscribe: (() => void) | null = null

    const paint = (now: number, snap: boolean) => {
      if (width === 0 || height === 0) return
      const jump = snap || first
      drawRef.current({
        t: reduced ? STILL_T : (now - start) / 1000,
        dt: jump ? 1 : Math.min((now - last) / 1000, 1 / 20),
        snap: jump,
        width,
        height,
        pointer: reduced ? { x: 0, y: 0, inside: false } : pointer,
      })
      first = false
      last = now
    }

    const tick = (now: number) => {
      if (!document.hidden) paint(now, false)
      else last = now
    }

    const paintStill = () => {
      if (!unsubscribe) paint(performance.now(), true)
    }
    paintStillRef.current = paintStill

    const sync = () => {
      const run = visible && !reduced
      if (run && !unsubscribe) {
        last = performance.now()
        unsubscribe = subscribe(tick)
      } else if (!run && unsubscribe) {
        unsubscribe()
        unsubscribe = null
      }
      if (!run) paintStill()
    }

    const resizeObserver = new ResizeObserver(([entry]) => {
      width = entry.contentRect.width
      height = entry.contentRect.height
      paintStill()
    })
    resizeObserver.observe(element)

    const intersectionObserver = new IntersectionObserver(([entry]) => {
      visible = entry.isIntersecting
      sync()
    })
    intersectionObserver.observe(element)

    const onMove = (event: Event) => {
      const e = event as PointerEvent
      if (e.pointerType === "touch") return
      const rect = element.getBoundingClientRect()
      pointer.x = e.clientX - rect.left
      pointer.y = e.clientY - rect.top
      pointer.inside = true
    }
    const onLeave = () => {
      pointer.inside = false
    }
    host.addEventListener("pointermove", onMove)
    host.addEventListener("pointerleave", onLeave)

    const onMotionChange = () => {
      reduced = motionQuery.matches
      first = true
      sync()
    }
    motionQuery.addEventListener("change", onMotionChange)

    return () => {
      unsubscribe?.()
      resizeObserver.disconnect()
      intersectionObserver.disconnect()
      host.removeEventListener("pointermove", onMove)
      host.removeEventListener("pointerleave", onLeave)
      motionQuery.removeEventListener("change", onMotionChange)
      paintStillRef.current = null
    }
  }, [ref])

  // A paused or reduced-motion art still has to show the new state.
  useEffect(() => {
    paintStillRef.current?.()
  }, [stateKey])
}

/* ------------------------------------------------------------------------ */
/* Helpers                                                                  */
/* ------------------------------------------------------------------------ */

/**
 * How far to close the gap to the target this frame. Exponential, so it is
 * frame-rate independent and always interruptible: a new target simply
 * becomes the thing it is closing on. `rate` is per second; 6 lands in about
 * half a second, 14 feels immediate.
 */
export function follow(frame: Frame, rate: number) {
  return frame.snap ? 1 : 1 - Math.exp(-rate * frame.dt)
}

export function lerp(from: number, to: number, amount: number) {
  return from + (to - from) * amount
}

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function smoothstep(edge0: number, edge1: number, value: number) {
  const x = clamp((value - edge0) / (edge1 - edge0), 0, 1)
  return x * x * (3 - 2 * x)
}

/** Cheap, stable pseudo-random in [0, 1) for a pair of integers. */
export function hash(a: number, b: number) {
  const s = Math.sin(a * 127.1 + b * 311.7) * 43758.5453
  return s - Math.floor(s)
}

/**
 * Sizes a canvas to its box at device resolution and returns a context drawn
 * in CSS pixels, plus the ink colour: the canvas inherits `color`, so the art
 * follows the theme like any SVG drawn in `currentColor`.
 */
export function prepareCanvas(
  canvas: HTMLCanvasElement,
  width: number,
  height: number
) {
  const ratio = Math.min(window.devicePixelRatio || 1, 2)
  const w = Math.round(width * ratio)
  const h = Math.round(height * ratio)
  if (canvas.width !== w || canvas.height !== h) {
    canvas.width = w
    canvas.height = h
  }
  const context = canvas.getContext("2d")
  if (!context) return null
  context.setTransform(ratio, 0, 0, ratio, 0, 0)
  context.clearRect(0, 0, width, height)
  return { context, ink: getComputedStyle(canvas).color }
}

/**
 * Maps the pointer into an SVG's viewBox, for art drawn with
 * `preserveAspectRatio="xMidYMid meet"`.
 */
export function pointerInViewBox(
  frame: Frame,
  viewWidth: number,
  viewHeight: number
) {
  const scale = Math.min(frame.width / viewWidth, frame.height / viewHeight)
  const offsetX = (frame.width - viewWidth * scale) / 2
  const offsetY = (frame.height - viewHeight * scale) / 2
  return {
    x: (frame.pointer.x - offsetX) / scale,
    y: (frame.pointer.y - offsetY) / scale,
    inside: frame.pointer.inside,
  }
}

/**
 * A timed morph between whole shapes, for art whose target moves on its own
 * (a turning pinwheel, a travelling wave). Chasing a moving target would
 * leave the shape trailing and soften every corner; this instead snapshots
 * where the shape was when the state changed and blends from that snapshot to
 * the live target. Once the blend lands, the shape *is* the target, exactly.
 *
 * Interrupting it is safe: a new state snapshots the shape mid-blend and sets
 * off from there.
 */
export type Morph = { key: unknown; progress: number; from: Float32Array }

export function createMorph(size: number): Morph {
  return { key: undefined, progress: 1, from: new Float32Array(size) }
}

/** Approximates the site's `--ease-morph`, cubic-bezier(0.77, 0, 0.175, 1). */
function easeMorph(x: number) {
  return x < 0.5 ? 8 * x ** 4 : 1 - (-2 * x + 2) ** 4 / 2
}

export function stepMorph(
  morph: Morph,
  frame: Frame,
  key: unknown,
  current: Float32Array,
  target: ArrayLike<number>,
  duration = 0.6
) {
  if (key !== morph.key) {
    morph.key = key
    morph.from.set(current)
    morph.progress = 0
  }
  morph.progress = frame.snap
    ? 1
    : Math.min(1, morph.progress + frame.dt / duration)
  const amount = easeMorph(morph.progress)
  for (let k = 0; k < current.length; k++) {
    current[k] = morph.from[k] + (target[k] - morph.from[k]) * amount
  }
}
