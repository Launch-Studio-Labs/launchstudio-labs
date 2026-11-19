"use client"

import dynamic from "next/dynamic"

/**
 * The dials panel, in local dev and nowhere else.
 *
 * Next inlines `process.env.NODE_ENV` at build time, so in `next build` (and
 * the static `build:preview`) `Panel` folds to `null` and the `import()`
 * behind it is dead code: the panel, its schema and its strings are never
 * emitted. What ships is this empty component. Keep the check inline — moving
 * it behind a helper or a runtime flag would stop it folding and ship the
 * panel.
 */
const Panel =
  process.env.NODE_ENV === "development"
    ? dynamic(
        () => import("@/components/dev/dials-panel").then((m) => m.DialsPanel),
        { ssr: false }
      )
    : null

export function DevDials() {
  return Panel ? <Panel /> : null
}
