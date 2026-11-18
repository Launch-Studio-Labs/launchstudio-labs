import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { BolderOnPressShowcase } from "@/components/bolder-on-press-showcase"

export const metadata: Metadata = {
  title: docsTitle("/bolder-on-press"),
  description:
    "Make a label bolder when it is pressed or selected without shifting the layout, plus a prompt that finds and fixes it across your codebase.",
}

export default function Page() {
  return <BolderOnPressShowcase />
}
