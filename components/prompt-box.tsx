"use client"

import { useEffect, useId, useRef, useState } from "react"
import { CaretDownIcon } from "@phosphor-icons/react"

import { CopyStateIcon, useCopy } from "@/components/copy-button"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { cn } from "@/lib/utils"

/** The prompt's type: small mono, wrapped, a step back from full ink. */
const PROMPT_TEXT =
  "font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-foreground/80"

/** Fades the last line or two of the cut-off preview into the surface. */
const FADE_OUT = "[mask-image:linear-gradient(to_bottom,black_55%,transparent)]"

/**
 * A prompt to paste into a coding assistant, presented as one block.
 *
 * The white card holds everything that belongs to the prompt: what it is
 * for, then the prompt itself on the same muted surface as the demo frames.
 * The prompt shows six lines, faded at the bottom, and opens in place so the
 * reader keeps their place on the page.
 *
 * Both controls sit in the prompt's header: expand on the left, Copy on the
 * right. Copy is the primary action and always copies the whole prompt,
 * open or not. It is `static`, so it does not shrink on press.
 *
 * The height eases between the six-line cap and the measured full height.
 * `max-height` is the one layout property animated here, and only on this
 * box, which is the thing the reader asked to grow.
 */
export function PromptBox({
  title,
  description,
  prompt,
  className,
}: {
  title: string
  description: string
  prompt: string
  className?: string
}) {
  const [open, setOpen] = useState(false)
  const [full, setFull] = useState(0)
  const textRef = useRef<HTMLPreElement>(null)
  const regionId = useId()
  const { copied, copy } = useCopy(prompt)

  useEffect(() => {
    const element = textRef.current
    if (!element) return
    const read = () => setFull(element.scrollHeight)
    read()
    const observer = new ResizeObserver(read)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])

  return (
    // Tighter on phones, so the prompt keeps a readable line length.
    <Card
      className={cn(
        "[--card-spacing:--spacing(4)] sm:[--card-spacing:--spacing(6)]",
        className
      )}
    >
      <CardHeader>
        <CardTitle>{title}</CardTitle>
        <CardDescription className="text-pretty">{description}</CardDescription>
      </CardHeader>

      <CardContent>
        <div className="flex flex-col rounded-[12px] border border-border bg-muted">
          <div className="flex items-center justify-between gap-3 border-b border-border py-2 pr-2 pl-4 sm:pl-5">
            <button
              type="button"
              aria-expanded={open}
              aria-controls={regionId}
              // Cuelume: an accordion is open / close, subtle.
              {...(open
                ? { "data-cuelume-close": "" }
                : { "data-cuelume-open": "" })}
              data-cuelume-emphasis="subtle"
              onClick={() => setOpen((value) => !value)}
              className="inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground transition-colors duration-150 ease-out outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"
            >
              <CaretDownIcon
                className={cn(
                  "size-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none",
                  open && "rotate-180"
                )}
              />
              {open ? "Show less" : "Show full prompt"}
            </button>

            <Button size="sm" static onClick={copy} aria-label="Copy prompt">
              <CopyStateIcon copied={copied} className="size-3.5" />
              {/* Fixed width, so "Copied" never resizes the button. */}
              <span className="inline-grid">
                <span className="col-start-1 row-start-1">
                  {copied ? "Copied" : "Copy"}
                </span>
                <span aria-hidden className="invisible col-start-1 row-start-1">
                  Copied
                </span>
              </span>
            </Button>
            <span aria-live="polite" className="sr-only">
              {copied ? "Prompt copied" : ""}
            </span>
          </div>

          <pre
            ref={textRef}
            id={regionId}
            style={{ maxHeight: open && full ? full : "calc(6lh + 2.5rem)" }}
            className={cn(
              PROMPT_TEXT,
              "overflow-hidden px-4 pt-4 pb-6 sm:px-5",
              "transition-[max-height] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
              !open && FADE_OUT
            )}
          >
            {prompt}
          </pre>
        </div>
      </CardContent>
    </Card>
  )
}
