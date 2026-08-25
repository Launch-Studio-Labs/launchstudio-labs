import type { Metadata } from "next"
import type { ReactNode } from "react"

import { PlaygroundShell } from "@/components/playground-shell"

/**
 * Unlisted: nothing links here and search engines are asked to keep out. It
 * is a workbench, not a page of the site.
 */
export const metadata: Metadata = {
  title: "Playground — Launch Studio Labs",
  robots: { index: false, follow: false },
}

export default function PlaygroundLayout({
  children,
}: {
  children: ReactNode
}) {
  return <PlaygroundShell>{children}</PlaygroundShell>
}
