import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { EmptyStateShowcase } from "@/components/empty-state-showcase"

export const metadata: Metadata = {
  title: docsTitle("/"),
  description:
    "Six common empty states, each drawn in five black-and-white directions that move on their own and answer the cursor.",
}

export default function Page() {
  return <EmptyStateShowcase />
}
