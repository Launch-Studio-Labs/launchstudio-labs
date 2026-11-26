import type { Deck, LabelDef, Step, Tweaks } from "./types"

export const EMPTY_TWEAKS: Tweaks = { version: 1 }

/**
 * The play order: the tweaked order for the steps it knows, and every step it
 * doesn't (new in the deck since the last save) right after its neighbour in
 * the deck. Steps the deck dropped are skipped.
 */
export function orderSteps<S>(deck: Deck<S>, tweaks: Tweaks): Step<S>[] {
  const byId = new Map(deck.steps.map((step) => [step.id, step]))
  const order = (tweaks.order ?? []).filter((id) => byId.has(id))
  const placed = new Set(order)
  deck.steps.forEach((step, index) => {
    if (placed.has(step.id)) return
    const before = deck.steps[index - 1]
    const at = before ? order.indexOf(before.id) + 1 : 0
    order.splice(at, 0, step.id)
    placed.add(step.id)
  })
  return order.map((id) => byId.get(id)!)
}

/** A label with Adam's edits on top of the deck's. */
export function resolveLabel(
  deck: Deck<unknown>,
  tweaks: Tweaks,
  id: string
): LabelDef | null {
  const base = deck.labels[id]
  if (!base) return null
  const edit = tweaks.labels?.[id]
  return edit ? { ...base, ...stripUndefined(edit) } : base
}

function stripUndefined<T extends object>(value: T): Partial<T> {
  return Object.fromEntries(
    Object.entries(value).filter(([, v]) => v !== undefined)
  ) as Partial<T>
}

export function editLabel(
  tweaks: Tweaks,
  id: string,
  patch: Partial<Pick<LabelDef, "x" | "y" | "text" | "color">>
): Tweaks {
  return {
    ...tweaks,
    labels: {
      ...tweaks.labels,
      [id]: { ...tweaks.labels?.[id], ...patch },
    },
  }
}

/** Saves through the dev-only endpoint. False when there is none (a static build). */
export async function saveTweaks(deckId: string, tweaks: Tweaks) {
  try {
    const response = await fetch(`/step-video/api/${deckId}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(tweaks),
    })
    return response.ok
  } catch {
    return false
  }
}

export function downloadTweaks(deckId: string, tweaks: Tweaks) {
  const blob = new Blob([`${JSON.stringify(tweaks, null, 2)}\n`], {
    type: "application/json",
  })
  const url = URL.createObjectURL(blob)
  const link = document.createElement("a")
  link.href = url
  link.download = `${deckId}.json`
  link.click()
  URL.revokeObjectURL(url)
}
