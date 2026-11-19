/**
 * The empty states a product actually runs into, and the words each one
 * says. Every style in the exploration draws all of these, so the copy lives
 * here once and the art never carries any of it.
 */
export const EMPTY_STATES = {
  "first-use": {
    name: "First use",
    when: "Nothing has been made yet. The one moment to teach what goes here.",
    title: "No projects yet",
    description:
      "Create your first project to keep briefs, files and feedback in one place.",
    action: "New project",
    status: "Ready when you are",
  },
  "no-results": {
    name: "No results",
    when: "A search or filter came back with nothing. Help them widen it.",
    title: "No matches for “brand refresh”",
    description:
      "Check the spelling, or clear a filter to search everything again.",
    action: "Clear filters",
    status: "Searched 2,481 items",
  },
  cleared: {
    name: "All clear",
    when: "They emptied it themselves. A small reward, then out of the way.",
    title: "You’re all caught up",
    description: "New requests will show up here as soon as they come in.",
    action: "View archive",
    status: "Nothing left to review",
  },
  "no-access": {
    name: "No access",
    when: "It exists, but not for them. Say who can let them in.",
    title: "You don’t have access",
    description:
      "This project is open to invited members only. Ask an owner to add you.",
    action: "Request access",
    status: "Restricted",
  },
  error: {
    name: "Error",
    when: "It failed to load. Say what happened and offer the retry.",
    title: "This page didn’t load",
    description:
      "The connection dropped before the request finished. Your work is saved.",
    action: "Try again",
    status: "Connection lost",
  },
  working: {
    name: "Working",
    when: "Waiting on a result, like an AI reply. Show it’s alive, not stuck.",
    title: "Writing your summary",
    description:
      "This usually takes a few seconds. You can leave the page and come back.",
    action: "Stop",
    status: "Thinking",
  },
} as const

export type EmptyStateType = keyof typeof EMPTY_STATES

export const EMPTY_STATE_TYPES = Object.keys(EMPTY_STATES) as EmptyStateType[]

/** What every style's art takes: the state to draw, and how much room it has. */
export type ArtProps = {
  state: EmptyStateType
  /** `sm` is the matrix tile; `lg` is a full empty state. */
  size?: "sm" | "lg"
}
