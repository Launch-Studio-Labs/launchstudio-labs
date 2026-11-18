import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { BolderOnPressShowcase } from "@/components/bolder-on-press-showcase"

export const metadata: Metadata = {
  title: docsTitle("/bolder-on-press"),
  description:
    "The homepage tabs, with a press that thickens the label and never reflows the bar underneath.",
}

export default function Page() {
  return <BolderOnPressShowcase />
}
