"use client"

import { useEffect, useRef, useState, type ComponentProps } from "react"

import { CopyStateIcon } from "@/components/docs/copy-state-icon"
import { Button } from "@/components/ui/button"
import { copyText } from "@/lib/copy-text"
import { cn } from "@/lib/utils"

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
 * Code to read or copy — the only place a `<pre>` is allowed (lint enforces
 * it). The padding sits on the box and the scroll on the code inside it, so
 * the scrollbar runs under the code within the box's edges, on a transparent
 * track. The copy button sits in the corner, over the box's own padding.
 */
export function CodeBlock({
  code,
  copyable = true,
  className,
  ...props
}: {
  code: string
  copyable?: boolean
} & Omit<ComponentProps<"div">, "children">) {
  const [copied, copy] = useCopy(code)

  return (
    <div
      className={cn(
        "relative rounded-lg bg-muted py-4 pl-4",
        copyable ? "pr-12" : "pr-4",
        className
      )}
      {...props}
    >
      <pre className="[scrollbar-width:thin] [scrollbar-color:color-mix(in_oklab,var(--color-foreground)_20%,transparent)_transparent] overflow-x-auto pb-2 font-mono text-xs leading-normal">
        <code>{code}</code>
      </pre>
      {copyable && (
        <Button
          aria-label={copied ? "Copied" : "Copy code"}
          variant="ghost"
          size="icon-sm"
          onClick={() => void copy()}
          className="absolute top-2 right-2 text-muted-foreground hover:bg-background"
        >
          <CopyStateIcon copied={copied} />
        </Button>
      )}
    </div>
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
