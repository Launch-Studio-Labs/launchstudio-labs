"use client"

import dictationInputTweaks from "@/content/step-video/dictation-input.json"

import { deckIds } from "./deck-ids"
import { dictationInputDeck } from "./decks/dictation-input"
import { StepVideo } from "./player"
import type { Deck, Tweaks } from "./types"

/**
 * Every step video: the deck (code) and its tweaks (content/step-video/<id>.json,
 * written by the editor). Adding one is a deck file, a JSON file and a line here.
 */
const decks: Record<
  (typeof deckIds)[number],
  { deck: Deck<never>; tweaks: Tweaks }
> = {
  "dictation-input": {
    deck: dictationInputDeck as unknown as Deck<never>,
    tweaks: dictationInputTweaks as Tweaks,
  },
}

export function DeckPlayer({ id }: { id: string }) {
  const entry = decks[id as (typeof deckIds)[number]]
  if (!entry) return null
  return <StepVideo deck={entry.deck} initialTweaks={entry.tweaks} />
}
