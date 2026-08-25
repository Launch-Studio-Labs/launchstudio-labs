import type { ReactNode } from "react"

import { AppShell } from "@/components/app-shell"

/**
 * Everything the site publishes reads inside the docs shell — sidebar, the
 * content column, the page rhythm. The playground sits outside this group so
 * it can put a demo on a bare canvas instead.
 */
export default function DocsLayout({ children }: { children: ReactNode }) {
  return <AppShell>{children}</AppShell>
}
