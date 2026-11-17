"use client"

import {
  useEffect,
  useState,
  type ComponentProps,
  type PointerEvent,
} from "react"

import { DemoFrame } from "@/components/demos/demo-frame"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const LABEL = "Continue"

/**
 * Long enough for the heavier face to read on a recording, short enough that
 * the idle label is what the loop spends most of its time on.
 */
const REPLAY_HOLD_MS = 560
const REPLAY_REST_MS = 1200

/**
 * The heavier drawing is wider than the resting one. Both copies share one
 * grid cell, so the cell is born at the heavier width and the press never
 * reflows. `clip-path: inset(0)` then keeps that heavier ink from spilling
 * past the cell into the scrollable overflow.
 *
 * Weight is `font-weight`, which drives the `wght` axis on a variable font
 * (Geist here) and still resolves when a static face is what renders.
 * `font-variation-settings: "wght"` would set the same axis and then do
 * nothing on a fallback.
 *
 * The overlay eases in (opacity and a small scale) and the resting face eases
 * out, so a held press is one drawing. The resting weight never changes, and
 * the cell is already the heavier width, so the box does not reflow.
 */
const overlayClassName = cn(
  "pointer-events-none col-start-1 row-start-1 [font-weight:650] [clip-path:inset(0)]",
  "scale-[0.98] opacity-0",
  "transition-[opacity,scale] duration-200 ease-out",
  "group-active/button:scale-100 group-active/button:opacity-100",
  "group-data-[pressed=true]/button:scale-100 group-data-[pressed=true]/button:opacity-100",
  "motion-reduce:transition-none"
)

export function BolderOnPressDemo({
  className,
  ...props
}: ComponentProps<"div">) {
  const [replay, setReplay] = useState(false)
  const [simulated, setSimulated] = useState(false)
  const [held, setHeld] = useState(false)

  useEffect(() => {
    if (!replay) return

    let timeout = 0
    const step = (pressed: boolean) => {
      setSimulated(pressed)
      timeout = window.setTimeout(
        () => step(!pressed),
        pressed ? REPLAY_HOLD_MS : REPLAY_REST_MS
      )
    }

    // Open on the resting face, then press. A recording can start on idle.
    timeout = window.setTimeout(() => step(true), REPLAY_REST_MS)
    return () => window.clearTimeout(timeout)
  }, [replay])

  const pressed = held || (replay && simulated)

  function hold(event: PointerEvent<HTMLButtonElement>) {
    if (event.button !== 0) return
    // Capture so a finger on glass keeps the heavier face up for the whole
    // press. Safari drops :active inside a scrolling page as soon as the
    // gesture might scroll; pointerup and pointercancel are what release it.
    event.currentTarget.setPointerCapture(event.pointerId)
    setHeld(true)
  }

  function release(event: PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setHeld(false)
  }

  return (
    <div
      className={cn(
        "flex w-content max-w-full flex-col items-center gap-6",
        className
      )}
      {...props}
    >
      <div className="flex w-full items-center">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none">
          <Switch
            size="sm"
            checked={replay}
            onCheckedChange={(checked) => {
              setReplay(checked)
              if (!checked) setSimulated(false)
            }}
          />
          Replay
        </label>
      </div>

      {/* The stage is the button. Padding gives a recording room to crop
          to the label without catching the switch above. */}
      <DemoFrame className="w-full px-6 py-16 sm:py-20">
        <Button
          static
          variant="outline"
          data-pressed={pressed ? "true" : undefined}
          onPointerDown={hold}
          onPointerUp={release}
          onPointerCancel={release}
          onKeyDown={(event) => {
            if (event.key === " " || event.key === "Enter") setHeld(true)
          }}
          onKeyUp={(event) => {
            if (event.key === " " || event.key === "Enter") setHeld(false)
          }}
          onBlur={() => setHeld(false)}
          className="h-auto touch-manipulation rounded-full px-8 py-6 text-[2.25rem] leading-none font-normal tracking-tight sm:px-12 sm:py-7 sm:text-[2.75rem]"
        >
          <span className="inline-grid place-items-center whitespace-nowrap">
            {/* The resting face leaves as the heavier one arrives, so a held
                press is one drawing. The cell stays the heavier width. */}
            <span
              className={cn(
                "col-start-1 row-start-1 font-normal",
                "transition-opacity duration-200 ease-out",
                "group-active/button:opacity-0 group-data-[pressed=true]/button:opacity-0",
                "motion-reduce:transition-none"
              )}
            >
              {LABEL}
            </span>
            <span aria-hidden="true" className={overlayClassName}>
              {LABEL}
            </span>
          </span>
        </Button>
      </DemoFrame>
    </div>
  )
}
