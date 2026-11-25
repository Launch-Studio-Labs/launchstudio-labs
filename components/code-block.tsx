"use client"

import { useEffect, useRef, useState, type ComponentProps } from "react"

import { CopyStateIcon } from "@/components/docs/copy-state-icon"
import { Button } from "@/components/ui/button"
import {
  CodeBlockContent,
  CodeBlockLine,
  CodeBlock as CodeBlockRoot,
} from "@/components/ui/code-block"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"
import { copyText } from "@/lib/copy-text"

/** Copied → check for a moment, then back. */
function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(undefined)
  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    if (!(await copyText(text))) return
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1600)
  }
  return [copied, copy] as const
}

/**
 * Code to read or copy, on shadcn's Code Block (components/ui/code-block.tsx,
 * the only place a `<pre>` is allowed; lint enforces it). Shiki highlights it
 * in `language`; until the grammar loads, and for a language the highlighter
 * doesn't list, it shows as plain text. The copy button is the same one the
 * install command has: always shown, in the corner, over the code's padding.
 */
export function CodeBlock({
  code,
  language = "tsx",
  copyable = true,
  ...props
}: {
  code: string
  /** A language or alias from lib/highlighter.tsx, e.g. "tsx" or "css". */
  language?: string
  copyable?: boolean
} & Omit<ComponentProps<typeof CodeBlockRoot>, "children">) {
  const lines = useHighlightedCode(code, language)
  const [copied, copy] = useCopy(code)

  return (
    <CodeBlockRoot size="sm" {...props}>
      {copyable && (
        <Button
          variant="ghost"
          size="icon-sm"
          aria-label={copied ? "Copied" : "Copy code"}
          onClick={() => void copy()}
          className="absolute top-1.5 right-1.5 z-10"
        >
          <CopyStateIcon copied={copied} />
        </Button>
      )}
      <CodeBlockContent
        className={
          copyable ? "group-data-[size=sm]/code-block:pe-12" : undefined
        }
      >
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
    </CodeBlockRoot>
  )
}

/** One command on one line, with a copy button: an install step. */
export function Command({ text }: { text: string }) {
  const [copied, copy] = useCopy(text)

  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted py-1.5 pr-1.5 pl-4">
      <code className="min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto py-1.5 font-mono text-xs whitespace-nowrap text-muted-foreground">
        {text}
      </code>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={copied ? "Copied" : "Copy command"}
        onClick={() => void copy()}
      >
        <CopyStateIcon copied={copied} />
      </Button>
    </div>
  )
}
