"use client"

import { useEffect, useRef, useState, type ComponentProps } from "react"
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

/** How long "Copied" stays up before the button goes back to "Copy". */
const COPIED_MS = 1600

function SwapIcon({
  shown,
  children,
}: {
  shown: boolean
  children: React.ReactNode
}) {
  return (
    <span
      className={cn(
        "absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)] motion-reduce:transition-none",
        shown
          ? "blur-0 scale-100 opacity-100"
          : "scale-[0.25] opacity-0 blur-[4px]"
      )}
    >
      {children}
    </span>
  )
}

/**
 * Copies `text` and says so for a moment. The two icons share one box and
 * trade places, so the button never changes width when its label does.
 *
 * "Copied" only shows once the clipboard write has actually succeeded. A
 * second click restarts the timer rather than stacking another one, and the
 * timer is cleared on unmount.
 */
export function CopyButton({
  text,
  ...props
}: { text: string } & Omit<ComponentProps<typeof Button>, "onClick">) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return
    }
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), COPIED_MS)
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
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </Button>
  )
}
