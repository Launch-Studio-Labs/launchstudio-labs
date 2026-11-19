import type { ComponentType } from "react"

import { FieldArt } from "@/components/empty-states/art/field"
import { FoldArt } from "@/components/empty-states/art/fold"
import { GhostArt } from "@/components/empty-states/art/ghost"
import { LineArt } from "@/components/empty-states/art/line"
import { SignalArt } from "@/components/empty-states/art/signal"
import type { ArtProps } from "@/components/empty-states/states"

/**
 * The five directions. Each is one self-contained art component that draws
 * every state, so whichever is picked can be lifted out on its own with the
 * engine and the panel, and the other four left behind.
 */
export const EMPTY_STATE_STYLES = [
  {
    id: "field",
    name: "Field",
    summary:
      "A surface of short strokes that turns as one, combed into a different flow for each state. Strokes near the cursor swirl around it.",
    art: FieldArt,
  },
  {
    id: "fold",
    name: "Fold",
    summary:
      "One sheet of paper, eight facets, refolded into a page, a box, a plane, an envelope. The creases catch the light as the cursor moves.",
    art: FoldArt,
  },
  {
    id: "line",
    name: "Line",
    summary:
      "A single sharp stroke that redraws itself into each state’s glyph, with a short echo trailing behind it. The cursor tugs at it.",
    art: LineArt,
  },
  {
    id: "signal",
    name: "Signal",
    summary:
      "A dot matrix and a shimmering status line, the way AI tools show they’re thinking. The cursor lights the dots it passes.",
    art: SignalArt,
  },
  {
    id: "ghost",
    name: "Ghost",
    summary:
      "Skeleton rows of the content that will be here, rearranged to say why it isn’t. The stack turns toward the cursor.",
    art: GhostArt,
  },
] as const satisfies readonly {
  id: string
  name: string
  summary: string
  art: ComponentType<ArtProps>
}[]

export type EmptyStateStyleId = (typeof EMPTY_STATE_STYLES)[number]["id"]

export function getEmptyStateStyle(id: EmptyStateStyleId) {
  return EMPTY_STATE_STYLES.find((style) => style.id === id)!
}
