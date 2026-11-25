"use client"

import type { ComponentProps } from "react"

import { CopyIconButton } from "@/components/docs/copy-button"
import {
  CodeBlockContent,
  CodeBlockLine,
  CodeBlock as CodeBlockRoot,
} from "@/components/ui/code-block"
import { useHighlightedCode } from "@/hooks/use-highlighted-code"
import { cn } from "@/lib/utils"

/**
 * Code to read or copy, on shadcn's Code Block (components/ui/code-block.tsx,
 * the only place a `<pre>` is allowed; lint enforces it). Shiki highlights it
 * in `language`; until the grammar loads, and for a language the highlighter
 * doesn't list, it shows as plain text.
 *
 * The copy button has a column of its own beside the code, 6px in from the
 * top and right like the install command's, so long lines and the scroll fade
 * end before it rather than running underneath.
 */
export function CodeBlock({
  code,
  language = "tsx",
  copyable = true,
  className,
  ...props
}: {
  code: string
  /** A language or alias from lib/highlighter.tsx, e.g. "tsx" or "css". */
  language?: string
  copyable?: boolean
} & Omit<ComponentProps<typeof CodeBlockRoot>, "children">) {
  const lines = useHighlightedCode(code, language)

  return (
    <CodeBlockRoot
      size="sm"
      className={cn("flex-row items-start", className)}
      {...props}
    >
      <CodeBlockContent className="flex-1">
        {lines.map((line, index) => (
          <CodeBlockLine key={index}>{line}</CodeBlockLine>
        ))}
      </CodeBlockContent>
      {copyable && (
        <div className="shrink-0 p-1.5">
          <CopyIconButton text={code} label="Copy code" />
        </div>
      )}
    </CodeBlockRoot>
  )
}

/** One command on one line, with a copy button: an install step. */
export function Command({ text }: { text: string }) {
  return (
    <div className="flex items-center gap-3 rounded-lg bg-muted py-1.5 pr-1.5 pl-4">
      <code className="min-w-0 flex-1 [scrollbar-width:none] overflow-x-auto py-1.5 font-mono text-xs whitespace-nowrap text-muted-foreground">
        {text}
      </code>
      <CopyIconButton text={text} label="Copy command" />
    </div>
  )
}
