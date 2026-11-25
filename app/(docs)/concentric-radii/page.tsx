import { readFile } from "node:fs/promises"
import path from "node:path"
import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { ConcentricRadiiShowcase } from "@/components/concentric-radii-showcase"

export const metadata: Metadata = {
  title: docsTitle("/concentric-radii"),
  description:
    "Why outer minus padding leaves small inner corners sharp, and a rule that keeps them looking concentric.",
}

export default async function Page() {
  // The skill as the agent reads it, minus the frontmatter, for the
  // "View skill" dialog. Read at build time; the page stays static.
  const file = await readFile(
    path.join(process.cwd(), "skills/visual-concentric-radii/SKILL.md"),
    "utf8"
  )
  const skill = file.replace(/^---\n[\s\S]*?\n---\n+/, "")
  return <ConcentricRadiiShowcase skill={skill} />
}
