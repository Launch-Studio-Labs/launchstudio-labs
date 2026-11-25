"use client"

import { useState, type ReactNode } from "react"

import { CopyStateIcon } from "@/components/docs/copy-state-icon"
import { SkillDialog } from "@/components/skill-dialog"
import { Button } from "@/components/ui/button"
import { copyText } from "@/lib/copy-text"
import { cn } from "@/lib/utils"

/** The prompt, readable before it is copied, and one obvious button. */
export function PromptCard({
  prompt,
  skill,
}: {
  prompt: string
  skill: string
}) {
  return (
    <div className="flex flex-col gap-3 rounded-xl bg-muted p-3">
      {/* Prose to paste, not code: it wraps, so it's no CodeBlock. */}
      <p className="px-2 pt-1 font-mono text-xs leading-relaxed [overflow-wrap:anywhere] whitespace-pre-wrap text-muted-foreground">
        {prompt}
      </p>
      <div className="flex flex-wrap items-center gap-2">
        <CopyPromptButton prompt={prompt}>Copy prompt</CopyPromptButton>
        <SkillDialog skill={skill} />
      </div>
    </div>
  )
}

/**
 * Copies the prompt. Only the icon reacts to a copy — the label stays, so the
 * button never changes size; screen readers hear it instead.
 */
export function CopyPromptButton({
  prompt,
  variant,
  className,
  children,
}: {
  prompt: string
  variant?: "default" | "secondary"
  className?: string
  children: ReactNode
}) {
  const [copied, setCopied] = useState(false)

  async function copy() {
    if (!(await copyText(prompt))) return
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <>
      <Button
        size="sm"
        variant={variant}
        onClick={copy}
        className={cn("gap-1.5 pr-3 pl-2.5 text-xs", className)}
      >
        <CopyStateIcon copied={copied} />
        {children}
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Prompt copied" : ""}
      </span>
    </>
  )
}
