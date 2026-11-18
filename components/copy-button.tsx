"use client"

import { useEffect, useRef, useState, type ComponentProps } from "react"
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { cue } from "@/lib/sounds"
import { cn } from "@/lib/utils"

/** How long "Copied" stays up before going back to "Copy". */
const COPIED_MS = 1600

/**
 * Copies `text` and reports it for a moment. `copied` only turns on once the
 * clipboard write has actually succeeded; another copy restarts the timer
 * rather than stacking a second one, and the timer is cleared on unmount.
 */
export function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number | undefined>(undefined)

  useEffect(() => () => window.clearTimeout(timer.current), [])

  async function copy() {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      return false
    }
    // Cuelume: copy to clipboard is `success`, subtle, and only once it landed.
    cue("success", { emphasis: "subtle" })
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), COPIED_MS)
    return true
  }

  return { copied, copy }
}

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
 * The copy icon, trading places with a check once copied. Both icons share
 * one box, so whatever holds this never changes width.
 */
export function CopyStateIcon({
  copied,
  className,
}: {
  copied: boolean
  className?: string
}) {
  return (
    <span className={cn("relative size-4 shrink-0", className)}>
      <SwapIcon shown={!copied}>
        <CopyIcon className="size-full" />
      </SwapIcon>
      <SwapIcon shown={copied}>
        <CheckIcon className="size-full" />
      </SwapIcon>
    </span>
  )
}

/** A full button that copies `text`. */
export function CopyButton({
  text,
  ...props
}: { text: string } & Omit<ComponentProps<typeof Button>, "onClick">) {
  const { copied, copy } = useCopy(text)

  return (
    <Button size="lg" onClick={copy} {...props}>
      <CopyStateIcon copied={copied} />
      <span aria-live="polite">{copied ? "Copied" : "Copy"}</span>
    </Button>
  )
}
