import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { BolderOnPressShowcase } from "@/components/bolder-on-press-showcase"

export const metadata: Metadata = {
  title: docsTitle("/bolder-on-press"),
  description:
    "Make a tab label bolder when it is pressed or active, without the tabs or the underline moving.",
}

export default function Page() {
  return <BolderOnPressShowcase />
}
