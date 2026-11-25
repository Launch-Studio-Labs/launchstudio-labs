"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type ReactNode,
} from "react"

import { CopyStateIcon } from "@/components/docs/copy-state-icon"
import { Button } from "@/components/ui/button"
import { copyText } from "@/lib/copy-text"
import { cn } from "@/lib/utils"

/** How long a copy button shows its check after a copy. */
export const COPIED_MS = 1600

/**
 * Copies `text` and reports it: `copied` turns true only once the copy went
 * through, and back to false COPIED_MS later. A second copy restarts that
 * wait rather than stacking another, and nothing fires after unmount.
 */
export function useCopy(text: string) {
  const [copied, setCopied] = useState(false)
  const timer = useRef<number>(undefined)
  const mounted = useRef(false)

  useEffect(() => {
    mounted.current = true
    return () => {
      mounted.current = false
      window.clearTimeout(timer.current)
    }
  }, [])

  const copy = useCallback(async () => {
    const ok = await copyText(text)
    if (!ok || !mounted.current) return ok
    setCopied(true)
    window.clearTimeout(timer.current)
    timer.current = window.setTimeout(() => setCopied(false), COPIED_MS)
    return true
  }, [text])

  return { copied, copy }
}

/**
 * The icon-only copy button on code and commands. Its name stays `label`
 * whatever happened; a copy is announced through a polite live region, the
 * same way the labelled copy buttons do it.
 *
 * No hover fill: on hover the icon fades a little instead, and the focus ring
 * is the button's own.
 */
export function CopyIconButton({
  text,
  label,
  className,
  onClick,
  ...props
}: {
  text: string
  /** The button's accessible name, e.g. "Copy code". */
  label: string
} & Omit<ComponentProps<typeof Button>, "children" | "aria-label">) {
  const { copied, copy } = useCopy(text)

  return (
    <>
      <Button
        variant="ghost"
        size="icon-sm"
        aria-label={label}
        onClick={(event) => {
          onClick?.(event)
          void copy()
        }}
        className={cn(
          "hover:bg-transparent dark:hover:bg-transparent *:transition-opacity *:duration-150 *:ease-out hover:*:opacity-60 motion-reduce:*:transition-none",
          className
        )}
        {...props}
      >
        <CopyStateIcon copied={copied} />
      </Button>
      <span className="sr-only" aria-live="polite">
        {copied ? "Copied" : ""}
      </span>
    </>
  )
}

/**
 * Copies the prompt, with its label beside the icon. Only the icon reacts to
 * a copy, so the button never changes size; screen readers hear it instead.
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
  const { copied, copy } = useCopy(prompt)

  return (
    <>
      <Button
        size="sm"
        variant={variant}
        onClick={() => void copy()}
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
