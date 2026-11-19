"use client"

import { useEffect, useRef, useState, type ComponentProps } from "react"
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/**
 * A snippet to copy. The button sits in the top-right corner, over the code's
 * own padding, and long lines wrap rather than scroll, so no line ever runs
 * under it.
 */
export function CodeBlock({
  code,
  className,
  ...props
}: { code: string } & Omit<ComponentProps<"div">, "children">) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  function copy() {
    void navigator.clipboard.writeText(code)
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <div className={cn("relative", className)} {...props}>
      <pre className="rounded-lg bg-muted py-3.5 pr-12 pl-4 font-mono text-xs leading-normal [overflow-wrap:anywhere] whitespace-pre-wrap">
        <code>{code}</code>
      </pre>
      <Button
        aria-label={copied ? "Copied" : "Copy code"}
        variant="ghost"
        size="icon-sm"
        onClick={copy}
        className="absolute top-1.5 right-1.5 text-muted-foreground hover:bg-background"
      >
        {copied ? <CheckIcon /> : <CopyIcon />}
      </Button>
    </div>
  )
}
