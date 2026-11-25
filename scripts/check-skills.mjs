// Agent skill files stay plain (DESIGN.md › Copy): no emoji, no `---` rule
// outside the frontmatter, no blockquotes, no em or en dashes. Run by
// `pnpm lint`.
import { readdirSync, readFileSync, statSync } from "node:fs"
import { join } from "node:path"

const ROOT = "skills"
const EMOJI = /\p{Extended_Pictographic}/u
const DASH = /[\u2013\u2014]/

function files(dir) {
  return readdirSync(dir).flatMap((name) => {
    const path = join(dir, name)
    return statSync(path).isDirectory() ? files(path) : path.endsWith(".md") ? [path] : []
  })
}

const problems = []
for (const file of files(ROOT)) {
  const lines = readFileSync(file, "utf8").split("\n")
  // Frontmatter: a `---` first line, up to the next `---`.
  let frontmatterEnd = -1
  if (lines[0] === "---") frontmatterEnd = lines.indexOf("---", 1)
  let fence = false
  lines.forEach((line, index) => {
    if (/^\s*(```|~~~)/.test(line)) fence = !fence
    const where = `${file}:${index + 1}`
    if (EMOJI.test(line)) problems.push(`${where}  emoji`)
    if (DASH.test(line)) problems.push(`${where}  em/en dash`)
    if (fence) return // code samples may contain `>` and `---`
    if (index > frontmatterEnd && /^\s*(-{3,}|\*{3,}|_{3,})\s*$/.test(line)) {
      problems.push(`${where}  divider (---)`)
    }
    if (/^\s*>/.test(line)) problems.push(`${where}  blockquote`)
  })
}

if (problems.length) {
  console.error("Skill files must have no emoji, dividers, blockquotes or em/en dashes:\n")
  for (const problem of problems) console.error(`  ${problem}`)
  process.exit(1)
}
