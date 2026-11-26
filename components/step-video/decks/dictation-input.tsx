"use client"

import { useEffect, useRef, useState, type CSSProperties } from "react"
import type { VoiceBeamColorVariant } from "voice-glow"

import {
  DictationInput,
  type VoiceButtonRadius,
  type VoiceFieldEffect,
  type VoiceRecordingPolicy,
  type VoiceTranscribe,
} from "@/components/ui/dictation-input"
import { Input } from "@/components/ui/input"
import { cn } from "@/lib/utils"

import { useStepClock, useStepProgress } from "../clock"
import type {
  Camera,
  Deck,
  LabelDef,
  Step,
  StepLabel,
  WorldProps,
} from "../types"

/*
 * "The life of a text field": the Dictation Input's real history, told the
 * way the composer video tells its box. One beat per step, the field always
 * coming back to clean, a few rare big moments. The story is in
 * ~/code/video-study/voice-input-story.md.
 *
 * The world is drawn at 1 world px = 1 CSS px of the real component, and the
 * camera sits at 2× by default, so the 420px field reads at 840px on the
 * 1920×1080 stage.
 */

// ---------------------------------------------------------------------------
// The scene

type FieldMode = "idle" | "recording" | "processing" | "recorded"

type FieldScene = {
  /** Centre x and the vertical middle of the first line, in world px. */
  x?: number
  y?: number
  width?: number
  /** The field's corner radius. @default 7.2 (the labs' rounded-lg) */
  radius?: number
  /** false draws the plain input, before the mic existed. */
  mic?: boolean
  mode?: FieldMode
  /** A mode change partway through the step: `from` until `at` ms. */
  modeFrom?: FieldMode
  modeAt?: number
  effect?: VoiceFieldEffect
  color?: VoiceBeamColorVariant
  buttonRadius?: VoiceButtonRadius
  policy?: VoiceRecordingPolicy
  placeholder?: string
  /** How long "writing it up" takes on entering `recorded`. @default 900 */
  writeMs?: number
  opacity?: number
  /** A hairline round the field, for the close-ups on its corner. */
  outline?: boolean
}

type Chip = { label: string; state?: "idle" | "on" | "struck" | "gone" }
type ChipRow = { y: number; items: Chip[]; mono?: boolean }

type PropName = { name: string; state?: "idle" | "focus" | "struck" | "gone" }

type Cursor = {
  /** Where it starts, in world px. */
  from: { x: number; y: number }
  /** Where it ends; "mic" is the main field's corner button. */
  to: "mic" | { x: number; y: number }
  /** ms into the step when it clicks. */
  clickAt?: number
}

export type Scene = {
  fields: Record<string, FieldScene>
  title?: string | null
  chips: Record<string, ChipRow>
  props?: { y: number; names: PropName[] } | null
  cursor?: Cursor | null
}

// ---------------------------------------------------------------------------
// The world

const FIELD_WIDTH = 420
const FIELD_ROW = 36
const TRANSCRIPT =
  "We want onboarding to feel calm. Fewer steps, clearer copy, and a real empty state."
const MOVE = "600ms cubic-bezier(0.65, 0, 0.35, 1)"

function micCentre(field: FieldScene) {
  const width = field.width ?? FIELD_WIDTH
  // The 28px button sits 4px in from the top right of the 36px row.
  return { x: (field.x ?? 0) + width / 2 - 4 - 14, y: field.y ?? 0 }
}

function DictationWorld({ scene }: WorldProps<Scene>) {
  return (
    <>
      <Title text={scene.title ?? null} />
      {Object.entries(scene.fields).map(([id, field]) => (
        <FieldView key={id} field={field} />
      ))}
      {Object.entries(scene.chips).map(([id, row]) => (
        <ChipRowView key={id} row={row} />
      ))}
      {scene.props ? <PropCloud {...scene.props} /> : null}
      {scene.cursor ? (
        <FakeCursor
          cursor={scene.cursor}
          mic={micCentre(scene.fields.main ?? {})}
        />
      ) : null}
    </>
  )
}

function Title({ text }: { text: string | null }) {
  return (
    <div
      className="absolute left-0 w-[640px] -translate-x-1/2 text-center"
      style={{ top: -92 }}
    >
      {text ? (
        <p
          key={text}
          className="text-[30px] font-medium tracking-tight text-foreground transition-[opacity,translate] duration-300 ease-out starting:translate-y-1 starting:opacity-0"
        >
          {text}
        </p>
      ) : null}
    </div>
  )
}

function FieldView({ field }: { field: FieldScene }) {
  const {
    x = 0,
    y = 0,
    width = FIELD_WIDTH,
    radius = 7.2,
    mic = true,
    effect = "glow",
    color = "mono",
    buttonRadius = "auto",
    policy = "ask",
    placeholder = "Type, or press the mic and say it",
    opacity = 1,
    writeMs = 900,
  } = field
  const switched = useStepProgress(field.modeAt ?? 0, 0) >= 1
  const mode =
    field.modeFrom && !switched ? field.modeFrom : (field.mode ?? "idle")

  const style: CSSProperties = {
    left: x - width / 2,
    top: y - FIELD_ROW / 2,
    width,
    opacity,
    transition: `left ${MOVE}, top ${MOVE}, width ${MOVE}, opacity 400ms ease-out`,
  }
  const fieldStyle: CSSProperties = {
    borderRadius: radius,
    boxShadow: field.outline
      ? "inset 0 0 0 0.5px rgb(0 0 0 / 0.35)"
      : undefined,
  }

  return (
    <div className="absolute" style={style}>
      {mic ? (
        <LiveField
          // A new mode or policy is a new take: the component starts fresh.
          key={`${mode}-${policy}`}
          mode={mode}
          effect={effect}
          color={color}
          buttonRadius={buttonRadius}
          policy={policy}
          placeholder={placeholder}
          fieldStyle={fieldStyle}
          writeMs={writeMs}
        />
      ) : (
        <Input
          readOnly
          tabIndex={-1}
          placeholder={placeholder}
          style={fieldStyle}
        />
      )}
    </div>
  )
}

function LiveField({
  mode,
  effect,
  color,
  buttonRadius,
  policy,
  placeholder,
  fieldStyle,
  writeMs,
}: {
  mode: FieldMode
  effect: VoiceFieldEffect
  color: VoiceBeamColorVariant
  buttonRadius: VoiceButtonRadius
  policy: VoiceRecordingPolicy
  placeholder: string
  fieldStyle: CSSProperties
  writeMs: number
}) {
  const { instant } = useStepClock()
  const [value, setValue] = useState("")
  const instantRef = useRef(instant)
  const timers = useRef<number[]>([])
  useEffect(() => {
    instantRef.current = instant
  })
  useEffect(() => () => timers.current.forEach((id) => clearTimeout(id)), [])

  // "processing" never finishes; "recorded" writes the answer up, then types
  // it in a few characters at a time — unless the step is shown finished.
  const transcribe: VoiceTranscribe = async (_take, { signal }) => {
    if (mode === "processing") {
      await new Promise((_, reject) =>
        signal.addEventListener("abort", () => reject(new Error("aborted")))
      )
    }
    const wait = instantRef.current ? 0 : writeMs
    if (wait) await new Promise((resolve) => setTimeout(resolve, wait))
    return { transcript: TRANSCRIPT, audioId: null }
  }

  function type(text: string) {
    if (instantRef.current) {
      setValue(text)
      return
    }
    for (let i = 1; i <= text.length; i += 2) {
      timers.current.push(
        window.setTimeout(() => setValue(text.slice(0, i + 1)), i * 7)
      )
    }
  }

  // Skipping to the end mid-typing lands on the whole answer.
  useEffect(() => {
    if (instant && value && value !== TRANSCRIPT) {
      timers.current.forEach((id) => clearTimeout(id))
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setValue(TRANSCRIPT)
    }
  }, [instant, value])

  const preview =
    mode === "recording"
      ? "recording"
      : mode === "idle"
        ? "interactive"
        : "recorded"

  return (
    <DictationInput
      preview={preview}
      value={value}
      onValueChange={type}
      onTranscribe={
        mode === "idle" || mode === "recording" ? undefined : transcribe
      }
      fieldEffect={effect}
      glowVariant={color}
      buttonRadius={buttonRadius}
      recordingPolicy={policy}
      tabIndex={-1}
    >
      <Input
        readOnly
        tabIndex={-1}
        value={value}
        placeholder={placeholder}
        style={fieldStyle}
      />
    </DictationInput>
  )
}

function ChipRowView({ row }: { row: ChipRow }) {
  return (
    <div
      className="absolute left-0 flex w-[720px] -translate-x-1/2 flex-wrap justify-center gap-1.5"
      style={{ top: row.y, transition: `top ${MOVE}` }}
    >
      {row.items.map((chip) => (
        <ChipView key={chip.label} chip={chip} mono={row.mono} />
      ))}
    </div>
  )
}

function ChipView({ chip, mono }: { chip: Chip; mono?: boolean }) {
  const state = chip.state ?? "idle"
  return (
    <span
      className={cn(
        "relative inline-flex h-6 items-center overflow-hidden rounded-full px-2.5 text-xs whitespace-nowrap transition-[opacity,background-color,color,max-width,padding] duration-300 ease-out starting:opacity-0",
        mono && "font-mono text-[11px]",
        state === "on"
          ? "bg-foreground text-background"
          : "bg-muted text-foreground",
        state === "struck" && "opacity-35",
        state === "gone" ? "max-w-0 px-0 opacity-0" : "max-w-[240px]"
      )}
    >
      {chip.label}
      <Strike on={state === "struck" || state === "gone"} />
    </span>
  )
}

/** A line drawn through, left to right. */
function Strike({ on }: { on: boolean }) {
  return (
    <span
      aria-hidden
      className="absolute top-1/2 left-1.5 h-px origin-left bg-current transition-transform duration-300 ease-out"
      style={{ right: 6, transform: `scaleX(${on ? 1 : 0})` }}
    />
  )
}

function PropCloud({ y, names }: { y: number; names: PropName[] }) {
  return (
    <div
      className="absolute left-0 flex w-[640px] -translate-x-1/2 flex-wrap justify-center gap-x-1 gap-y-1.5 transition-opacity duration-300 starting:opacity-0"
      style={{ top: y }}
    >
      {names.map(({ name, state = "idle" }) => (
        <span
          key={name}
          className={cn(
            "relative inline-flex h-6 items-center overflow-hidden rounded-md px-2 font-mono text-xs whitespace-nowrap transition-[opacity,background-color,color,max-width,padding] duration-500 ease-out",
            state === "focus"
              ? "bg-foreground text-background"
              : "bg-muted text-foreground",
            state === "struck" && "opacity-30",
            state === "gone" ? "max-w-0 px-0 opacity-0" : "max-w-[200px]"
          )}
        >
          {name}
          <Strike on={state === "struck" || state === "gone"} />
        </span>
      ))}
    </div>
  )
}

/** A pointer that glides to its target and clicks, for the beats that press the mic. */
function FakeCursor({
  cursor,
  mic,
}: {
  cursor: Cursor
  mic: { x: number; y: number }
}) {
  const to = cursor.to === "mic" ? { x: mic.x + 2, y: mic.y + 3 } : cursor.to
  const move = useStepProgress(0, 520)
  const eased = 1 - Math.pow(1 - move, 3)
  const x = cursor.from.x + (to.x - cursor.from.x) * eased
  const y = cursor.from.y + (to.y - cursor.from.y) * eased
  const click = useStepProgress(cursor.clickAt ?? 1e9, 360)
  const pressing = click > 0 && click < 0.5

  return (
    <div
      className="pointer-events-none absolute z-10"
      style={{ left: x, top: y }}
    >
      {click > 0 && click < 1 ? (
        <span
          className="absolute size-6 -translate-x-1/2 -translate-y-1/2 rounded-full bg-foreground/15"
          style={{
            transform: `translate(-50%, -50%) scale(${0.4 + click})`,
            opacity: 1 - click,
          }}
        />
      ) : null}
      <svg
        width="13"
        height="18"
        viewBox="0 0 13 18"
        className="drop-shadow-[0_1px_1px_rgba(0,0,0,0.25)] transition-transform duration-100"
        style={{
          transform: `scale(${pressing ? 0.86 : 1})`,
          transformOrigin: "0 0",
        }}
      >
        <path
          d="M1 1v14.2l3.6-3.4 2.3 5.2 2.4-1-2.3-5.1h4.9z"
          fill="#111"
          stroke="#fff"
          strokeWidth="1.2"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  )
}

// ---------------------------------------------------------------------------
// Labels: stage px. The field sits at the stage centre (960, 540); its first
// line spans y 504–576 at the default 2× camera.

const below = { x: 960, y: 690 }
const above = { x: 960, y: 380 }
const top = { x: 960, y: 210 }
const middle = { x: 960, y: 540 }

const labels: Record<string, LabelDef> = {
  life: { text: "the life of a text field", ...middle, size: 60 },
  "not-recorder": {
    text: "not a recorder.| a field.",
    ...middle,
    y: 625,
    color: "muted",
    size: 40,
  },
  "type-or-talk": { text: "you type.| or you talk.", ...below },
  "whole-idea": {
    text: "that's the whole idea.| how hard can it be?",
    ...below,
  },

  rewind: {
    text: "nov 19.| “port the portal's voice answer.| add some variants.”",
    ...middle,
    width: 1100,
  },
  recorder: { text: "so i built a recorder.", ...below },
  surfaces: { text: "outline?| soft?| ghost?", ...below },
  sizes: { text: "sm?| md?| lg?", ...below },
  submit: { text: "auto send?| review?| manual?", ...below, y: 760 },
  parts: {
    text: "a timer.| a waveform.| a glow strength slider.",
    ...below,
    y: 800,
  },
  "portal-quote": {
    text: "“it should have been exactly how we did it in the portal.”",
    ...top,
    size: 48,
    width: 1300,
  },
  "voice-extra": {
    text: "normal input by default.| the voice is extra.",
    ...below,
  },
  "oh-right": { text: "oh.| right.", ...below },

  corner: { text: "28px.| top right.| 4px in.", ...below },
  breathes: { text: "the stop button breathes with you.", ...below },
  writing: { text: "writing it up…", ...below },
  undo: { text: "and an undo,| in case you hated it.", ...below, y: 960 },

  listening: { text: "what does listening look like?| a glow?", ...below },
  level: { text: "a level meter?", ...below },
  "bars-line": { text: "bars?| a line?", ...below },
  dots: { text: "dots?", ...below },
  meter: { text: "and a meter next to “listening”?", ...below, y: 740 },
  "meter-no": { text: "no.| it's already in the field.", ...below, y: 740 },
  "two-hours": {
    text: "it lived two hours.",
    ...below,
    y: 820,
    size: 32,
    color: "muted",
  },
  placeholder: {
    text: "and it ran right through the placeholder.| so it fades out under the text.",
    ...below,
    width: 1300,
  },
  colour: { text: "what colour is a voice?", ...above },
  palettes: { text: "ocean?| sunset?| colorful?", ...below },
  neutral: { text: "neutral.| by default.", ...below },
  "cut-effects": { text: "later: bars and line,| gone.", ...below },
  "three-left": { text: "glow.| level.| dots.| that's it.", ...below },

  radius: { text: "field radius 7.2.| inset 4.", x: 960, y: 900 },
  textbook: { text: "the textbook says| 7.2 − 4 = 3.2px.", x: 960, y: 900 },
  sharp: {
    text: "an 8px field:| 0px.| sharp.| technically right.",
    x: 960,
    y: 900,
  },
  "visually-quote": {
    text: "“it does not look visually right.”",
    x: 960,
    y: 900,
    size: 52,
  },
  five: {
    text: "so: never sharper than 5px.| a whole new page about it.",
    x: 960,
    y: 900,
  },
  two: { text: "later: minimum 2px.| the mic lands on 3.6.", x: 960, y: 900 },
  "started-here": {
    text: "which is basically where we started.",
    x: 960,
    y: 900,
  },

  "keep-recording": { text: "should it keep the recording?", ...top, y: 330 },
  policies: { text: "ask?| always?| never?", ...top, y: 330 },
  policy: { text: "a toggle?| no.| a policy.", ...top, y: 330 },
  never: { text: "never means never.| no waveform either.", ...top, y: 330 },

  "api-quote": {
    text: "“the api reference seems kinda crazy.”",
    ...top,
    y: 170,
    size: 48,
  },
  "api-count": { text: "38.| 23.| 21.| 20.", x: 960, y: 930 },
  "allow-pause": { text: "allowPause?| “what does it do?”", x: 960, y: 930 },
  gone: { text: "gone.", x: 960, y: 930 },
  eighteen: { text: "18.", x: 960, y: 930, size: 64 },

  "name-quote": {
    text: "“it doesn't reflect that it's a text field.”",
    ...below,
    width: 1300,
  },
  "three-words": { text: "max 3 words.", ...below },
  names: {
    text: "dictation field?| voice text field?| voice-ready field?| speak-to-text field?",
    ...below,
    width: 1500,
    size: 40,
  },
  "like-it": { text: "“i like dictation input.”", ...below },

  "started-got": { text: "how it started.| where it got.", ...below, y: 720 },
  "all-that": { text: "all that for a text field.", ...below, y: 720 },
  done: { text: "done.| right?", ...below },
  "no-field": { text: "hmm.| what if there's no field?", ...below },
  "another-time": {
    text: "ok.| maybe another time.",
    ...middle,
    size: 40,
    color: "#f4f4f4",
  },
  continued: {
    text: "to be continued.",
    ...middle,
    size: 40,
    color: "#f4f4f4",
  },
}

// ---------------------------------------------------------------------------
// Steps. Each beat patches the one before; `resolve` below turns them into
// full states, so every step stands alone (back and jump land exactly).

type Beat = {
  id: string
  name: string
  fields?: Record<string, Partial<FieldScene> | null>
  title?: string | null
  chips?: Record<string, ChipRow | null>
  props?: Scene["props"]
  /** Not carried over: a cursor belongs to its own beat. */
  cursor?: Cursor
  camera?: Camera
  background?: string
  labels?: (string | StepLabel)[]
  cue?: Step<Scene>["cue"]
  duration?: number
}

const CLEAN: FieldScene = {
  mode: "idle",
  effect: "glow",
  color: "mono",
  buttonRadius: "auto",
  policy: "ask",
}
const ZOOM_CORNER: Camera = { x: 197, y: -2, scale: 12 }
const CLICK_FROM = { x: 120, y: 60 }

const chips = (labels: string[], state: Chip["state"] = "on"): Chip[] =>
  labels.map((label) => ({ label, state }))

const REMOVED = [
  "variant",
  "size",
  "submit",
  "showGlow",
  "showWaveform",
  "showTimer",
  "glowStrength",
  "glowColors",
  "multiline",
  "placeholder",
  "theme",
  "autoGainControl",
  "showMicPicker",
  "confirmReset",
  "meter",
  "showRecordingToggle",
  "defaultSendRecording",
  "allowPause",
  "showPlayback",
  "meterEffect",
]
const KEPT = [
  "value",
  "onValueChange",
  "insert",
  "disabled",
  "onTranscribe",
  "onResult",
  "maxDurationMs",
  "recordingPolicy",
  "sendRecording",
  "onSendRecordingChange",
  "onDeleteRecording",
  "onActiveChange",
  "onReset",
  "fieldEffect",
  "buttonRadius",
  "glowVariant",
  "labels",
  "children",
]
/** Interleaved, so the cuts land all over the cloud. */
const ALL_PROPS = KEPT.flatMap((name, i) => [name, REMOVED[i]])
  .concat(REMOVED.slice(KEPT.length))
  .filter(Boolean) as string[]

function propCloud(
  struck: number,
  extra: { focus?: string; gone?: boolean } = {}
) {
  const cut = new Set(REMOVED.slice(0, struck))
  return {
    y: -150,
    names: ALL_PROPS.map((name) => ({
      name,
      state: (extra.focus === name
        ? "focus"
        : cut.has(name)
          ? extra.gone
            ? "gone"
            : "struck"
          : "idle") as PropName["state"],
    })),
  }
}

const beats: Beat[] = [
  // 1. Just a field
  {
    id: "open",
    name: "the life of a text field",
    labels: ["life"],
    duration: 400,
  },
  {
    id: "open-sub",
    name: "not a recorder",
    labels: ["life", { id: "not-recorder", lit: 1 }],
  },
  { id: "open-sub-2", name: "a field", labels: ["life", "not-recorder"] },
  {
    id: "field-in",
    name: "a plain field",
    fields: { main: { ...CLEAN, mic: false } },
    labels: [{ id: "type-or-talk", lit: 1 }],
  },
  {
    id: "mic-in",
    name: "the mic",
    fields: { main: { mic: true } },
    labels: ["type-or-talk"],
    cue: "tap",
  },
  {
    id: "whole-idea",
    name: "how hard can it be",
    labels: [{ id: "whole-idea", lit: 1 }],
  },
  { id: "whole-idea-2", name: "how hard can it be ?", labels: ["whole-idea"] },

  // 2. The first pass
  {
    id: "rewind",
    name: "nov 19",
    fields: { main: { opacity: 0 } },
    labels: [{ id: "rewind", lit: 1 }],
  },
  {
    id: "rewind-2",
    name: "port the portal's voice",
    labels: [{ id: "rewind", lit: 2 }],
  },
  { id: "rewind-3", name: "add some variants", labels: ["rewind"] },
  {
    id: "pill",
    name: "a recorder",
    fields: {
      main: {
        opacity: 1,
        mode: "recording",
        radius: 999,
        width: 300,
        placeholder: "Hold to talk",
      },
    },
    labels: ["recorder"],
  },
  {
    id: "surfaces-1",
    name: "outline?",
    chips: {
      surface: {
        y: -78,
        items: [
          { label: "outline", state: "on" },
          { label: "soft" },
          { label: "ghost" },
        ],
      },
    },
    labels: [{ id: "surfaces", lit: 1 }],
  },
  {
    id: "surfaces-2",
    name: "soft?",
    chips: {
      surface: {
        y: -78,
        items: [
          { label: "outline" },
          { label: "soft", state: "on" },
          { label: "ghost" },
        ],
      },
    },
    labels: [{ id: "surfaces", lit: 2 }],
  },
  {
    id: "surfaces-3",
    name: "ghost?",
    chips: {
      surface: {
        y: -78,
        items: [
          { label: "outline" },
          { label: "soft" },
          { label: "ghost", state: "on" },
        ],
      },
    },
    labels: ["surfaces"],
  },
  {
    id: "sizes",
    name: "sm md lg",
    chips: { size: { y: -110, items: chips(["sm", "md", "lg"], "idle") } },
    labels: ["sizes"],
  },
  {
    id: "submit",
    name: "auto send review manual",
    chips: {
      submit: {
        y: 40,
        items: chips(["auto send", "review", "manual"], "idle"),
      },
    },
    labels: ["submit"],
  },
  {
    id: "parts",
    name: "timer waveform glow",
    chips: {
      parts: {
        y: 72,
        items: chips(["timer", "waveform", "glow strength"], "idle"),
      },
    },
    labels: ["parts"],
  },
  {
    id: "portal-quote",
    name: "★ exactly like the portal",
    chips: {
      surface: { y: -78, items: chips(["outline", "soft", "ghost"], "struck") },
      size: { y: -110, items: chips(["sm", "md", "lg"], "struck") },
      submit: {
        y: 40,
        items: chips(["auto send", "review", "manual"], "struck"),
      },
      parts: {
        y: 72,
        items: chips(["timer", "waveform", "glow strength"], "struck"),
      },
    },
    labels: ["portal-quote"],
    cue: "close",
  },
  {
    id: "voice-extra",
    name: "normal input by default",
    fields: {
      main: { ...CLEAN, radius: 7.2, width: 420, placeholder: undefined },
    },
    chips: { surface: null, size: null, submit: null, parts: null },
    labels: ["portal-quote", { id: "voice-extra", lit: 1 }],
  },
  {
    id: "voice-extra-2",
    name: "the voice is extra",
    labels: ["portal-quote", "voice-extra"],
  },
  { id: "oh-right", name: "oh. right.", labels: ["oh-right"] },

  // 3. The corner
  {
    id: "click",
    name: "click the mic",
    fields: { main: { mode: "recording", modeFrom: "idle", modeAt: 700 } },
    cursor: { from: CLICK_FROM, to: "mic", clickAt: 560 },
    labels: [{ id: "corner", lit: 1 }],
    cue: "tap",
    duration: 1000,
  },
  {
    id: "corner",
    name: "top right, 4px in",
    fields: { main: { modeFrom: undefined, modeAt: undefined } },
    camera: { x: 150, y: 0, scale: 3.4 },
    labels: ["corner"],
  },
  {
    id: "breathes",
    name: "the stop button breathes",
    camera: {},
    labels: ["breathes"],
  },
  {
    id: "stop",
    name: "stop → writing it up",
    fields: {
      main: { mode: "processing", modeFrom: "recording", modeAt: 560 },
    },
    cursor: { from: CLICK_FROM, to: "mic", clickAt: 480 },
    labels: ["writing"],
    cue: "tap",
    duration: 900,
  },
  {
    id: "recorded",
    name: "the answer lands",
    fields: {
      main: { mode: "recorded", modeFrom: undefined, modeAt: undefined },
    },
    labels: [{ id: "undo", lit: 1 }],
    duration: 1900,
  },
  {
    id: "undo",
    name: "and an undo",
    camera: { x: 120, y: 24, scale: 2.8 },
    labels: ["undo"],
  },
  {
    id: "clean-1",
    name: "back to clean",
    fields: { main: { ...CLEAN } },
    camera: {},
  },

  // 4. What does listening look like?
  {
    id: "listening",
    name: "what does listening look like",
    labels: [{ id: "listening", lit: 1 }],
  },
  {
    id: "glow",
    name: "a glow?",
    fields: { main: { mode: "recording" } },
    labels: ["listening"],
  },
  {
    id: "level",
    name: "a level meter?",
    fields: { main: { effect: "level" } },
    labels: ["level"],
  },
  {
    id: "bars-line",
    name: "bars? a line?",
    chips: { effects: { y: -84, items: chips(["bars", "line"]) } },
    labels: ["bars-line"],
  },
  {
    id: "dots",
    name: "dots?",
    fields: { main: { effect: "dots" } },
    chips: { effects: { y: -84, items: chips(["bars", "line"], "idle") } },
    labels: ["dots"],
  },
  {
    id: "meter",
    name: "a separate meter?",
    chips: {
      meter: { y: 52, items: [{ label: "● Listening   ▂▅▃▆▂", state: "on" }] },
    },
    labels: ["meter"],
  },
  {
    id: "meter-no",
    name: "no, it's in the field",
    chips: {
      meter: {
        y: 52,
        items: [{ label: "● Listening   ▂▅▃▆▂", state: "struck" }],
      },
    },
    labels: ["meter-no", "two-hours"],
    cue: "close",
  },
  {
    id: "placeholder",
    name: "through the placeholder",
    fields: { main: { effect: "level" } },
    chips: { meter: null, effects: null },
    camera: { x: -110, y: 0, scale: 3.2 },
    labels: [{ id: "placeholder", lit: 1 }],
  },
  { id: "placeholder-2", name: "fade under the text", labels: ["placeholder"] },
  {
    id: "colour",
    name: "what colour is a voice",
    fields: { main: { effect: "glow" } },
    camera: {},
    labels: ["colour"],
  },
  {
    id: "ocean",
    name: "ocean?",
    fields: { main: { color: "ocean" } },
    labels: ["colour", { id: "palettes", lit: 1 }],
  },
  {
    id: "sunset",
    name: "sunset?",
    fields: { main: { color: "sunset" } },
    labels: ["colour", { id: "palettes", lit: 2 }],
  },
  {
    id: "colorful",
    name: "colorful?",
    fields: { main: { color: "colorful" } },
    labels: ["colour", "palettes"],
  },
  {
    id: "neutral",
    name: "neutral by default",
    fields: { main: { color: "mono" } },
    labels: ["neutral"],
  },
  {
    id: "cut-effects",
    name: "bars and line, gone",
    chips: { effects: { y: -84, items: chips(["bars", "line"], "struck") } },
    labels: ["cut-effects"],
  },
  {
    id: "three-left",
    name: "glow level dots",
    fields: { main: { effect: "dots" } },
    chips: { effects: null },
    labels: ["three-left"],
  },
  { id: "clean-2", name: "clean", fields: { main: { ...CLEAN } } },

  // 5. The corner, again ★
  {
    id: "zoom-corner",
    name: "★ zoom into the corner",
    fields: { main: { buttonRadius: 3.2, outline: true } },
    camera: ZOOM_CORNER,
    labels: ["radius"],
    cue: "open",
    duration: 800,
  },
  { id: "textbook", name: "7.2 − 4 = 3.2", labels: ["textbook"] },
  {
    id: "sharp",
    name: "an 8px field: 0px",
    fields: { main: { radius: 8, buttonRadius: 0 } },
    labels: ["sharp"],
  },
  { id: "visually", name: "★ not visually right", labels: ["visually-quote"] },
  {
    id: "five",
    name: "never sharper than 5px",
    fields: { main: { radius: 7.2, buttonRadius: 5 } },
    labels: [{ id: "five", lit: 1 }],
  },
  { id: "five-2", name: "a whole new page", labels: ["five"] },
  {
    id: "two",
    name: "minimum 2px → 3.6",
    fields: { main: { buttonRadius: "auto" } },
    labels: ["two"],
  },
  { id: "where-started", name: "where we started", labels: ["started-here"] },
  {
    id: "zoom-out",
    name: "zoom out",
    fields: { main: { outline: false } },
    camera: {},
    duration: 700,
  },

  // 6. After the take
  {
    id: "keep",
    name: "keep the recording?",
    fields: { main: { mode: "recorded", policy: "ask", writeMs: 600 } },
    labels: ["keep-recording"],
    duration: 1500,
  },
  {
    id: "ask",
    name: "ask?",
    fields: { main: { writeMs: 0 } },
    labels: [{ id: "policies", lit: 1 }],
  },
  {
    id: "always",
    name: "always?",
    fields: { main: { policy: "always" } },
    labels: [{ id: "policies", lit: 2 }],
  },
  {
    id: "never",
    name: "never?",
    fields: { main: { policy: "never" } },
    labels: ["policies"],
  },
  {
    id: "policy",
    name: "a policy",
    fields: { main: { policy: "ask" } },
    chips: {
      policy: {
        y: -84,
        mono: true,
        items: [{ label: 'recordingPolicy="ask"', state: "on" }],
      },
    },
    labels: ["policy"],
  },
  {
    id: "never-means",
    name: "never means never",
    fields: { main: { policy: "never" } },
    chips: {
      policy: {
        y: -84,
        mono: true,
        items: [{ label: 'recordingPolicy="never"', state: "on" }],
      },
    },
    labels: ["never"],
  },
  {
    id: "clean-3",
    name: "clean",
    fields: { main: { ...CLEAN, writeMs: undefined } },
    chips: { policy: null },
  },

  // 7. The API ★
  {
    id: "api",
    name: "★ 38 props",
    fields: { main: { opacity: 0 } },
    props: propCloud(0),
    labels: ["api-quote"],
    cue: "open",
  },
  {
    id: "api-23",
    name: "38 → 23",
    props: propCloud(15),
    labels: ["api-quote", { id: "api-count", lit: 2 }],
  },
  {
    id: "api-21",
    name: "→ 21",
    props: propCloud(17),
    labels: ["api-quote", { id: "api-count", lit: 3 }],
  },
  {
    id: "api-20",
    name: "→ 20",
    props: propCloud(17, { focus: "allowPause" }),
    labels: ["api-quote", { id: "allow-pause", lit: 1 }],
  },
  {
    id: "allow-pause",
    name: "allowPause?",
    labels: ["api-quote", "allow-pause"],
  },
  {
    id: "pause-gone",
    name: "gone",
    props: propCloud(18),
    labels: ["api-quote", "gone"],
  },
  {
    id: "api-18",
    name: "18",
    props: propCloud(20, { gone: true }),
    labels: ["eighteen"],
    cue: "success",
    duration: 900,
  },
  {
    id: "clean-4",
    name: "clean",
    fields: { main: { opacity: 1 } },
    props: null,
  },

  // 8. The name ★
  {
    id: "voice-input",
    name: "★ voice input",
    title: "Voice Input",
    labels: ["name-quote"],
  },
  { id: "three-words", name: "max 3 words", labels: ["three-words"] },
  {
    id: "name-1",
    name: "dictation field?",
    title: "Dictation Field",
    labels: [{ id: "names", lit: 1 }],
  },
  {
    id: "name-2",
    name: "voice text field?",
    title: "Voice Text Field",
    labels: [{ id: "names", lit: 2 }],
  },
  {
    id: "name-3",
    name: "voice-ready field?",
    title: "Voice-Ready Field",
    labels: [{ id: "names", lit: 3 }],
  },
  {
    id: "name-4",
    name: "speak-to-text field?",
    title: "Speak-to-Text Field",
    labels: ["names"],
  },
  {
    id: "dictation-input",
    name: "dictation input",
    title: "Dictation Input",
    labels: ["like-it"],
    cue: "success",
  },

  // 9. How it started, where it got
  {
    id: "started",
    name: "how it started",
    title: null,
    fields: {
      pill: {
        ...CLEAN,
        mode: "recording",
        radius: 999,
        width: 300,
        placeholder: "Hold to talk",
        x: 0,
        opacity: 1,
      },
      main: { opacity: 0 },
    },
    labels: [{ id: "started-got", lit: 1 }],
  },
  {
    id: "got",
    name: "where it got",
    fields: {
      pill: { x: -230, width: 300 },
      main: { x: 230, width: 380, opacity: 1 },
    },
    camera: { scale: 1.75 },
    labels: ["started-got"],
  },
  { id: "all-that", name: "all that for a text field", labels: ["all-that"] },
  {
    id: "done",
    name: "done. right?",
    fields: { pill: null, main: { x: 0, width: 420 } },
    camera: {},
    labels: ["done"],
  },
  {
    id: "no-field",
    name: "what if there's no field",
    camera: { scale: 2.1, rotate: -4, tilt: 10 },
    labels: ["no-field"],
    duration: 900,
  },
  {
    id: "another-time",
    name: "maybe another time",
    fields: { main: { opacity: 0 } },
    camera: { scale: 2.1, rotate: -4, tilt: 10 },
    background: "#0b0b0b",
    labels: ["another-time"],
  },
  {
    id: "continued",
    name: "to be continued",
    fields: { main: { opacity: 0 } },
    background: "#0b0b0b",
    labels: ["continued"],
  },
]

function resolve(list: Beat[]): Step<Scene>[] {
  let fields: Record<string, FieldScene> = {}
  let title: string | null = null
  let chipRows: Record<string, ChipRow> = {}
  let props: Scene["props"] = null
  let camera: Camera = {}

  return list.map((beat) => {
    if (beat.fields) {
      fields = { ...fields }
      for (const [id, patch] of Object.entries(beat.fields)) {
        if (patch === null) delete fields[id]
        else fields[id] = { ...fields[id], ...patch }
      }
    }
    if (beat.title !== undefined) title = beat.title
    if (beat.chips) {
      chipRows = { ...chipRows }
      for (const [id, row] of Object.entries(beat.chips)) {
        if (row === null) delete chipRows[id]
        else chipRows[id] = row
      }
    }
    if (beat.props !== undefined) props = beat.props
    if (beat.camera) camera = beat.camera

    return {
      id: beat.id,
      name: beat.name,
      scene: {
        fields,
        title,
        chips: chipRows,
        props,
        cursor: beat.cursor ?? null,
      },
      camera,
      background: beat.background,
      labels: (beat.labels ?? []).map((label) =>
        typeof label === "string" ? { id: label } : label
      ),
      cue: beat.cue,
      duration: beat.duration,
    }
  })
}

export const dictationInputDeck: Deck<Scene> = {
  id: "dictation-input",
  title: "Dictation Input · the life of a text field",
  baseScale: 2,
  labels,
  steps: resolve(beats),
  World: DictationWorld,
}
