import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { ReviewAnnotatorShowcase } from "@/components/review-annotator-showcase"

export const metadata: Metadata = {
  title: docsTitle("/review-annotator"),
  description:
    "A small browser extension for drawing on a site during reviews. Annotations stay pinned as you scroll.",
}

export default function Page() {
  return <ReviewAnnotatorShowcase />
}
