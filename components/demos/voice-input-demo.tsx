"use client"

import {
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react"
import type { VoiceBeamColorVariant } from "voice-glow"

import { DemoFrame } from "@/components/demos/demo-frame"
import { Slider } from "@/components/ui/slider"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  VoiceInput,
  type VoiceInputProps,
  type VoiceSubmitMode,
  type VoiceTranscribe,
  type VoiceFieldEffect,
} from "@/components/ui/voice-input"
import { cn } from "@/lib/utils"

type Tone = "neutral" | "ocean" | "sunset" | "colorful"

const TONES: Record<
  Tone,
  { glow: VoiceBeamColorVariant; accent?: string; label: string }
> = {
  neutral: { glow: "mono", label: "Neutral" },
  ocean: { glow: "ocean", accent: "oklch(0.55 0.17 255)", label: "Ocean" },
  sunset: { glow: "sunset", accent: "oklch(0.64 0.19 42)", label: "Sunset" },
  colorful: { glow: "colorful", label: "Colorful" },
}

/** How the voice is drawn inside the field. */
const EFFECTS: [Exclude<VoiceFieldEffect, "none">, string][] = [
  ["glow", "Glow"],
  ["level", "Level"],
  ["bars", "Bars"],
  ["wave", "Line"],
  ["dots", "Dots"],
]

/** The field's own corner: shadcn's `rounded-lg` at the Labs radius. */
const FIELD_RADIUS = 7.2
/** The mic's inset on the single-line field; the slider shows its value. */
const INPUT_INSET = 4
/** Half the 28px button: a circle. */
const ROUND = 14

/** What the "server" writes, by length — the demo has no model behind it. */
const SAMPLE_TRANSCRIPTS = {
  short: [
    "Launch moves to Thursday.",
    "A calmer onboarding with fewer steps.",
    "Lead the pricing page with the team plan.",
  ],
  long: [
    "Quick one: the launch moves to Thursday.",
    "We want the onboarding to feel calm, not chatty. Fewer steps, clearer copy, and a real empty state on the dashboard.",
    "Here's the longer version. The pricing page should lead with the team plan, the FAQ needs the refund answer near the top, and the footer links can lose the duplicate docs entry.",
  ],
}

type LogEntry = { id: number; text: string; tone?: "withheld" | "deleted" }

/**
 * Two fields from a form — a short answer and a long one — each with Voice
 * Input's mic in the corner, exactly as the component ships. The dials under
 * them change the look, never the composition: at their defaults the fields
 * are the component's defaults.
 *
 * Transcription is a stand-in, so it works without an API key. The log shows
 * what the app was handed — audio or not — and when stored audio was deleted,
 * which is what the line inside the field controls.
 */
export function VoiceInputDemo({ className, ...props }: ComponentProps<"div">) {
  const [submit, setSubmit] = useState<VoiceSubmitMode>("auto")
  const [fieldEffect, setFieldEffect] = useState<VoiceFieldEffect>("glow")
  const [tone, setTone] = useState<Tone>("neutral")
  const [radius, setRadius] = useState<number | null>(null)
  const [buttonRadius, setButtonRadius] = useState<number | "auto">("auto")
  const [glowStrength, setGlowStrength] = useState(1)

  const [sendRecording, setSendRecording] = useState(true)
  const [active, setActive] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])

  function note(text: string, tone?: LogEntry["tone"]) {
    setLog((current) =>
      [{ id: (current[0]?.id ?? 0) + 1, text, tone }, ...current].slice(0, 4)
    )
  }

  const transcriber =
    (kind: keyof typeof SAMPLE_TRANSCRIPTS): VoiceTranscribe =>
    async (take, { sendRecording, signal }) => {
      const kb = Math.max(1, Math.round(take.blob.size / 1024))
      const seconds = (take.durationMs / 1000).toFixed(1)
      note(
        sendRecording
          ? `POST /api/voice · ${seconds}s · ${kb} KB audio, kept`
          : `POST /api/voice · ${seconds}s · ${kb} KB audio, transcribe and discard`,
        sendRecording ? undefined : "withheld"
      )
      await wait(1400, signal)
      const index = take.durationMs < 4000 ? 0 : take.durationMs < 12000 ? 1 : 2
      const audioId = sendRecording
        ? `rec_${Math.random().toString(36).slice(2, 8)}`
        : null
      note(
        audioId
          ? `← 200 transcript · stored as ${audioId}`
          : "← 200 transcript · audio not stored"
      )
      return { transcript: SAMPLE_TRANSCRIPTS[kind][index], audioId }
    }

  const fieldRadius = radius ?? FIELD_RADIUS
  const autoButtonRadius = Math.max(0, fieldRadius - INPUT_INSET)
  // A radius past half the button already draws a circle.
  const shownButtonRadius = Math.min(
    ROUND,
    buttonRadius === "auto" ? autoButtonRadius : buttonRadius
  )

  const toneStyle = TONES[tone]
  /** Props both fields share; anything left at its default is the portal. */
  const shared = (id: string): VoiceInputProps => ({
    submit,
    onDeleteRecording: (result) => {
      note(`DELETE /api/voice/${result.audioId}`, "deleted")
    },
    // One recording at a time across the form, as in the portal.
    disabled: active !== null && active !== id,
    onActiveChange: (on) =>
      setActive((current) => (on ? id : current === id ? null : current)),
    sendRecording,
    onSendRecordingChange: setSendRecording,
    fieldEffect,
    radius: radius ?? undefined,
    buttonRadius: buttonRadius === ROUND ? "full" : buttonRadius,
    glowVariant: toneStyle.glow,
    glowStrength,
    style: toneStyle.accent
      ? ({ "--voice-accent": toneStyle.accent } as CSSProperties)
      : undefined,
  })

  return (
    <div
      className={cn("flex w-content max-w-full flex-col gap-6", className)}
      {...props}
    >
      <DemoFrame className="w-full min-w-0! px-4 py-8 sm:px-8">
        {/* A new flow starts both fields from a clean slate. */}
        <div
          key={submit}
          className="flex w-full max-w-[26rem] flex-col gap-6 rounded-xl bg-card p-5 shadow-xs ring-1 ring-foreground/5"
        >
          <Field id="voice-demo-short" label="What should we call it?">
            <VoiceInput
              {...shared("short")}
              placeholder="A working name is fine"
              fieldProps={{ id: "voice-demo-short" }}
              onTranscribe={transcriber("short")}
            />
          </Field>
          <Field id="voice-demo-long" label="What should it do for people?">
            <VoiceInput
              {...shared("long")}
              multiline
              placeholder="Type, or press the mic and say it"
              fieldProps={{ id: "voice-demo-long" }}
              onTranscribe={transcriber("long")}
            />
          </Field>
        </div>
      </DemoFrame>

      <div className="flex flex-col gap-3">
        <Choice
          label="After a take"
          value={submit}
          onChange={setSubmit}
          options={[
            ["auto", "Send"],
            ["manual", "Hold"],
          ]}
        />
        <Choice
          label="In the field"
          value={fieldEffect}
          onChange={setFieldEffect}
          options={EFFECTS}
        />
        <Choice
          label="Color"
          value={tone}
          onChange={setTone}
          options={(Object.keys(TONES) as Tone[]).map((key) => [
            key,
            TONES[key].label,
          ])}
        />
        <Row label="Field radius">
          <Slider
            aria-label="Field corner radius"
            min={0}
            max={24}
            step={0.5}
            value={[fieldRadius]}
            onValueChange={(value) =>
              setRadius(Array.isArray(value) ? value[0] : value)
            }
            className="min-w-0 flex-1"
          />
          <Value>{px(fieldRadius)}</Value>
        </Row>
        <Row label="Mic radius">
          <Slider
            aria-label="Mic button corner radius"
            min={0}
            max={ROUND}
            step={0.5}
            value={[shownButtonRadius]}
            onValueChange={(value) =>
              setButtonRadius(Array.isArray(value) ? value[0] : value)
            }
            className={cn(
              "min-w-0 flex-1",
              buttonRadius === "auto" && "opacity-60"
            )}
          />
          <Value>
            {shownButtonRadius >= ROUND ? "Round" : px(shownButtonRadius)}
          </Value>
          <Toggle
            size="sm"
            pressed={buttonRadius === "auto"}
            onPressedChange={(pressed) => {
              if (pressed) setButtonRadius("auto")
            }}
            aria-label="Concentric with the field"
            title="Field radius minus the mic's inset"
            className="h-7 shrink-0 px-2.5 text-xs"
          >
            Auto
          </Toggle>
        </Row>
        <Row label="Glow">
          <Slider
            aria-label="Glow strength"
            min={0}
            max={1}
            step={0.05}
            value={[glowStrength]}
            onValueChange={(value) =>
              setGlowStrength(Array.isArray(value) ? value[0] : value)
            }
            className="min-w-0 flex-1"
          />
          <Value>{Math.round(glowStrength * 100)}%</Value>
        </Row>
      </div>

      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium text-muted-foreground">
          What the app received
        </p>
        {log.length === 0 ? (
          <p className="font-mono text-xs text-muted-foreground/70">
            Nothing yet. Record something.
          </p>
        ) : (
          <ul className="flex flex-col gap-1 font-mono text-xs">
            {log.map((entry) => (
              <li
                key={entry.id}
                className={cn(
                  "truncate",
                  entry.tone === "deleted"
                    ? "text-destructive"
                    : entry.tone === "withheld"
                      ? "text-foreground"
                      : "text-muted-foreground"
                )}
              >
                {entry.text}
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  )
}

function px(value: number) {
  return `${Math.round(value * 10) / 10}px`
}

/** A form question: label over the field, as the portal sets them. */
function Field({
  id,
  label,
  children,
}: {
  id: string
  label: string
  children: ReactNode
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={id} className="text-sm leading-snug font-semibold">
        {label}
      </label>
      {children}
    </div>
  )
}

/**
 * One dial: the label on a fixed column, the control taking the rest. On a
 * phone the label sits above, so a row of options keeps the full width.
 */
function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex flex-col gap-1.5 sm:min-h-9 sm:flex-row sm:items-center sm:gap-4">
      <span className="shrink-0 text-sm text-muted-foreground sm:w-28">
        {label}
      </span>
      {/* flex-1: a slider is w-full of this box, so the box must have a
          width to give — shrink-wrapped, it collapsed to a stub. */}
      <div className="flex min-h-8 min-w-0 flex-1 items-center gap-3">
        {children}
      </div>
    </div>
  )
}

function Value({ children }: { children: ReactNode }) {
  return (
    <span className="w-11 shrink-0 text-right text-xs text-muted-foreground tabular-nums">
      {children}
    </span>
  )
}

function Choice<T extends string>({
  label,
  value,
  onChange,
  options,
}: {
  label: string
  value: T
  onChange: (value: T) => void
  options: [T, string][]
}) {
  return (
    <Row label={label}>
      <ToggleGroup
        aria-label={label}
        size="sm"
        spacing={1}
        value={[value]}
        onValueChange={(next) => {
          // Single choice: ignore the click that would clear it.
          const picked = next[0] as T | undefined
          if (picked) onChange(picked)
        }}
        className="flex-wrap"
      >
        {options.map(([key, text]) => (
          <ToggleGroupItem key={key} value={key} className="px-2.5 text-xs">
            {text}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </Row>
  )
}

function wait(ms: number, signal: AbortSignal) {
  return new Promise<void>((resolve, reject) => {
    const id = window.setTimeout(resolve, ms)
    signal.addEventListener("abort", () => {
      window.clearTimeout(id)
      reject(new DOMException("Aborted", "AbortError"))
    })
  })
}
