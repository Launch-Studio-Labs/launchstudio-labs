import { writeFile } from "node:fs/promises"
import path from "node:path"

/**
 * Dev only: the editor saves a deck's tweaks here, into
 * content/step-video/<deck>.json, so they live in the repo next to the deck.
 * The `.dev.ts` extension keeps this file out of every build but `next dev`
 * (see pageExtensions in next.config.ts).
 */
export async function POST(
  request: Request,
  { params }: { params: Promise<{ deck: string }> }
) {
  const { deck } = await params
  if (!/^[a-z0-9-]+$/.test(deck)) {
    return Response.json({ error: "bad deck id" }, { status: 400 })
  }
  const tweaks = await request.json()
  if (!tweaks || typeof tweaks !== "object" || tweaks.version !== 1) {
    return Response.json({ error: "not a tweaks file" }, { status: 400 })
  }
  const file = path.join(process.cwd(), "content", "step-video", `${deck}.json`)
  await writeFile(file, `${JSON.stringify(tweaks, null, 2)}\n`)
  return Response.json({ ok: true })
}
