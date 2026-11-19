import { readdir, readFile } from "node:fs/promises"
import path from "node:path"

/**
 * The agent skills in `skills/`, served as plain files from the site, so a
 * skill can be read or downloaded from any Labs host (production or a
 * preview) without a second copy to keep in step:
 * /skills/voice-input/SKILL.md, /skills/voice-input/references/scan.md, …
 *
 * Every file is generated at build time; nothing else is served.
 */
export const dynamic = "force-static"
export const dynamicParams = false

const ROOT = path.join(process.cwd(), "skills")

async function listFiles(
  dir: string,
  prefix: string[] = []
): Promise<string[][]> {
  const entries = await readdir(dir, { withFileTypes: true })
  const nested = await Promise.all(
    entries.map((entry) =>
      entry.isDirectory()
        ? listFiles(path.join(dir, entry.name), [...prefix, entry.name])
        : entry.name.endsWith(".md")
          ? [[...prefix, entry.name]]
          : []
    )
  )
  return nested.flat()
}

export async function generateStaticParams() {
  return (await listFiles(ROOT)).map((parts) => ({ path: parts }))
}

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ path: string[] }> }
) {
  const { path: parts } = await params
  const file = path.join(ROOT, ...parts)
  // generateStaticParams is the allow-list; this guards the dev server.
  if (!file.startsWith(ROOT + path.sep) || !file.endsWith(".md")) {
    return new Response("Not found", { status: 404 })
  }
  const text = await readFile(file, "utf8").catch(() => null)
  if (text === null) return new Response("Not found", { status: 404 })
  return new Response(text, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  })
}
