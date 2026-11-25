import { readFile } from "node:fs/promises"
import path from "node:path"
import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { DictationInputShowcase } from "@/components/dictation-input-showcase"

export const metadata: Metadata = {
  title: docsTitle("/dictation-input"),
  description:
    "A normal text field with a microphone in its corner. Copy one prompt into your agent: it scans your app, asks for your OK, then installs it and builds the transcription backend.",
}

export default async function Page() {
  // The skill as the agent reads it, minus the frontmatter, for the
  // "View skill" dialog. Read at build time; the page stays static.
  const file = await readFile(
    path.join(process.cwd(), "skills/dictation-input/SKILL.md"),
    "utf8"
  )
  const skill = file.replace(/^---\n[\s\S]*?\n---\n+/, "")
  return <DictationInputShowcase skill={skill} />
}
