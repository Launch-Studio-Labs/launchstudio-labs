"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  useSyncExternalStore,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import {
  ArrowCounterClockwiseIcon,
  CheckIcon,
  CopyIcon,
  SlidersHorizontalIcon,
  XIcon,
} from "@phosphor-icons/react"

import {
  GLOBAL_DIALS,
  STYLE_DIALS,
  STYLE_NAMES,
  mergeTuning,
  type Dial,
  type DialGroup,
} from "@/components/dev/dials-schema"
import {
  DEFAULT_TUNING,
  getTuning,
  setTuning,
  subscribeTuning,
  type TunedStyleId,
  type Tuning,
} from "@/components/empty-states/tuning"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

/**
 * Dials: a floating panel for tuning each empty-state style by hand.
 *
 * Local dev only. It is mounted through `dials-gate.tsx`, which imports this
 * file behind `process.env.NODE_ENV === "development"`, so a production or
 * preview build never emits it.
 *
 * Every dial writes straight into the tuning store the art reads from, so the
 * picture answers as the value moves. Values persist for the browser session;
 * Reset puts them back. Backtick (`) shows and hides the panel.
 */

const STORAGE_KEY = "labs:empty-state-dials"
const STYLE_IDS = Object.keys(STYLE_NAMES) as TunedStyleId[]

type Values = Record<string, unknown>

function useTuningSnapshot() {
  return useSyncExternalStore(subscribeTuning, getTuning, () => DEFAULT_TUNING)
}

function decimals(step: number) {
  const text = String(step)
  return text.includes(".") ? text.split(".")[1].length : 0
}

function snap(value: number, dial: Extract<Dial, { kind: "range" }>) {
  const stepped =
    Math.round((value - dial.min) / dial.step) * dial.step + dial.min
  const clamped = Math.min(Math.max(stepped, dial.min), dial.max)
  return Number(clamped.toFixed(decimals(dial.step)))
}

/* ------------------------------------------------------------------------ */
/* Controls                                                                 */
/* ------------------------------------------------------------------------ */

/**
 * A scrub dial: the whole row is the control. Drag sideways to change the
 * value relative to where it was (Shift for a tenth of the speed), so a click
 * never makes it jump. Arrow keys step it, Shift+arrow steps ten. Double-click
 * puts it back to its default. The fill shows where it sits in its range; a
 * dot by the label means it has moved off its default.
 */
function RangeDial({
  dial,
  value,
  fallback,
  onChange,
}: {
  dial: Extract<Dial, { kind: "range" }>
  value: number
  fallback: number
  onChange: (value: number) => void
}) {
  const drag = useRef<{ x: number; value: number; width: number } | null>(null)
  const [dragging, setDragging] = useState(false)
  const span = dial.max - dial.min
  const share = Math.min(Math.max((value - dial.min) / span, 0), 1)
  const changed = value !== fallback

  const onPointerDown = (event: PointerEvent<HTMLDivElement>) => {
    if (event.button !== 0) return
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      x: event.clientX,
      value,
      width: event.currentTarget.getBoundingClientRect().width,
    }
    setDragging(true)
  }

  const onPointerMove = (event: PointerEvent<HTMLDivElement>) => {
    const start = drag.current
    if (!start) return
    const fine = event.shiftKey ? 0.1 : 1
    const moved = ((event.clientX - start.x) / start.width) * span * fine
    onChange(snap(start.value + moved, dial))
  }

  const onPointerUp = () => {
    drag.current = null
    setDragging(false)
  }

  const onKeyDown = (event: KeyboardEvent<HTMLDivElement>) => {
    const step = dial.step * (event.shiftKey ? 10 : 1)
    const keys: Record<string, number> = {
      ArrowRight: value + step,
      ArrowUp: value + step,
      ArrowLeft: value - step,
      ArrowDown: value - step,
      Home: dial.min,
      End: dial.max,
    }
    if (event.key in keys) {
      event.preventDefault()
      onChange(snap(keys[event.key], dial))
    }
  }

  return (
    <div
      role="slider"
      tabIndex={0}
      aria-label={dial.label}
      aria-valuemin={dial.min}
      aria-valuemax={dial.max}
      aria-valuenow={value}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onPointerCancel={onPointerUp}
      onKeyDown={onKeyDown}
      onDoubleClick={() => onChange(fallback)}
      data-dragging={dragging || undefined}
      className="group/dial relative flex h-7 cursor-ew-resize touch-none items-center justify-between overflow-hidden rounded-md bg-foreground/[0.035] px-2.5 outline-none select-none hover:bg-foreground/[0.055] focus-visible:ring-2 focus-visible:ring-ring/50 data-dragging:bg-foreground/[0.07]"
    >
      {/* Fill and needle track the pointer 1:1, so neither eases. */}
      <span
        aria-hidden
        style={{ width: `${share * 100}%` }}
        className="absolute inset-y-0 left-0 bg-foreground/[0.06]"
      />
      <span
        aria-hidden
        style={{ left: `calc(${share * 100}% - ${share}px)` }}
        className="absolute inset-y-1.5 w-px bg-foreground/35 group-data-dragging/dial:bg-foreground"
      />
      <span className="relative flex min-w-0 items-center gap-1.5 truncate text-foreground/80">
        <span
          aria-hidden
          className={cn(
            "size-1 shrink-0 rounded-full bg-foreground transition-opacity duration-150",
            changed ? "opacity-100" : "opacity-0"
          )}
        />
        {dial.label}
      </span>
      <span
        className={cn(
          "relative shrink-0 pl-2 tabular-nums",
          changed ? "text-foreground" : "text-muted-foreground"
        )}
      >
        {value.toFixed(decimals(dial.step))}
        {dial.unit ? (
          <span className="ml-0.5 text-muted-foreground">{dial.unit}</span>
        ) : null}
      </span>
    </div>
  )
}

function ToggleDial({
  dial,
  value,
  onChange,
}: {
  dial: Extract<Dial, { kind: "toggle" }>
  value: boolean
  onChange: (value: boolean) => void
}) {
  return (
    <label className="flex h-7 cursor-pointer items-center justify-between rounded-md px-2.5 text-foreground/80 select-none hover:bg-foreground/[0.035]">
      {dial.label}
      <Switch size="sm" checked={value} onCheckedChange={onChange} />
    </label>
  )
}

/** A small segmented control. Instant: it's a value, not a transition. */
function Segmented<T extends string>({
  label,
  value,
  options,
  onChange,
  className,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
  className?: string
}) {
  return (
    <div
      role="radiogroup"
      aria-label={label}
      className={cn("flex rounded-md bg-foreground/[0.05] p-0.5", className)}
    >
      {options.map((option) => {
        const active = option.value === value
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            onClick={() => onChange(option.value)}
            className={cn(
              "h-6 flex-1 rounded-[5px] px-2 whitespace-nowrap transition-[color,background-color,box-shadow,scale] duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97]",
              active
                ? "bg-background text-foreground shadow-[0_0_0_1px_oklch(0_0_0/0.06),0_1px_2px_oklch(0_0_0/0.06)]"
                : "text-muted-foreground hover:text-foreground"
            )}
          >
            {option.label}
          </button>
        )
      })}
    </div>
  )
}

function ChoiceDial({
  dial,
  value,
  onChange,
}: {
  dial: Extract<Dial, { kind: "choice" }>
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex h-7 items-center justify-between gap-3 pl-2.5 text-foreground/80">
      {dial.label}
      <Segmented
        label={dial.label}
        value={value}
        options={dial.options}
        onChange={onChange}
        className="w-40"
      />
    </div>
  )
}

function Group({
  group,
  values,
  defaults,
  onChange,
}: {
  group: DialGroup
  values: Values
  defaults: Values
  onChange: (key: string, value: unknown) => void
}) {
  return (
    <section className="flex flex-col gap-1">
      <h3 className="px-2.5 pb-0.5 text-[11px] font-medium text-muted-foreground">
        {group.title}
      </h3>
      {group.dials.map((dial) => {
        const value = values[dial.key]
        if (dial.kind === "range") {
          return (
            <RangeDial
              key={dial.key}
              dial={dial}
              value={value as number}
              fallback={defaults[dial.key] as number}
              onChange={(next) => onChange(dial.key, next)}
            />
          )
        }
        if (dial.kind === "toggle") {
          return (
            <ToggleDial
              key={dial.key}
              dial={dial}
              value={value as boolean}
              onChange={(next) => onChange(dial.key, next)}
            />
          )
        }
        return (
          <ChoiceDial
            key={dial.key}
            dial={dial}
            value={value as string}
            onChange={(next) => onChange(dial.key, next)}
          />
        )
      })}
    </section>
  )
}

/** A quiet footer action with press feedback. */
function Action({
  onClick,
  children,
  title,
}: {
  onClick: () => void
  children: React.ReactNode
  title?: string
}) {
  return (
    <button
      type="button"
      title={title}
      onClick={onClick}
      className="flex h-7 items-center gap-1.5 rounded-md px-2 text-muted-foreground transition-[color,background-color,scale] duration-150 ease-out outline-none hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.97] [&_svg]:size-3.5"
    >
      {children}
    </button>
  )
}

/* ------------------------------------------------------------------------ */
/* The panel                                                                */
/* ------------------------------------------------------------------------ */

type Stored = { open: boolean; tuning: Tuning }

function readStored(): Stored | null {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY)
    if (!raw) return null
    const parsed = JSON.parse(raw) as Partial<Stored>
    return {
      open: parsed.open !== false,
      tuning: mergeTuning(DEFAULT_TUNING, parsed.tuning),
    }
  } catch {
    return null
  }
}

function isTyping(target: EventTarget | null) {
  const element = target as HTMLElement | null
  if (!element) return false
  return (
    element.isContentEditable ||
    ["INPUT", "TEXTAREA", "SELECT"].includes(element.tagName)
  )
}

export function DialsPanel() {
  const tuning = useTuningSnapshot()
  const [open, setOpen] = useState(true)
  const [copied, setCopied] = useState(false)
  const openRef = useRef(true)
  const copiedTimer = useRef<number | undefined>(undefined)

  // Saving always reads live values, never a render's snapshot: in dev,
  // StrictMode mounts effects twice, and a save from a stale snapshot would
  // overwrite the session between the two restores.
  const save = useCallback(() => {
    try {
      sessionStorage.setItem(
        STORAGE_KEY,
        JSON.stringify({ open: openRef.current, tuning: getTuning() })
      )
    } catch {
      // Storage full or blocked: the dials still work for this page.
    }
  }, [])

  const show = useCallback(
    (next: boolean) => {
      openRef.current = next
      setOpen(next)
      save()
    },
    [save]
  )

  // Restore the session's dials, then save on every change after that.
  useEffect(() => {
    const stored = readStored()
    if (stored) {
      openRef.current = stored.open
      setTuning(stored.tuning)
      // eslint-disable-next-line react-hooks/set-state-in-effect -- one-time restore from sessionStorage, which the server can't read
      setOpen(stored.open)
    }
    return subscribeTuning(save)
  }, [save])

  // Backtick toggles. Not animated: it's a keyboard action, so it is instant.
  useEffect(() => {
    const onKey = (event: globalThis.KeyboardEvent) => {
      if (event.key !== "`" || event.metaKey || event.ctrlKey || event.altKey)
        return
      if (isTyping(event.target)) return
      event.preventDefault()
      show(!openRef.current)
    }
    window.addEventListener("keydown", onKey)
    return () => window.removeEventListener("keydown", onKey)
  }, [show])

  useEffect(() => () => window.clearTimeout(copiedTimer.current), [])

  const focus = tuning.focus
  const values = tuning.styles[focus] as Values
  const defaults = DEFAULT_TUNING.styles[focus] as Values

  const setStyleValue = useCallback((key: string, value: unknown) => {
    const now = getTuning()
    setTuning({
      ...now,
      styles: {
        ...now.styles,
        [now.focus]: { ...now.styles[now.focus], [key]: value },
      },
    })
  }, [])

  const setGlobalValue = useCallback((key: string, value: unknown) => {
    const now = getTuning()
    setTuning({ ...now, global: { ...now.global, [key]: value } })
  }, [])

  const setFocus = (id: TunedStyleId) =>
    setTuning({ ...getTuning(), focus: id })

  const resetStyle = () => {
    const now = getTuning()
    setTuning({
      ...now,
      styles: { ...now.styles, [now.focus]: DEFAULT_TUNING.styles[now.focus] },
    })
  }

  const resetAll = () =>
    setTuning({ ...DEFAULT_TUNING, focus: getTuning().focus })

  const copy = () => {
    const now = getTuning()
    const payload = {
      style: now.focus,
      params: now.styles[now.focus],
      page: now.global,
    }
    void navigator.clipboard.writeText(JSON.stringify(payload, null, 2))
    setCopied(true)
    window.clearTimeout(copiedTimer.current)
    copiedTimer.current = window.setTimeout(() => setCopied(false), 1400)
  }

  const styleChanged = JSON.stringify(values) !== JSON.stringify(defaults)

  // The page's own keyframes have no clock to slow, so the reduced-motion
  // preview and a held clock stop them directly.
  const loopStyle =
    tuning.global.reducedPreview || tuning.global.speed === 0
      ? `.es-sweep,.es-scan,.es-jolt,.es-pulse{animation-play-state:paused!important}${
          tuning.global.reducedPreview
            ? ".es-swap{animation-name:es-fade!important}"
            : ""
        }`
      : ""

  if (!open) {
    return (
      <>
        {loopStyle ? <style>{loopStyle}</style> : null}
        <button
          type="button"
          onClick={() => show(true)}
          aria-label="Show dials (`)"
          title="Show dials (`)"
          className="fixed top-3 right-3 z-[100] flex size-9 items-center justify-center rounded-full bg-popover text-foreground smooth-shadow-ring-sm transition-[scale] duration-150 ease-out outline-none focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.96]"
        >
          <SlidersHorizontalIcon className="size-4" />
        </button>
      </>
    )
  }

  return (
    <>
      {loopStyle ? <style>{loopStyle}</style> : null}
      <aside
        aria-label="Dials"
        className="fixed top-3 right-3 z-[100] flex max-h-[calc(100svh-1.5rem)] w-[284px] flex-col overflow-hidden rounded-xl bg-popover/95 text-xs text-popover-foreground smooth-shadow-ring-sm backdrop-blur-xl"
      >
        <header className="flex h-10 shrink-0 items-center justify-between pr-1.5 pl-3.5">
          <span className="flex items-center gap-2 font-medium">
            Dials
            <kbd className="rounded-[4px] bg-foreground/[0.06] px-1 font-mono text-[10px] leading-4 font-normal text-muted-foreground">
              `
            </kbd>
          </span>
          <button
            type="button"
            onClick={() => show(false)}
            aria-label="Hide dials"
            className="flex size-7 items-center justify-center rounded-md text-muted-foreground transition-[color,background-color,scale] duration-150 ease-out outline-none hover:bg-foreground/[0.05] hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 active:scale-[0.96]"
          >
            <XIcon className="size-3.5" />
          </button>
        </header>

        <div className="shrink-0 px-2 pb-2">
          <Segmented
            label="Style"
            value={focus}
            options={STYLE_IDS.map((id) => ({
              value: id,
              label: STYLE_NAMES[id],
            }))}
            onChange={setFocus}
          />
        </div>

        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto overscroll-contain border-t border-foreground/[0.06] px-2 pt-3 pb-3">
          {STYLE_DIALS[focus].map((group) => (
            <Group
              key={`${focus}-${group.title}`}
              group={group}
              values={values}
              defaults={defaults}
              onChange={setStyleValue}
            />
          ))}
          <div className="h-px shrink-0 bg-foreground/[0.06]" />
          <Group
            group={GLOBAL_DIALS}
            values={tuning.global as Values}
            defaults={DEFAULT_TUNING.global as Values}
            onChange={setGlobalValue}
          />
        </div>

        <footer className="flex shrink-0 items-center justify-between border-t border-foreground/[0.06] px-1.5 py-1.5">
          <div className="flex items-center">
            <Action
              onClick={resetStyle}
              title={`Put ${STYLE_NAMES[focus]} back to its defaults`}
            >
              <ArrowCounterClockwiseIcon />
              <span className={styleChanged ? "text-foreground" : undefined}>
                Reset
              </span>
            </Action>
            <Action onClick={resetAll} title="Every style and the page">
              Reset all
            </Action>
          </div>
          <Action
            onClick={copy}
            title={`Copy values as JSON: ${STYLE_NAMES[focus]} and the page`}
          >
            {/* The two icons crossfade through a slight blur, so the swap
                reads as one change. */}
            <span className="relative size-3.5">
              <CopyIcon
                className={cn(
                  "absolute inset-0 transition-[opacity,scale,filter] duration-200 ease-out",
                  copied ? "scale-90 opacity-0 blur-[2px]" : "opacity-100"
                )}
              />
              <CheckIcon
                className={cn(
                  "absolute inset-0 transition-[opacity,scale,filter] duration-200 ease-out",
                  copied ? "opacity-100" : "scale-90 opacity-0 blur-[2px]"
                )}
              />
            </span>
            {copied ? "Copied" : "Copy JSON"}
          </Action>
        </footer>
      </aside>
    </>
  )
}
