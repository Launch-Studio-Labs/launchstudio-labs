import { readFile } from "node:fs/promises"
import path from "node:path"
import type { Metadata } from "next"

import { docsTitle } from "@/app/(docs)/pages"
import { ImageCropperShowcase } from "@/components/image-cropper-showcase"

export const metadata: Metadata = {
  title: docsTitle("/image-cropper"),
  description:
    "A photo cropper with a straighten dial that never shows an empty corner, and an optional AI fill for going past the photo's edges.",
}

export default async function Page() {
  // The skill as the agent reads it, minus the frontmatter, for the
  // "View skill" dialog. Read at build time; the page stays static.
  const file = await readFile(
    path.join(process.cwd(), "skills/image-cropper/SKILL.md"),
    "utf8"
  )
  const skill = file.replace(/^---\n[\s\S]*?\n---\n+/, "")
  return <ImageCropperShowcase skill={skill} />
}
