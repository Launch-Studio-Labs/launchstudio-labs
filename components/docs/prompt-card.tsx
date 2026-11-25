"use client"

import { CopyPromptButton } from "@/components/docs/copy-button"
import { SkillDialog } from "@/components/skill-dialog"

/** The prompt, readable before it is copied, and one obvious button. */
export function PromptCard({
  prompt,
  skill,
  skillTitle,
}: {
  prompt: string
  /** SKILL.md without its frontmatter. */
  skill: string
  /** The skill dialog's title. */
  skillTitle: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted p-3">
      {/* Prose to paste, not code: it wraps, so it's no CodeBlock. */}
      <p className="px-2 pt-1 font-mono text-xs leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-muted-foreground">
        {prompt}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <CopyPromptButton prompt={prompt}>Copy prompt</CopyPromptButton>
        <SkillDialog skill={skill} title={skillTitle} />
      </div>
    </div>
  )
}
