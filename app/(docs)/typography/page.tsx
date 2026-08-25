import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { TypographyShowcase } from "@/components/typography-showcase"

export const metadata: Metadata = {
  title: docsTitle("/typography"),
  description:
    "Width and leading, side by side: one column that follows the rules of thumb and one that does not.",
}

export default function Page() {
  return <TypographyShowcase />
}
