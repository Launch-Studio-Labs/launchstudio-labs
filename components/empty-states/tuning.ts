"use client"

import { useSyncExternalStore } from "react"

/**
 * The numbers each style is drawn with, in one place.
 *
 * The defaults here are the look that ships. Nothing in production changes
 * them: the only writer is the dials panel, which exists in local dev alone
 * (see `components/dev`). Keeping the values out of the art files means a
 * set of dials copied out of that panel can be pasted straight back here.
 */

export type TunedStyleId = "field" | "fold" | "signal" | "ghost"

export const DEFAULT_TUNING = {
  /** The style the dials are pointed at. */
  focus: "field" as TunedStyleId,

  global: {
    /** Multiplies the clock every art runs on. 0 holds the frame. */
    speed: 1,
    /** Draw as if the reader asked for reduced motion. */
    reducedPreview: false,
    /** Height of the art in a full empty state, px. */
    stageHeight: 176,
    /** Height of a matrix tile, px. */
    tileHeight: 104,
  },

  styles: {
    field: {
      shape: "stroke" as "stroke" | "dot" | "square",
      /** Distance between strokes, px. */
      gap: 13,
      /** Stroke length, px. */
      length: 7,
      /** Stroke weight, px. */
      weight: 2.25,
      /** Radius of a dot or half-width of a square, px. */
      mark: 2.2,
      /** Multiplies every stroke's ink. */
      contrast: 1,
      /** How far in from the edge the field starts to fade, 0..1. */
      edgeFade: 0.38,
      /** Multiplies the speed of the flow itself. */
      tempo: 1,
      /** How quickly strokes turn to a new flow, per second. */
      turnRate: 5,
      cursor: true,
      /** Reach of the cursor, in gaps. */
      cursorRadius: 3.6,
      /** How hard strokes near the cursor turn round it, 0..1. */
      cursorSwirl: 0.9,
      /** Ink added near the cursor. */
      cursorInk: 0.55,
    },

    fold: {
      /** Size of the paper object. */
      scale: 1,
      /** Width of the creases between facets, viewBox units. */
      crease: 0.75,
      /** Rounds every facet's corners, viewBox units. */
      roundness: 0,
      /** Multiplies every facet's ink. */
      contrast: 1,
      /** How much a facet changes as the light turns. */
      light: 0.18,
      /** Speed the light orbits at rest, radians per second. */
      lightOrbit: 0.5,
      /** Hover tilt, degrees. */
      tilt: 12,
      /** CSS perspective for the tilt, px. */
      perspective: 400,
      /** Multiplies the plane's bob. */
      float: 1,
      /** Pinwheel speed while working, radians per second. */
      spin: 1.1,
      /** Seconds a refold takes. */
      morph: 0.6,
      cursor: true,
    },

    signal: {
      cell: "dot" as "dot" | "square",
      /** Cells per side. Odd, so the glyphs sit centred. */
      grid: 11,
      /** Cell pitch at full size, px. */
      pitch: 10,
      /** Mark size at rest, as a fraction of the pitch. */
      size: 0.14,
      /** How much a lit mark grows, as a fraction of the pitch. */
      grow: 0.16,
      /** Corner rounding for square cells, 0 (sharp) to 1 (round). */
      corner: 0.3,
      /** Brightness of an unlit cell. */
      floor: 0.06,
      /** Opacity of the dimmest mark. */
      minAlpha: 0.1,
      /** Multiplies the speed of every pattern. */
      tempo: 1,
      /** How quickly a cell reaches its new brightness, per second. */
      fade: 10,
      cursor: true,
      /** Reach of the cursor's light, in cells. */
      torch: 1.8,
      /** Brightness the cursor adds. */
      torchInk: 0.6,
    },

    ghost: {
      rows: 3,
      /** px */
      rowHeight: 34,
      /** px between rows */
      rowGap: 8,
      /** px */
      rowWidth: 184,
      /** Row corner radius, px. */
      radius: 7.2,
      /** Avatar corner radius, px. */
      avatarRadius: 5,
      /** How much skeleton bar widths vary between rows, 0..1. */
      barSpread: 0,
      /** Opacity multiplier for the whole stack. */
      opacity: 1,
      /** Resting tilt back, degrees. */
      lean: 14,
      /** Resting sway, degrees. */
      sway: 6,
      /** Multiplies the hover turn. */
      hoverTilt: 1,
      /** CSS perspective, px. */
      perspective: 700,
      /** Milliseconds a rearrangement takes. */
      morph: 500,
      /** Seconds one loading sheen takes to cross a row. */
      shimmer: 1.6,
      cursor: true,
    },
  },
}

export type Tuning = typeof DEFAULT_TUNING
export type GlobalTuning = Tuning["global"]
export type StyleTuning<K extends TunedStyleId> = Tuning["styles"][K]

/* ------------------------------------------------------------------------ */
/* A minimal external store                                                 */
/* ------------------------------------------------------------------------ */

let current: Tuning = DEFAULT_TUNING
const listeners = new Set<() => void>()

export function getTuning() {
  return current
}

export function setTuning(next: Tuning) {
  current = next
  listeners.forEach((listener) => listener())
}

export function subscribeTuning(listener: () => void) {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

/** Points the dials at a style. Harmless when there are no dials. */
export function focusStyle(id: TunedStyleId) {
  if (current.focus !== id) setTuning({ ...current, focus: id })
}

/** One style's values. Re-renders only when that style's values change. */
export function useStyleTuning<K extends TunedStyleId>(id: K): StyleTuning<K> {
  return useSyncExternalStore(
    subscribeTuning,
    () => current.styles[id],
    () => DEFAULT_TUNING.styles[id]
  )
}

export function useGlobalTuning(): GlobalTuning {
  return useSyncExternalStore(
    subscribeTuning,
    () => current.global,
    () => DEFAULT_TUNING.global
  )
}
