/**
 * Inner corner radius for something nested inside a rounded parent.
 *
 * The textbook rule, `outer - padding`, keeps both curves on one centre and
 * looks right while the radii are big. On small ones it runs out: an 8px field
 * with an 8px inset leaves its button with a 0px corner, square inside round.
 *
 * So start from the concentric ideal, put a floor under it, and only while the
 * inner element sits close to the parent's edge:
 *
 *   floor = max(outer * ratio, min(minimum, outer))
 *   inner = max(outer - padding, floor)      when padding <= outer
 *   inner = own (defaults to floor)          when padding >  outer
 *
 * - `ratio` (half, by default) keeps the inner corner in the same family as
 *   the outer one rather than a sharper shape beside it.
 * - `minimum` (2px) is the smallest radius that still reads as a rounded
 *   corner rather than a square one, so the inner corner is never fully
 *   sharp. With the default ratio it only binds under a 4px outer radius. A
 *   parent smaller than 2px lowers it to its own radius, so the inside is
 *   never rounder than the outside, and a square parent keeps a square child.
 * - `floor` is the two together: the lowest the inner radius goes.
 * - Concentric only reads while the edges are close. Once the padding is
 *   bigger than the outer radius the corners no longer look like a pair, so
 *   the inner element keeps its `own` radius.
 * - A pill parent gets a pill child: half the outer height minus the padding
 *   is exactly half the inner height, so the textbook rule is right there.
 * - `size`, if given, clamps the reported number at half the inner element's
 *   short side. The browser draws an oversized radius that way anyway; this
 *   only makes the number say what's on screen.
 */
export type VisualConcentricRadiusOptions = {
  /** The parent's corner radius in px, or `"full"` for a pill. */
  outer: number | "full"
  /** Gap between the parent's edge and the inner element, in px. */
  padding: number
  /** The inner element's shorter side, in px. Clamps the result at half of it. */
  size?: number
  /**
   * The inner element's own radius, used once the padding is bigger than the
   * outer radius. Defaults to the floor.
   */
  own?: number
  /** The radius a curved parent's child never goes under, in px. */
  minimum?: number
  /** Smallest share of the outer radius the inner element keeps. */
  ratio?: number
}

export const VISUAL_CONCENTRIC_MINIMUM = 2
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
  own,
  minimum = VISUAL_CONCENTRIC_MINIMUM,
  ratio = VISUAL_CONCENTRIC_RATIO,
}: VisualConcentricRadiusOptions): number {
  const cap = size === undefined ? Infinity : Math.max(0, size / 2)

  if (outer === "full") return Math.min(PILL, cap)

  const edge = Math.max(0, outer)
  const gap = Math.max(0, padding)
  const floor = Math.max(edge * ratio, Math.min(minimum, edge))
  const radius =
    gap <= edge ? Math.max(edge - gap, floor) : Math.max(0, own ?? floor)

  return Math.min(radius, cap)
}
