"use client"

import { useEffect, useId, useRef, useState } from "react"
import { CaretDownIcon, ArrowsOutSimpleIcon } from "@phosphor-icons/react"

import { CopyStateIcon, useCopy } from "@/components/copy-button"
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"
import { promptSections } from "@/components/weight-without-shift-prompt"
import { cn } from "@/lib/utils"

/**
 * Three takes on showing a long prompt: each shows a few lines, lets you read
 * the rest, and copies the whole thing. They sit on the same muted surface as
 * the demo frames, so the page has one kind of box.
 */
const SURFACE = "rounded-[12px] border border-border bg-muted"

/** The prompt's type: small mono, wrapped, a step back from full ink. */
const PROMPT_TEXT =
  "font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-foreground/80"

/** Small text actions, so nothing on the box competes with the prompt. */
const TEXT_ACTION =
  "inline-flex items-center gap-1.5 rounded-sm text-xs text-muted-foreground outline-none transition-colors duration-150 ease-out hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none"

/** Fades the last line or two of a cut-off preview into the surface. */
const FADE_OUT = "[mask-image:linear-gradient(to_bottom,black_55%,transparent)]"

/** What a screen reader hears when a copy lands. */
function CopiedAnnouncement({ copied }: { copied: boolean }) {
  return (
    <span aria-live="polite" className="sr-only">
      {copied ? "Prompt copied" : ""}
    </span>
  )
}

/**
 * Concept A: peek and expand in place.
 *
 * Six lines, faded at the bottom. "Show full prompt" opens the box where it
 * is, so you keep your place on the page; "Copy" sits beside it and copies
 * the whole prompt whether the box is open or not.
 *
 * The height eases between the six-line cap and the measured full height.
 * `max-height` is the one layout property animated here, and only on this
 * box, which is the thing the reader asked to grow.
 */
export function PromptPeek({ prompt }: { prompt: string }) {
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
    <div className={cn(SURFACE, "flex flex-col")}>
      <pre
        ref={textRef}
        id={regionId}
        style={{ maxHeight: open && full ? full : "calc(6lh + 2.5rem)" }}
        className={cn(
          PROMPT_TEXT,
          "overflow-hidden px-4 pt-4 pb-6 sm:px-5 sm:pt-5",
          "transition-[max-height] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
          !open && FADE_OUT
        )}
      >
        {prompt}
      </pre>

      <div className="flex items-center justify-between border-t border-border px-4 py-3 sm:px-5">
        <button
          type="button"
          aria-expanded={open}
          aria-controls={regionId}
          onClick={() => setOpen((value) => !value)}
          className={TEXT_ACTION}
        >
          <CaretDownIcon
            className={cn(
              "size-3.5 transition-transform duration-200 ease-out motion-reduce:transition-none",
              open && "rotate-180"
            )}
          />
          {open ? "Show less" : "Show full prompt"}
        </button>
        <button type="button" onClick={copy} className={TEXT_ACTION}>
          <CopyStateIcon copied={copied} className="size-3.5" />
          {copied ? "Copied" : "Copy"}
        </button>
        <CopiedAnnouncement copied={copied} />
      </div>
    </div>
  )
}

/**
 * Concept B: the preview is the copy button; reading happens in a sheet.
 *
 * Copying is the thing most people come for, so it is the biggest target:
 * click anywhere on the six-line preview and the whole prompt is on your
 * clipboard. Reading it all is the secondary path: "Read full prompt" opens
 * a side sheet with the full text and its own copy action, so the page
 * itself never grows.
 */
export function PromptClickToCopy({ prompt }: { prompt: string }) {
  const { copied, copy } = useCopy(prompt)

  return (
    <div className={cn(SURFACE, "flex flex-col")}>
      <div className="flex items-center justify-between px-4 pt-3 sm:px-5">
        <span className="text-xs text-muted-foreground">
          Click the prompt to copy it
        </span>
        <Sheet>
          <SheetTrigger className={TEXT_ACTION}>
            <ArrowsOutSimpleIcon className="size-3.5" />
            Read full prompt
          </SheetTrigger>
          <SheetContent className="w-full gap-0 data-[side=right]:w-full data-[side=right]:sm:max-w-xl">
            <SheetHeader className="gap-1 border-b border-border pr-14">
              <SheetTitle>Find and fix weight shifts</SheetTitle>
              <SheetDescription>
                Paste into Claude Code, Cursor, Copilot or any coding assistant.
              </SheetDescription>
              <div className="pt-2">
                <button type="button" onClick={copy} className={TEXT_ACTION}>
                  <CopyStateIcon copied={copied} className="size-3.5" />
                  {copied ? "Copied" : "Copy prompt"}
                </button>
              </div>
            </SheetHeader>
            <pre className={cn(PROMPT_TEXT, "flex-1 overflow-y-auto p-6")}>
              {prompt}
            </pre>
          </SheetContent>
        </Sheet>
      </div>

      <button
        type="button"
        onClick={copy}
        aria-label="Copy the full prompt"
        className="group/copy relative m-2 mt-2 rounded-[8px] text-left transition-colors duration-150 ease-out outline-none hover:bg-background/70 focus-visible:ring-[3px] focus-visible:ring-ring/50 motion-reduce:transition-none"
      >
        <pre
          aria-hidden
          className={cn(
            PROMPT_TEXT,
            "max-h-[calc(6lh+1.5rem)] overflow-hidden px-2 pt-2 pb-4 sm:px-3",
            FADE_OUT
          )}
        >
          {prompt}
        </pre>
        <span
          aria-hidden
          className={cn(
            "absolute right-2 bottom-2 inline-flex items-center gap-1.5 rounded-full bg-background px-2.5 py-1 text-[11px] text-muted-foreground shadow-[inset_0_0_0_1px_var(--color-border)] transition-[opacity,color] duration-150 ease-out motion-reduce:transition-none",
            copied
              ? "text-foreground opacity-100"
              : "opacity-0 group-hover/copy:opacity-100 group-focus-visible/copy:opacity-100 [@media(hover:none)]:opacity-100"
          )}
        >
          <CopyStateIcon copied={copied} className="size-3" />
          {copied ? "Copied" : "Copy"}
        </span>
      </button>
      <CopiedAnnouncement copied={copied} />
    </div>
  )
}

/**
 * Concept C: an outline you open one step at a time.
 *
 * The prompt has a shape (the problem, four steps, an example), so this box
 * shows that shape instead of a wall of text: the opening lines, then one
 * row per section. Open the step you care about, or all of them. "Copy
 * prompt" lives in the header and always copies the whole prompt, however
 * much of it is open.
 *
 * Each section opens with the 0fr to 1fr grid-row trick, so the height
 * animates to the content's real size without measuring it.
 */
export function PromptOutline({ prompt }: { prompt: string }) {
  const { intro, sections } = promptSections(prompt)
  const [open, setOpen] = useState<boolean[]>(() => sections.map(() => false))
  const { copied, copy } = useCopy(prompt)
  const baseId = useId()
  const allOpen = open.every(Boolean)

  return (
    <div className={cn(SURFACE, "flex flex-col")}>
      <div className="flex items-center justify-between gap-4 border-b border-border px-4 py-3 sm:px-5">
        <span className="text-xs text-muted-foreground">
          {sections.length} sections
        </span>
        <div className="flex items-center gap-4">
          <button
            type="button"
            onClick={() => setOpen(sections.map(() => !allOpen))}
            className={TEXT_ACTION}
          >
            {allOpen ? "Collapse all" : "Expand all"}
          </button>
          <button type="button" onClick={copy} className={TEXT_ACTION}>
            <CopyStateIcon copied={copied} className="size-3.5" />
            {copied ? "Copied" : "Copy prompt"}
          </button>
          <CopiedAnnouncement copied={copied} />
        </div>
      </div>

      <p className={cn(PROMPT_TEXT, "px-4 pt-4 pb-3 sm:px-5")}>{intro}</p>

      <ul className="flex flex-col px-2 pb-2">
        {sections.map((section, index) => {
          const isOpen = open[index]
          const panelId = `${baseId}-${index}`
          return (
            <li key={section.title} className="border-t border-border/70">
              <button
                type="button"
                aria-expanded={isOpen}
                aria-controls={panelId}
                onClick={() =>
                  setOpen((current) =>
                    current.map((value, i) => (i === index ? !value : value))
                  )
                }
                className="flex w-full items-center justify-between gap-3 rounded-[6px] px-2 py-2.5 text-left font-mono text-xs text-foreground transition-colors duration-150 ease-out outline-none hover:bg-background/60 focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none sm:px-3"
              >
                {section.title}
                <CaretDownIcon
                  className={cn(
                    "size-3.5 shrink-0 text-muted-foreground transition-transform duration-200 ease-out motion-reduce:transition-none",
                    isOpen && "rotate-180"
                  )}
                />
              </button>
              <div
                id={panelId}
                inert={!isOpen}
                className={cn(
                  "grid transition-[grid-template-rows] duration-300 ease-[cubic-bezier(0.23,1,0.32,1)] motion-reduce:transition-none",
                  isOpen ? "grid-rows-[1fr]" : "grid-rows-[0fr]"
                )}
              >
                <div className="overflow-hidden">
                  <pre className={cn(PROMPT_TEXT, "px-2 pt-1 pb-4 sm:px-3")}>
                    {section.body}
                  </pre>
                </div>
              </div>
            </li>
          )
        })}
      </ul>
    </div>
  )
}
