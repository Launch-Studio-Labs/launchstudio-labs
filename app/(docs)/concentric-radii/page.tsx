import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { ConcentricRadiiShowcase } from "@/components/concentric-radii-showcase"

export const metadata: Metadata = {
  title: docsTitle("/concentric-radii"),
  description:
    "Why outer minus padding leaves small inner corners sharp, and a rule that keeps them looking concentric.",
}

export default function Page() {
  return <ConcentricRadiiShowcase />
}
