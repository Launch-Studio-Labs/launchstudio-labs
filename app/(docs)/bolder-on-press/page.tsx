import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { BolderOnPressShowcase } from "@/components/bolder-on-press-showcase"

export const metadata: Metadata = {
  title: docsTitle("/bolder-on-press"),
  description:
    "A press that makes the label look heavier, with the resting face held fixed so the control never reflows.",
}

export default function Page() {
  return <BolderOnPressShowcase />
}
