"use client"

import { CheckIcon, CopyIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

const SWAP =
  "absolute inset-0 transition-[opacity,scale,filter] duration-200 ease-out"

/**
 * The copy icon, turning into a check for a moment after a copy. Only the
 * icon reacts — a label beside it stays put, so the button never changes size.
 */
export function CopyStateIcon({ copied }: { copied: boolean }) {
  return (
    <span className="relative size-4 shrink-0">
      <CopyIcon
        className={cn(
          SWAP,
          copied ? "scale-50 opacity-0 blur-[2px]" : "opacity-100"
        )}
      />
      <CheckIcon
        className={cn(
          SWAP,
          copied ? "opacity-100" : "scale-50 opacity-0 blur-[2px]"
        )}
      />
    </span>
  )
}
