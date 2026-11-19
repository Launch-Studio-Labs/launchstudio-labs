"use client"

import dynamic from "next/dynamic"

/**
 * The dials panel: in local dev and on preview deploys, never in production.
 *
 * - `next dev` sets `NODE_ENV` to "development".
 * - `pnpm build:preview` (the static export Workers Builds serves on branch
 *   and PR preview URLs) sets `NEXT_PUBLIC_ENABLE_DIALS=1`.
 * - `pnpm build` (production) sets neither.
 *
 * Next inlines both values at build time (`next.config.ts` always defines
 * `NEXT_PUBLIC_ENABLE_DIALS`, empty when unset; an undefined one would stay a
 * runtime lookup and never fold), so in a production build
 * `enableDials` folds to `false`, `Panel` to `null`, and the `import()` behind
 * it is dead code: the panel, its schema and its strings are never emitted.
 * What ships there is this empty component. Keep the check inline, on
 * `process.env` directly. Moving it behind a helper, a runtime flag or a
 * hostname check would stop it folding and ship the panel to production.
 */
const enableDials =
  process.env.NODE_ENV === "development" ||
  process.env.NEXT_PUBLIC_ENABLE_DIALS === "1"

const Panel = enableDials
  ? dynamic(
      () => import("@/components/dev/dials-panel").then((m) => m.DialsPanel),
      { ssr: false }
    )
  : null

export function DevDials() {
  return Panel ? <Panel /> : null
}
