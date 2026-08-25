import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { EmptyStateShowcase } from "@/components/empty-state-showcase"

export const metadata: Metadata = {
  title: docsTitle("/"),
  description:
    "A polished, accessible empty state component with five useful variants.",
}

export default function Page() {
  return <EmptyStateShowcase />
}
