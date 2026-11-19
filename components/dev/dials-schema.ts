import type { TunedStyleId, Tuning } from "@/components/empty-states/tuning"

/**
 * What the dials panel shows for each style: labels, ranges, steps and
 * groups. Dev only — this file is reached through the panel alone, so none of
 * it is in a production bundle. The values themselves (and their defaults)
 * live in `components/empty-states/tuning.ts`.
 */

export type Dial =
  | {
      kind: "range"
      key: string
      label: string
      min: number
      max: number
      step: number
      unit?: string
    }
  | { kind: "toggle"; key: string; label: string }
  | {
      kind: "choice"
      key: string
      label: string
      options: readonly { value: string; label: string }[]
    }

export type DialGroup = { title: string; dials: Dial[] }

const range = (
  key: string,
  label: string,
  min: number,
  max: number,
  step: number,
  unit?: string
): Dial => ({ kind: "range", key, label, min, max, step, unit })

const toggle = (key: string, label: string): Dial => ({
  kind: "toggle",
  key,
  label,
})

export const STYLE_DIALS: Record<TunedStyleId, DialGroup[]> = {
  field: [
    {
      title: "Marks",
      dials: [
        {
          kind: "choice",
          key: "shape",
          label: "Shape",
          options: [
            { value: "stroke", label: "Stroke" },
            { value: "dot", label: "Dot" },
            { value: "square", label: "Square" },
          ],
        },
        range("gap", "Spacing", 5, 32, 0.5, "px"),
        range("length", "Stroke length", 1, 24, 0.5, "px"),
        range("weight", "Stroke weight", 0.5, 6, 0.25, "px"),
        range("mark", "Dot / square size", 0.5, 8, 0.1, "px"),
        range("contrast", "Ink", 0.2, 2, 0.05, "×"),
        range("edgeFade", "Edge fade", 0, 1, 0.01),
      ],
    },
    {
      title: "Motion",
      dials: [
        range("tempo", "Flow speed", 0, 4, 0.05, "×"),
        range("turnRate", "Settle rate", 0.5, 20, 0.5, "/s"),
      ],
    },
    {
      title: "Cursor",
      dials: [
        toggle("cursor", "Responds to cursor"),
        range("cursorRadius", "Reach", 0.5, 12, 0.1, "gaps"),
        range("cursorSwirl", "Swirl", 0, 1, 0.01),
        range("cursorInk", "Highlight", 0, 1.5, 0.05),
      ],
    },
  ],

  fold: [
    {
      title: "Paper",
      dials: [
        range("scale", "Size", 0.5, 1.4, 0.01, "×"),
        range("roundness", "Corner rounding", 0, 8, 0.1),
        range("crease", "Crease width", 0, 3, 0.05),
        range("contrast", "Ink", 0.2, 2, 0.05, "×"),
      ],
    },
    {
      title: "Light",
      dials: [
        range("light", "Light strength", 0, 0.6, 0.01),
        range("lightOrbit", "Orbit at rest", 0, 3, 0.05, "rad/s"),
      ],
    },
    {
      title: "Motion",
      dials: [
        range("morph", "Refold time", 0.1, 2, 0.05, "s"),
        range("spin", "Pinwheel speed", 0, 5, 0.05, "rad/s"),
        range("float", "Plane bob", 0, 4, 0.05, "×"),
      ],
    },
    {
      title: "Cursor",
      dials: [
        toggle("cursor", "Responds to cursor"),
        range("tilt", "Hover tilt", 0, 40, 0.5, "°"),
        range("perspective", "Perspective", 150, 2000, 10, "px"),
      ],
    },
  ],

  signal: [
    {
      title: "Grid",
      dials: [
        {
          kind: "choice",
          key: "cell",
          label: "Cell",
          options: [
            { value: "dot", label: "Dot" },
            { value: "square", label: "Square" },
          ],
        },
        range("grid", "Cells per side", 9, 25, 2),
        range("pitch", "Cell pitch", 3, 20, 0.5, "px"),
        range("size", "Mark size", 0.03, 0.5, 0.01),
        range("grow", "Lit growth", 0, 0.4, 0.01),
        range("corner", "Square rounding", 0, 1, 0.01),
      ],
    },
    {
      title: "Ink",
      dials: [
        range("floor", "Unlit level", 0, 0.4, 0.01),
        range("minAlpha", "Dimmest mark", 0, 0.8, 0.01),
      ],
    },
    {
      title: "Motion",
      dials: [
        range("tempo", "Pattern speed", 0, 4, 0.05, "×"),
        range("fade", "Fade rate", 1, 40, 0.5, "/s"),
      ],
    },
    {
      title: "Cursor",
      dials: [
        toggle("cursor", "Responds to cursor"),
        range("torch", "Torch reach", 0.3, 6, 0.1, "cells"),
        range("torchInk", "Torch strength", 0, 1.5, 0.05),
      ],
    },
  ],

  ghost: [
    {
      title: "Rows",
      dials: [
        range("rows", "Row count", 1, 6, 1),
        range("rowHeight", "Row height", 20, 60, 1, "px"),
        range("rowGap", "Row gap", 0, 32, 1, "px"),
        range("rowWidth", "Row width", 100, 300, 2, "px"),
        range("radius", "Row radius", 0, 24, 0.5, "px"),
        range("avatarRadius", "Avatar radius", 0, 16, 0.5, "px"),
        range("barSpread", "Bar width variation", 0, 1, 0.01),
        range("opacity", "Opacity", 0.1, 1, 0.01),
      ],
    },
    {
      title: "Motion",
      dials: [
        range("morph", "Rearrange time", 80, 1500, 10, "ms"),
        range("shimmer", "Sheen duration", 0.4, 5, 0.05, "s"),
        range("sway", "Sway at rest", 0, 20, 0.5, "°"),
      ],
    },
    {
      title: "Depth & cursor",
      dials: [
        toggle("cursor", "Responds to cursor"),
        range("lean", "Lean back", -10, 45, 0.5, "°"),
        range("hoverTilt", "Hover tilt", 0, 3, 0.05, "×"),
        range("perspective", "Perspective", 200, 2400, 10, "px"),
      ],
    },
  ],
}

export const GLOBAL_DIALS: DialGroup = {
  title: "Page",
  dials: [
    range("speed", "Clock speed", 0, 3, 0.05, "×"),
    toggle("reducedPreview", "Preview reduced motion"),
    range("stageHeight", "Stage art height", 80, 360, 2, "px"),
    range("tileHeight", "Matrix tile height", 56, 220, 2, "px"),
  ],
}

export const STYLE_NAMES: Record<TunedStyleId, string> = {
  field: "Field",
  fold: "Fold",
  signal: "Signal",
  ghost: "Ghost",
}

/**
 * Lays stored values over the defaults, key by key, keeping only keys the
 * defaults still have and values of the same type — so a session saved
 * before a dial was renamed or added can't poison the current one.
 */
export function mergeTuning(defaults: Tuning, stored: unknown): Tuning {
  const pick = <T extends Record<string, unknown>>(
    base: T,
    over: unknown
  ): T => {
    if (!over || typeof over !== "object") return base
    const out = { ...base }
    for (const key of Object.keys(base) as (keyof T)[]) {
      const value = (over as Record<string, unknown>)[key as string]
      if (value !== undefined && typeof value === typeof base[key]) {
        out[key] = value as T[keyof T]
      }
    }
    return out
  }
  const raw = (stored ?? {}) as Partial<Record<keyof Tuning, unknown>>
  const styles = (raw.styles ?? {}) as Record<string, unknown>
  return {
    focus:
      typeof raw.focus === "string" && raw.focus in defaults.styles
        ? (raw.focus as Tuning["focus"])
        : defaults.focus,
    global: pick(defaults.global, raw.global),
    styles: {
      field: pick(defaults.styles.field, styles.field),
      fold: pick(defaults.styles.fold, styles.fold),
      signal: pick(defaults.styles.signal, styles.signal),
      ghost: pick(defaults.styles.ghost, styles.ghost),
    },
  }
}
