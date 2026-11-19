/**
 * Inner corner radius for something nested inside a rounded parent.
 *
 * The textbook rule, `outer - padding`, keeps both curves on one centre and
 * looks right while the radii are big. On small ones it runs out: an 8px field
 * with an 8px inset leaves its button with a 0px corner, square inside round.
 *
 * This keeps the textbook value wherever it holds and puts a floor under it
 * while the parent is curved:
 *
 *   inner = min(outer, max(outer - padding, outer * ratio, floor), size / 2)
 *
 * - `outer * ratio` (half, by default) keeps the inner corner in the same
 *   family as the outer one rather than a sharper shape beside it.
 * - `floor` (5px) is roughly where a corner starts to read as rounded: the arc
 *   pulls about 2px in from the corner point.
 * - Never rounder than the parent, and a square parent keeps a square child.
 * - Never more than half the inner element's short side, which is the most a
 *   radius can show — past it the shape is already a circle.
 * - A pill parent gets a pill child: half the outer height minus the padding
 *   is exactly half the inner height, so the textbook rule is right there.
 */
export type VisualConcentricRadiusOptions = {
  /** The parent's corner radius in px, or `"full"` for a pill. */
  outer: number | "full"
  /** Gap between the parent's edge and the inner element, in px. */
  padding: number
  /** The inner element's shorter side, in px. Caps the result at half of it. */
  size?: number
  /** Smallest radius the inner element gets while the parent is curved. */
  floor?: number
  /** Smallest share of the outer radius the inner element keeps. */
  ratio?: number
}

export const VISUAL_CONCENTRIC_FLOOR = 5
export const VISUAL_CONCENTRIC_RATIO = 0.5

/** What a pill radius resolves to when the inner size is not known. */
const PILL = 9999

/** The textbook rule, kept for comparison: `max(0, outer - padding)`. */
export function naiveConcentricRadius(outer: number, padding: number) {
  return Math.max(0, outer - padding)
}

export function visualConcentricRadius({
  outer,
  padding,
  size,
  floor = VISUAL_CONCENTRIC_FLOOR,
  ratio = VISUAL_CONCENTRIC_RATIO,
}: VisualConcentricRadiusOptions): number {
  const cap = size === undefined ? Infinity : Math.max(0, size / 2)

  if (outer === "full") return Math.min(PILL, cap)
  if (outer <= 0) return 0

  const radius = Math.min(
    outer,
    Math.max(outer - padding, outer * ratio, floor)
  )
  return Math.min(radius, cap)
}
