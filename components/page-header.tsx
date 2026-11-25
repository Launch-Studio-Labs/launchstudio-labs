import type { ReactNode } from "react"

import { docsPages, type DocsHref } from "@/app/(docs)/pages"
import { cn } from "@/lib/utils"

/**
 * The line every page opens with. It takes the route rather than a string:
 * the title is the page list's to give, so the heading here and the entry in
 * the sidebar are the same words by construction. It is the only place a
 * page may render an `<h1>` — lint enforces that (eslint.config.mjs).
 *
 * It sets no bottom margin: the shell's grid spaces it from whatever follows,
 * the same as every other block.
 */
export function PageHeader({
  href,
  action,
  animated = true,
  className,
}: {
  href: DocsHref
  /** Something to sit at the end of the title's line, e.g. a button. */
  action?: ReactNode
  /** Off when the header sits inside a block that already enters. */
  animated?: boolean
  className?: string
}) {
  const enter = animated && "labs-enter labs-enter-delay-1"
  /* 24px, set solid on a 24px line, on every page (DESIGN.md ›
     Typography). The size is the header's, never the page's. */
  const title = (
    <h1
      className={cn(
        "text-2xl leading-6 font-medium tracking-tight text-balance",
        !action && enter,
        !action && className
      )}
    >
      {docsPages[href].title}
    </h1>
  )
  if (!action) return title

  return (
    // On a phone the action drops under the title rather than squeezing it.
    <div
      className={cn(
        "flex flex-wrap items-center justify-between gap-x-4 gap-y-3",
        enter,
        className
      )}
    >
      {title}
      {action}
    </div>
  )
}
