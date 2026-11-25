"use client"

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react"
import type { VoiceBeamColorVariant } from "voice-glow"

import { DemoFrame } from "@/components/demos/demo-frame"
import { Input } from "@/components/ui/input"
import { Slider } from "@/components/ui/slider"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Textarea } from "@/components/ui/textarea"
import { Toggle } from "@/components/ui/toggle"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  DictationInput,
  type DictationInputProps,
  type VoiceRecordingPolicy,
  type VoiceTranscribe,
  visualConcentricRadius,
  type VoiceFieldEffect,
} from "@/components/ui/dictation-input"
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
  ["dots", "Dots"],
]

type StateView = "default" | "active" | "done"

const STATE_VIEWS: [StateView, string][] = [
  ["default", "Default"],
  ["active", "Active"],
  ["done", "Done"],
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

/**
 * Two fields from a form — a short answer and a long one — each with Voice
 * Input's mic in the corner, exactly as the component ships. The dials under
 * them change the look, never the composition: at their defaults the fields
 * are the component's defaults.
 *
 * Transcription is a stand-in, so it works without an API key.
 */
export function DictationInputDemo({ className, ...props }: ComponentProps<"div">) {
  const [fieldEffect, setFieldEffect] = useState<VoiceFieldEffect>("glow")
  const [tone, setTone] = useState<Tone>("neutral")
  const [radius, setRadius] = useState<number | null>(null)
  const [buttonRadius, setButtonRadius] = useState<number | "auto">("auto")
  const [view, setView] = useState<StateView>("default")

  const [sendRecording, setSendRecording] = useState(true)
  const [recordingPolicy, setRecordingPolicy] =
    useState<VoiceRecordingPolicy>("ask")
  const [active, setActive] = useState<string | null>(null)

  const transcriber =
    (kind: keyof typeof SAMPLE_TRANSCRIPTS): VoiceTranscribe =>
    async (take, { sendRecording, signal }) => {
      await wait(1400, signal)
      const index = take.durationMs < 4000 ? 0 : take.durationMs < 12000 ? 1 : 2
      const audioId = sendRecording
        ? `rec_${Math.random().toString(36).slice(2, 8)}`
        : null
      return { transcript: SAMPLE_TRANSCRIPTS[kind][index], audioId }
    }

  const fieldRadius = radius ?? FIELD_RADIUS
  const autoButtonRadius = visualConcentricRadius({
    outer: fieldRadius,
    padding: INPUT_INSET,
    size: ROUND * 2,
  })
  // A radius past half the button already draws a circle.
  const shownButtonRadius = Math.min(
    ROUND,
    buttonRadius === "auto" ? autoButtonRadius : buttonRadius
  )

  const toneStyle = TONES[tone]
  /** Props both fields share; anything left at its default is the portal. */
  const shared = (id: string): VoiceProps => ({
    // One recording at a time across the form, as in the portal.
    disabled: active !== null && active !== id,
    onActiveChange: (on) =>
      setActive((current) => (on ? id : current === id ? null : current)),
    recordingPolicy,
    sendRecording,
    onSendRecordingChange: setSendRecording,
    fieldEffect,
    buttonRadius: buttonRadius === ROUND ? "full" : buttonRadius,
    glowVariant: toneStyle.glow,
    style: toneStyle.accent
      ? ({ "--voice-accent": toneStyle.accent } as CSSProperties)
      : undefined,
  })

  /**
   * Each tab's fields: Default is the live component; Active holds both mid-
   * take; Done starts both finished. The simulated ones never open a mic.
   */
  const stateProps = (
    state: StateView,
    kind: keyof typeof SAMPLE_TRANSCRIPTS
  ): VoiceProps => {
    const id = `${state}-${kind}`
    if (state === "default") {
      return { ...shared(id), onTranscribe: transcriber(kind) }
    }
    return {
      ...shared(id),
      disabled: false,
      onActiveChange: undefined,
      ...(state === "active"
        ? { preview: "recording" }
        : {
            preview: "recorded",
            onTranscribe: async (_take, { sendRecording }) => ({
              transcript: SAMPLE_TRANSCRIPTS[kind][1],
              audioId: sendRecording ? `rec_${id}` : null,
            }),
          }),
    }
  }
  return (
    <div
      className={cn("flex w-content max-w-full flex-col gap-6", className)}
      {...props}
    >
      <DemoFrame className="w-full min-w-0! items-stretch gap-6 p-4 sm:p-6">
        <Tabs
          value={view}
          onValueChange={(next) => setView(next as StateView)}
          className="gap-4"
        >
          <TabsList>
            {STATE_VIEWS.map(([key, label]) => (
              <TabsTrigger key={key} value={key}>
                {label}
              </TabsTrigger>
            ))}
          </TabsList>
          <AutoHeight>
            {/* A new flow starts the fields from a clean slate. */}
            <div key={view} className={CARD}>
              <Field
                id={`voice-demo-${view}-short`}
                label="What should we call it?"
              >
                <DemoVoiceField
                  id={`voice-demo-${view}-short`}
                  voice={stateProps(view, "short")}
                  radius={fieldRadius}
                  placeholder="A working name is fine"
                />
              </Field>
              <Field
                id={`voice-demo-${view}-long`}
                label="What should it do for people?"
              >
                <DemoVoiceField
                  id={`voice-demo-${view}-long`}
                  voice={stateProps(view, "long")}
                  radius={fieldRadius}
                  multiline
                  placeholder="Type, or press the mic and say it"
                />
              </Field>
            </div>
          </AutoHeight>
        </Tabs>
      </DemoFrame>

      <div className="flex flex-col gap-3">
        <Choice
          label="Recordings"
          value={recordingPolicy}
          onChange={setRecordingPolicy}
          options={[
            ["ask", "Ask"],
            ["always", "Always send"],
            ["never", "Never send"],
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
            aria-label="Visually concentric with the field"
            title="Field radius minus the mic's inset, never sharper than 5px or half the field's radius"
            className="h-7 shrink-0 px-2.5 text-xs"
          >
            Auto
          </Toggle>
        </Row>
      </div>
    </div>
  )
}

function px(value: number) {
  return `${Math.round(value * 10) / 10}px`
}

/** DictationInput's props, without the field it wraps. */
type VoiceProps = Omit<DictationInputProps, "children">

/**
 * The portal's field shape: shadcn's Input and Textarea at the Labs radius
 * (rounded-lg), the textarea a little taller.
 */
const FIELD_CLASS = {
  short: "rounded-lg",
  long: "min-h-24 rounded-lg",
}

/**
 * One demo field: a shadcn Input or Textarea that holds its own text, with
 * Dictation Input wrapped around it — the way an app would use it.
 */
function DemoVoiceField({
  id,
  voice,
  radius,
  multiline = false,
  placeholder,
}: {
  id: string
  voice: VoiceProps
  radius: number
  multiline?: boolean
  placeholder: string
}) {
  const [value, setValue] = useState("")
  const field = {
    id,
    value,
    placeholder,
    style: { borderRadius: radius },
    onChange: (
      event: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
    ) => setValue(event.target.value),
  }
  return (
    <DictationInput {...voice} value={value} onValueChange={setValue}>
      {multiline ? (
        <Textarea {...field} className={FIELD_CLASS.long} />
      ) : (
        <Input {...field} className={FIELD_CLASS.short} />
      )}
    </DictationInput>
  )
}

/** The white form card each state sits on. */
const CARD =
  "flex w-full flex-col gap-6 rounded-xl bg-card p-5 shadow-xs ring-1 ring-foreground/5"

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
      <label htmlFor={id} className="text-sm leading-snug font-medium">
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

/** What the walkthrough "says". */
const WALKTHROUGH_TRANSCRIPT =
  "We want the onboarding to feel calm, not chatty. Fewer steps, clearer copy, and a real empty state on the dashboard."

/** The walkthrough's beats, in ms. */
const BEAT = {
  /** Idle before the mic is pressed. */
  rest: 1200,
  /** Talking. */
  talk: 4200,
  /** The stand-in server writing the text. */
  write: 1800,
  /** Typing the text into the field, per character. */
  type: 14,
  /** Showing the result before starting over. */
  show: 5000,
  /** The fade between runs. */
  fade: 300,
}

/**
 * The whole flow on a loop, played by itself: the mic is pressed, a
 * simulated voice records, the take is written up, and the text lands in the
 * field with the player and the recording line. No microphone; nothing
 * leaves the page. It's an illustration, so it takes no focus or input —
 * the States section below is the one to try.
 */
export function DictationInputWalkthrough({
  className,
  ...props
}: ComponentProps<"div">) {
  const [run, setRun] = useState(0)

  return (
    <div
      className={cn("flex w-content max-w-full flex-col", className)}
      {...props}
    >
      <p className="sr-only">
        An example that plays on its own: the mic is pressed, a voice is
        recorded, and the written answer appears in the field.
      </p>
      <DemoFrame className="w-full min-w-0! items-stretch p-4 sm:p-6" inert>
        {/* The frame holds still: an invisible copy of the finished card
            shares the cell and sets its height — the tallest the run gets,
            at any width — while the live card sits on top, easing its own
            height as lines come and go. */}
        <div className="grid">
          <div aria-hidden className="invisible [grid-area:1/1]">
            <WalkthroughSizer />
          </div>
          <div className="self-start [grid-area:1/1]">
            <AutoHeight>
              <WalkthroughRun key={run} onDone={() => setRun((r) => r + 1)} />
            </AutoHeight>
          </div>
        </div>
      </DemoFrame>
    </div>
  )
}

/** The walkthrough's last beat, finished, never shown: it only sizes the frame. */
function WalkthroughSizer() {
  const [value, setValue] = useState("")
  return (
    <div className={CARD}>
      <Field id="voice-walkthrough-sizer" label="What should it do for people?">
        <DictationInput
          preview="recorded"
          value={value}
          onValueChange={setValue}
          onTranscribe={async () => ({
            transcript: WALKTHROUGH_TRANSCRIPT,
            audioId: null,
          })}
        >
          <Textarea
            id="voice-walkthrough-sizer"
            readOnly
            tabIndex={-1}
            value={value}
            className={FIELD_CLASS.long}
          />
        </DictationInput>
      </Field>
    </div>
  )
}

function WalkthroughRun({ onDone }: { onDone: () => void }) {
  const [value, setValue] = useState("")
  const [leaving, setLeaving] = useState(false)
  const rootRef = useRef<HTMLDivElement>(null)
  const timersRef = useRef<number[]>([])
  const onDoneRef = useRef(onDone)
  useEffect(() => {
    onDoneRef.current = onDone
  })

  function later(ms: number, run: () => void) {
    timersRef.current.push(window.setTimeout(run, ms))
  }

  /** Presses the corner button, as a person would. */
  function press() {
    rootRef.current
      ?.querySelector<HTMLButtonElement>("[data-slot=dictation-input] button")
      ?.click()
  }

  useEffect(() => {
    const timers = timersRef.current
    later(BEAT.rest, press)
    later(BEAT.rest + BEAT.talk, press)
    return () => timers.forEach((id) => window.clearTimeout(id))
  }, [])

  const transcribe: VoiceTranscribe = async (_take, { signal }) => {
    await wait(BEAT.write, signal)
    return { transcript: WALKTHROUGH_TRANSCRIPT, audioId: null }
  }

  /** The text arrives a few characters at a time, then the run ends. */
  function type(text: string) {
    for (let i = 1; i <= text.length; i++) {
      later(i * BEAT.type, () => setValue(text.slice(0, i)))
    }
    const typed = text.length * BEAT.type
    later(typed + BEAT.show, () => setLeaving(true))
    later(typed + BEAT.show + BEAT.fade, () => onDoneRef.current())
  }

  return (
    <div
      ref={rootRef}
      className={cn(
        CARD,
        "animate-in transition-opacity duration-300 fade-in-0",
        leaving && "opacity-0"
      )}
    >
      <Field id="voice-walkthrough" label="What should it do for people?">
        <DictationInput
          preview="interactive"
          value={value}
          onValueChange={type}
          onTranscribe={transcribe}
        >
          <Textarea
            id="voice-walkthrough"
            readOnly
            value={value}
            placeholder="Type, or press the mic and say it"
            className={FIELD_CLASS.long}
          />
        </DictationInput>
      </Field>
    </div>
  )
}

/**
 * Eases its height to its content's instead of jumping, so the page under
 * the example doesn't shift in steps as lines appear under the field. Clips
 * while it moves, with a few pixels spare so the card's ring and shadow
 * aren't cut.
 */
function AutoHeight({ children }: { children: ReactNode }) {
  const innerRef = useRef<HTMLDivElement>(null)
  const [height, setHeight] = useState<number | null>(null)

  useEffect(() => {
    const inner = innerRef.current
    if (!inner) return
    const observer = new ResizeObserver(() => setHeight(inner.offsetHeight))
    observer.observe(inner)
    return () => observer.disconnect()
  }, [])

  return (
    <div
      className="-m-1 overflow-hidden transition-[height] duration-300 ease-out motion-reduce:transition-none"
      style={{ height: height ?? undefined }}
    >
      <div ref={innerRef} className="p-1">
        {children}
      </div>
    </div>
  )
}
