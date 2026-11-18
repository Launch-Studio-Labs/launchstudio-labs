"use client"

import { useState, type ComponentProps } from "react"
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

function SwapIcon({ shown, children }: { shown: boolean; children: React.ReactNode }) {
  return (
    <span
      className={cn(
        "absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
        shown ? "blur-0 scale-100 opacity-100" : "scale-[0.25] opacity-0 blur-[4px]"
      )}
    >
      {children}
    </span>
  )
}

/**
 * Copies `text` and says so for a moment. The two icons share one box and
 * trade places, so the button never changes width when its label does.
 */
export function CopyButton({
  text,
  ...props
}: { text: string } & Omit<ComponentProps<typeof Button>, "onClick">) {
  const [copied, setCopied] = useState(false)

  function copy() {
    void navigator.clipboard.writeText(text)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <Button size="lg" onClick={copy} {...props}>
      <span className="relative size-4 shrink-0">
        <SwapIcon shown={!copied}>
          <CopyIcon className="size-4" />
        </SwapIcon>
        <SwapIcon shown={copied}>
          <CheckIcon className="size-4" />
        </SwapIcon>
      </span>
      {copied ? "Copied" : "Copy"}
    </Button>
  )
}
