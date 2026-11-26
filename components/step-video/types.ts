import type { ComponentType } from "react"
import type { SoundName } from "cuelume"

/**
 * A step video is a deck of steps. Each step is a full target state — what
 * the world shows, where the camera is, the background, which labels are up
 * — so moving forward, back or jumping anywhere lands on the same frame.
 *
 * The deck (Claude's code) and the tweaks (Adam's edits, a JSON file) are
 * kept apart: tweaks only ever name steps and labels by id, so the deck can
 * keep changing without wiping them.
 */

/** The stage's fixed size. Everything is laid out in these pixels. */
export const STAGE_WIDTH = 1920
export const STAGE_HEIGHT = 1080

/**
 * Where the camera looks, in world pixels from the stage centre, and how
 * close. The world is the deck's own layer: the UI piece and anything that
 * should zoom with it. Labels sit above the camera and never zoom.
 */
export type Camera = {
  x?: number
  y?: number
  /** 1 shows world pixels at stage pixels. @default the deck's baseScale */
  scale?: number
  /** Degrees, around the focus point. */
  rotate?: number
  /** A slight 3D lean, in degrees around the X axis. */
  tilt?: number
}

/** A label's colour: a theme token, or any CSS colour. */
export type LabelColor = "foreground" | "muted" | "primary" | (string & {})

/**
 * A label (a caption or thought) as the deck defines it. One label can stay
 * up across several steps while its phrases light up one by one, so text,
 * position and colour belong to the label, not to a step.
 */
export type LabelDef = {
  /**
   * Phrases split by "|". Lit phrases read in the label's colour; the ones
   * still to come read faint, the way the line is about to be said.
   */
  text: string
  /** The label's centre, in stage pixels from the top left. */
  x: number
  y: number
  /** Font size in stage pixels. @default 44 */
  size?: number
  /** Degrees. */
  rotate?: number
  color?: LabelColor
  /** Wrap width in stage pixels. @default 1200 */
  width?: number
}

/** A label on one step: which one, and how many phrases are lit. */
export type StepLabel = {
  id: string
  /** Phrases lit, from the start. @default all */
  lit?: number
}

export type Step<S> = {
  id: string
  /** Shown in the editor's step list only. */
  name: string
  scene: S
  camera?: Camera
  /** The stage colour. @default "#ffffff" */
  background?: string
  labels?: StepLabel[]
  /** A quiet cue when this step is reached going forward. */
  cue?: SoundName
  /**
   * How long the step's own animation runs, in ms. A key pressed before it
   * ends finishes it instead of moving on. @default 700
   */
  duration?: number
}

/** What a deck's world draws for one step. */
export type WorldProps<S> = {
  scene: S
  /** The step's index in play order; changes on every move. */
  stepId: string
}

export type Deck<S> = {
  id: string
  title: string
  /** The camera scale for steps that don't set one. @default 1 */
  baseScale?: number
  labels: Record<string, LabelDef>
  steps: Step<S>[]
  World: ComponentType<WorldProps<S>>
}

/** Adam's edits. Everything is optional; the deck fills in the rest. */
export type Tweaks = {
  version: 1
  /** Step ids in play order. Steps missing here keep their deck position. */
  order?: string[]
  labels?: Record<string, Partial<Pick<LabelDef, "x" | "y" | "text" | "color">>>
}
