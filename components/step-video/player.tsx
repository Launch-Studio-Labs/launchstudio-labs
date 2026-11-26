"use client"

import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import {
  ArrowCounterClockwiseIcon,
  DownloadSimpleIcon,
  RecordIcon,
  SpeakerHighIcon,
  SpeakerSlashIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

import { setSound, soundStored, stepCue } from "./sound"
import { StepSoundPicker } from "./step-sound-picker"
import { Stage, labelColor } from "./stage"
import { StepList } from "./step-list"
import {
  downloadTweaks,
  editLabel,
  orderSteps,
  resolveLabel,
  saveTweaks,
} from "./tweaks"
import type { Deck, LabelColor, Tweaks } from "./types"

type Mode = "edit" | "record"
type Clock = { enteredAt: number; instant: boolean }
type SaveState = "idle" | "saving" | "saved" | "unsaved"

const DEFAULT_DURATION = 700
const PRESETS: { value: LabelColor; name: string }[] = [
  { value: "foreground", name: "Foreground" },
  { value: "muted", name: "Muted" },
  { value: "primary", name: "Primary" },
]

/**
 * A deck played one step per key. Editing mode (the default) is for tweaking
 * what's built: reorder steps, move and retype labels, recolour them. Record
 * mode is the clean fullscreen frame for a screen recording: no chrome, no
 * cursor, arrow keys only, Esc to come back.
 *
 * Keys, in both modes:
 * - → or Space: next step. Mid-animation, the first press finishes it.
 * - ←: the previous step's resting frame, no animation.
 * - Digits then Enter: jump to that step (hidden; nothing shows).
 * - Home: back to the first step.
 */
export function StepVideo<S>({
  deck,
  initialTweaks,
}: {
  deck: Deck<S>
  initialTweaks: Tweaks
}) {
  const [tweaks, setTweaks] = useState<Tweaks>(initialTweaks)
  const steps = useMemo(() => orderSteps(deck, tweaks), [deck, tweaks])
  const [index, setIndex] = useState(0)
  const [clock, setClock] = useState<Clock>({ enteredAt: 0, instant: true })
  const [mode, setMode] = useState<Mode>("edit")
  const [selected, setSelected] = useState<string | null>(null)
  const [sound, setSoundState] = useState(false)
  const [save, setSave] = useState<SaveState>("idle")
  const digits = useRef("")

  const stepSound = tweaks.sound?.step ?? deck.stepSound ?? "tap"
  const safeIndex = Math.min(index, steps.length - 1)
  const step = steps[safeIndex]

  // The URL carries the step (and record mode) so a reload lands where you were.
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const fromUrl = Number(params.get("step"))
    // Reading the URL once after hydration; the server render can't.
    /* eslint-disable react-hooks/set-state-in-effect */
    if (fromUrl >= 1) setIndex(Math.min(fromUrl, steps.length) - 1)
    if (params.get("mode") === "record") setMode("record")
    setSoundState(soundStored())
    /* eslint-enable react-hooks/set-state-in-effect */
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const url = new URL(window.location.href)
    url.searchParams.set("step", String(safeIndex + 1))
    if (mode === "record") url.searchParams.set("mode", "record")
    else url.searchParams.delete("mode")
    window.history.replaceState(null, "", url)
  }, [safeIndex, mode])

  const go = useCallback(
    (to: number, instant: boolean) => {
      const next = Math.max(0, Math.min(steps.length - 1, to))
      setIndex(next)
      setClock({ enteredAt: performance.now(), instant })
      // Every step forward sounds: its own cue, or the picked step sound.
      if (!instant && next > safeIndex && sound) {
        const cue = steps[next].cue ?? stepSound
        if (cue !== "none") stepCue(cue)
      }
    },
    [steps, safeIndex, sound, stepSound]
  )

  const forward = useCallback(() => {
    const duration = step.duration ?? DEFAULT_DURATION
    const running =
      !clock.instant && performance.now() - clock.enteredAt < duration
    if (running) {
      setClock((current) => ({ ...current, instant: true }))
      return
    }
    if (safeIndex < steps.length - 1) go(safeIndex + 1, false)
  }, [step, clock, safeIndex, steps.length, go])

  function enterRecord() {
    setSelected(null)
    setMode("record")
    document.documentElement.requestFullscreen?.().catch(() => {
      // No fullscreen (an iframe, a headless browser): record mode still
      // hides everything; F11 does the rest.
    })
  }

  const exitRecord = useCallback(() => {
    setMode("edit")
    if (document.fullscreenElement) void document.exitFullscreen()
  }, [])

  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null
      if (
        target?.isContentEditable ||
        target?.closest("input, textarea, select, [role=slider]")
      ) {
        return
      }
      const key = event.key
      const handled =
        key === "ArrowRight" ||
        key === "ArrowLeft" ||
        key === " " ||
        key === "PageDown" ||
        key === "PageUp" ||
        key === "Home" ||
        (key === "Enter" && digits.current !== "") ||
        /^[0-9]$/.test(key)
      if (!handled) {
        if (key === "Escape" && mode === "record") exitRecord()
        return
      }
      event.preventDefault()
      // Held keys don't run through the deck.
      if (event.repeat) return

      if (/^[0-9]$/.test(key)) {
        digits.current = (digits.current + key).slice(-3)
        return
      }
      if (key === "Enter") {
        const to = Number(digits.current)
        digits.current = ""
        if (to >= 1) go(to - 1, true)
        return
      }
      digits.current = ""
      if (key === "ArrowRight" || key === " " || key === "PageDown") forward()
      else if (key === "ArrowLeft" || key === "PageUp") go(safeIndex - 1, true)
      else if (key === "Home") go(0, true)
    }
    window.addEventListener("keydown", onKeyDown)
    return () => window.removeEventListener("keydown", onKeyDown)
  }, [forward, go, safeIndex, mode, exitRecord])

  // Leaving fullscreen (Esc, or the browser's own way out) leaves record mode.
  useEffect(() => {
    function onChange() {
      if (!document.fullscreenElement) setMode("edit")
    }
    document.addEventListener("fullscreenchange", onChange)
    return () => document.removeEventListener("fullscreenchange", onChange)
  }, [])

  // Edits save themselves, a moment after the last change.
  const firstSave = useRef(true)
  useEffect(() => {
    if (firstSave.current) {
      firstSave.current = false
      return
    }
    setSave("saving")
    const id = window.setTimeout(async () => {
      setSave((await saveTweaks(deck.id, tweaks)) ? "saved" : "unsaved")
    }, 400)
    return () => window.clearTimeout(id)
  }, [deck.id, tweaks])

  const selectedLabel =
    selected !== null
      ? resolveLabel(deck as Deck<unknown>, tweaks, selected)
      : null

  if (mode === "record") {
    return (
      <div
        data-step-mode="record"
        className="fixed inset-0 bg-white [&,&_*]:cursor-none!"
      >
        <Stage deck={deck} step={step} tweaks={tweaks} clock={clock} />
      </div>
    )
  }

  return (
    <div
      data-step-mode="edit"
      className="fixed inset-0 grid grid-cols-[264px_1fr] bg-background text-foreground"
    >
      <aside className="flex min-h-0 flex-col border-r border-border/70">
        <div className="flex h-14 shrink-0 items-center px-5">
          <p className="truncate text-sm font-medium">{deck.title}</p>
        </div>
        <StepList
          steps={steps}
          current={safeIndex}
          onGo={(to) => go(to, true)}
          onReorder={(order) => {
            const currentId = step.id
            setTweaks((value) => ({ ...value, order }))
            setIndex(Math.max(0, order.indexOf(currentId)))
          }}
        />
        <p className="shrink-0 border-t border-border/70 px-5 py-4 text-xs leading-relaxed text-muted-foreground">
          → next · ← back · Home first
          <br />
          Drag a label to move it, double-click to retype. “|” splits a line
          into phrases.
        </p>
      </aside>

      <main className="flex min-h-0 min-w-0 flex-col">
        <header className="flex h-14 shrink-0 items-center gap-3 px-5">
          <p className="text-sm text-muted-foreground tabular-nums">
            {safeIndex + 1} / {steps.length}
            <span className="ml-3 text-foreground">{step.name}</span>
          </p>

          <div className="ml-auto flex items-center gap-1">
            <SaveStatus state={save} />
            <StepSoundPicker
              value={stepSound}
              onChange={(next) => {
                setTweaks((value) => ({ ...value, sound: { step: next } }))
                if (next === "none") return
                // Picking one plays it, and turns sound on to hear it.
                if (!sound) {
                  setSoundState(true)
                  void setSound(true).then(() => stepCue(next))
                } else stepCue(next)
              }}
            />
            <Button
              variant="ghost"
              size="sm"
              onClick={() => downloadTweaks(deck.id, tweaks)}
              aria-label="Download tweaks"
              title="Download tweaks as JSON"
            >
              <DownloadSimpleIcon />
            </Button>
            <Button
              variant="ghost"
              size="sm"
              aria-pressed={sound}
              onClick={() => {
                const next = !sound
                setSoundState(next)
                void setSound(next)
              }}
              title={sound ? "Sound on" : "Sound off"}
              aria-label={sound ? "Turn sound off" : "Turn sound on"}
            >
              {sound ? <SpeakerHighIcon /> : <SpeakerSlashIcon />}
            </Button>
            <Button size="sm" onClick={enterRecord} className="ml-2 gap-1.5">
              <RecordIcon weight="fill" className="text-red-500" />
              Record
            </Button>
          </div>
        </header>

        <div className="relative min-h-0 flex-1 px-5 pb-5">
          <div className="relative size-full overflow-hidden rounded-xl shadow-border">
            <Stage
              deck={deck}
              step={step}
              tweaks={tweaks}
              clock={clock}
              editing={{
                selected,
                onSelect: setSelected,
                onChange: (id, patch) =>
                  setTweaks((value) => editLabel(value, id, patch)),
              }}
            />
          </div>

          {selected && selectedLabel ? (
            <LabelInspector
              color={selectedLabel.color ?? "foreground"}
              onColor={(color) =>
                setTweaks((value) => editLabel(value, selected, { color }))
              }
              onReset={() =>
                setTweaks((value) => {
                  const labels = { ...value.labels }
                  delete labels[selected]
                  return { ...value, labels }
                })
              }
            />
          ) : null}
        </div>
      </main>
    </div>
  )
}

function SaveStatus({ state }: { state: SaveState }) {
  const text = {
    idle: "",
    saving: "Saving…",
    saved: "Saved",
    unsaved: "Not saved · dev server only, download instead",
  }[state]
  return (
    <span
      data-save-state={state}
      className={cn(
        "mr-2 text-xs text-muted-foreground",
        state === "unsaved" && "text-destructive"
      )}
    >
      {text}
    </span>
  )
}

/** The selected label's colour: three theme presets and a custom pick. */
function LabelInspector({
  color,
  onColor,
  onReset,
}: {
  color: LabelColor
  onColor: (color: LabelColor) => void
  onReset: () => void
}) {
  const custom = !PRESETS.some((preset) => preset.value === color)
  return (
    <div
      data-step-inspector=""
      className="absolute top-3 left-1/2 flex -translate-x-1/2 items-center gap-1 rounded-full bg-popover p-1 shadow-border"
    >
      {PRESETS.map((preset) => (
        <button
          key={preset.value}
          type="button"
          aria-pressed={color === preset.value}
          onClick={() => onColor(preset.value)}
          className={cn(
            "flex h-7 items-center gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
            color === preset.value && "bg-muted text-foreground"
          )}
        >
          <span
            className="size-2.5 rounded-full ring-1 ring-foreground/10"
            style={{ background: labelColor(preset.value) }}
          />
          {preset.name}
        </button>
      ))}
      <label
        className={cn(
          "relative flex h-7 cursor-pointer items-center gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground transition-colors hover:text-foreground",
          custom && "bg-muted text-foreground"
        )}
      >
        <span
          className="size-2.5 rounded-full ring-1 ring-foreground/10"
          style={{
            background: custom
              ? color
              : "conic-gradient(#f87171, #facc15, #4ade80, #60a5fa, #c084fc, #f87171)",
          }}
        />
        Custom
        <input
          type="color"
          aria-label="Custom colour"
          value={custom && /^#[0-9a-f]{6}$/i.test(color) ? color : "#1a1a1a"}
          onChange={(event) => onColor(event.target.value)}
          className="absolute inset-0 cursor-pointer opacity-0"
        />
      </label>
      <span className="mx-0.5 h-4 w-px bg-border" />
      <button
        type="button"
        onClick={onReset}
        title="Undo every edit on this label"
        aria-label="Reset label"
        className="flex size-7 items-center justify-center rounded-full text-muted-foreground transition-colors hover:text-foreground"
      >
        <ArrowCounterClockwiseIcon className="size-3.5" />
      </button>
    </div>
  )
}
