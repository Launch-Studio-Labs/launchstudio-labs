import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { WeightWithoutShiftShowcase } from "@/components/weight-without-shift-showcase"

export const metadata: Metadata = {
  title: docsTitle("/weight-without-shift"),
  description:
    "Change a label's font weight for selected, active or current states without the box changing size or the layout shifting, plus a prompt that finds and fixes it across a codebase.",
}

export default function Page() {
  return <WeightWithoutShiftShowcase />
}
