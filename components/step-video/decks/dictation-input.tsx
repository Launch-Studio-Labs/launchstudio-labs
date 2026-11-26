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
 * "The life of a text field": the Dictation Input built up one piece at a
 * time, told the way the composer video tells its box. A part of the field
 * only shows once a caption has talked about it; the field always comes back
 * to clean; a few rare big moments. The story is in
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
      {Object.entries(scene.fields).map(([id, field]) => (
        <FieldView key={id} field={field} />
      ))}
      {scene.cursor ? (
        <FakeCursor
          cursor={scene.cursor}
          mic={micCentre(scene.fields.main ?? {})}
        />
      ) : null}
    </>
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
          // A new mode is a new take: the component starts fresh. The
          // policy is a live prop, so changing it keeps the answer.
          key={mode}
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
const low = { x: 960, y: 900 }
const middle = { x: 960, y: 540 }
const night = "#f4f4f4"

const labels: Record<string, LabelDef> = {
  life: { text: "the life of a text field", ...middle, size: 60 },
  "not-recorder": {
    text: "not a recorder.| a field.",
    ...middle,
    y: 625,
    color: "muted",
    size: 40,
  },
  "type-into": { text: "it's a field.| you type into it.", ...below },
  "rather-talk": {
    text: "and if you'd rather talk,| there's a mic.",
    ...below,
  },
  "where-mic": { text: "where does it go?", ...below },
  corner: { text: "the top right corner.| 28px.| 4px in.", ...low },
  "how-hard": { text: "how hard can it be?", ...below },

  press: { text: "press it,| and it starts listening.", ...below },
  glows: { text: "the field glows while you talk.", ...below },
  clock: { text: "it says it's listening.| and keeps time.", ...low },
  "stop-button": {
    text: "the mic becomes a stop button.| it breathes with your voice.",
    ...low,
  },
  stop: { text: "stop.| it writes it up.", ...below },
  land: {
    text: "and your words land in the field.| the mic turns into undo,| in case you hated it.",
    ...low,
    width: 1500,
  },

  "mic-corner": { text: "now. the corner of that mic.", ...low },
  "the-numbers": {
    text: "the field is 7.2px round.| the mic sits 4px in.",
    ...low,
  },
  textbook: { text: "the textbook says| 7.2 − 4 = 3.2px.", ...low },
  square: { text: "a 4px field?| 4 − 4 = 0.| square.", ...low },
  "looks-wrong": { text: "technically right.| looks wrong.", ...low, size: 52 },
  half: {
    text: "so it never goes under half the field's radius.| 3.6px.",
    ...low,
    width: 1500,
  },
  concentric: { text: "visually concentric.", ...low },

  "one-more": {
    text: "one more thing.| what happens to the recording?",
    ...below,
    y: 760,
  },
  "keeps-it": {
    text: "it can keep it,| say so right in the field,| and play it back.",
    ...below,
    y: 900,
    width: 1500,
  },
  policies: { text: "ask?| always send?| never send?", ...below, y: 900 },
  "never-means": { text: "never means never.| no line. no player.", ...below },

  "all-that": { text: "all that for a text field.", ...below },
  done: { text: "done.| right?", ...below },
  "no-field": { text: "hmm.| what if there's no field?", ...below },
  "another-time": {
    text: "ok.| maybe another time.",
    ...middle,
    size: 40,
    color: night,
  },
  continued: { text: "to be continued.", ...middle, size: 40, color: night },
}

// ---------------------------------------------------------------------------
// Steps. Each beat patches the one before; `resolve` below turns them into
// full states, so every step stands alone (back and jump land exactly).
//
// The rule: nothing in the field shows before a caption has talked about it.
// The answer lands with recordings "never" sent, so there's no recording line
// and no player until the recording gets its own beat.

type Beat = {
  id: string
  name: string
  fields?: Record<string, Partial<FieldScene> | null>
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
  modeFrom: undefined,
  modeAt: undefined,
  buttonRadius: "auto",
  radius: 7.2,
  policy: "never",
  outline: false,
}
const PLAIN = "Type your answer"
const ZOOM_CORNER: Camera = { x: 197, y: -2, scale: 12 }
const ON_CORNER: Camera = { x: 150, y: 0, scale: 3.4 }
const ON_CLOCK: Camera = { x: -150, y: 22, scale: 3.4 }
const ON_LINE: Camera = { x: -90, y: 92, scale: 3 }
const ON_PLAYER: Camera = { x: -60, y: 100, scale: 3 }
const CLICK_FROM = { x: 120, y: 60 }

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
    fields: { main: { ...CLEAN, mic: false, placeholder: PLAIN } },
    labels: [{ id: "type-into", lit: 1 }],
  },
  { id: "type-into", name: "you type into it", labels: ["type-into"] },
  {
    id: "rather-talk",
    name: "if you'd rather talk",
    labels: [{ id: "rather-talk", lit: 1 }],
  },
  {
    id: "mic-in",
    name: "there's a mic",
    fields: { main: { mic: true, placeholder: undefined } },
    labels: ["rather-talk"],
    cue: "tap",
  },
  { id: "where-mic", name: "where does it go?", labels: ["where-mic"] },
  {
    id: "corner",
    name: "top right, 28px, 4px in",
    camera: ON_CORNER,
    labels: [{ id: "corner", lit: 1 }],
  },
  { id: "corner-2", name: "28px", labels: [{ id: "corner", lit: 2 }] },
  { id: "corner-3", name: "4px in", labels: ["corner"] },
  {
    id: "how-hard",
    name: "how hard can it be?",
    camera: {},
    labels: ["how-hard"],
  },

  // 2. Talking
  {
    id: "press",
    name: "press it",
    fields: { main: { mode: "recording", modeFrom: "idle", modeAt: 700 } },
    cursor: { from: CLICK_FROM, to: "mic", clickAt: 560 },
    labels: [{ id: "press", lit: 1 }],
    cue: "tap",
    duration: 1000,
  },
  {
    id: "listening",
    name: "it starts listening",
    fields: { main: { modeFrom: undefined, modeAt: undefined } },
    labels: ["press"],
  },
  { id: "glows", name: "the field glows", labels: ["glows"] },
  {
    id: "clock",
    name: "listening, and a clock",
    camera: ON_CLOCK,
    labels: ["clock"],
  },
  {
    id: "stop-button",
    name: "a stop button that breathes",
    camera: ON_CORNER,
    labels: ["stop-button"],
  },
  {
    id: "stop",
    name: "stop → writing it up",
    fields: {
      main: { mode: "processing", modeFrom: "recording", modeAt: 560 },
    },
    cursor: { from: CLICK_FROM, to: "mic", clickAt: 480 },
    camera: {},
    labels: ["stop"],
    cue: "tap",
    duration: 900,
  },
  {
    id: "land",
    name: "the words land",
    fields: {
      main: { mode: "recorded", modeFrom: undefined, modeAt: undefined },
    },
    labels: [{ id: "land", lit: 1 }],
    duration: 1900,
  },
  {
    id: "undo",
    name: "the mic turns into undo",
    camera: ON_CORNER,
    labels: ["land"],
  },
  {
    id: "clean-1",
    name: "back to clean",
    fields: { main: { ...CLEAN } },
    camera: {},
  },

  // 3. The corner ★
  {
    id: "zoom-corner",
    name: "★ the corner of the mic",
    fields: { main: { outline: true } },
    camera: ZOOM_CORNER,
    labels: ["mic-corner"],
    cue: "open",
    duration: 800,
  },
  {
    id: "numbers",
    name: "7.2px round, 4px in",
    labels: [{ id: "the-numbers", lit: 1 }],
  },
  { id: "numbers-2", name: "4px in", labels: ["the-numbers"] },
  {
    id: "textbook",
    name: "textbook: 3.2px",
    fields: { main: { buttonRadius: 3.2 } },
    labels: ["textbook"],
  },
  {
    id: "square",
    name: "a 4px field: square",
    fields: { main: { radius: 4, buttonRadius: 0 } },
    labels: ["square"],
  },
  { id: "looks-wrong", name: "★ looks wrong", labels: ["looks-wrong"] },
  {
    id: "half",
    name: "never under half: 3.6px",
    fields: { main: { radius: 7.2, buttonRadius: "auto" } },
    labels: ["half"],
    cue: "success",
  },
  { id: "concentric", name: "visually concentric", labels: ["concentric"] },
  {
    id: "zoom-out",
    name: "zoom out",
    fields: { main: { outline: false } },
    camera: {},
  },

  // 4. The recording
  {
    id: "one-more",
    name: "what about the recording?",
    fields: { main: { mode: "recorded", policy: "never", writeMs: 600 } },
    labels: ["one-more"],
    duration: 1500,
  },
  {
    id: "keeps-it",
    name: "it keeps it, and says so",
    fields: { main: { policy: "ask" } },
    labels: [{ id: "keeps-it", lit: 1 }],
  },
  {
    id: "way-out",
    name: "says so in the field",
    camera: ON_LINE,
    labels: [{ id: "keeps-it", lit: 2 }],
  },
  {
    id: "playback",
    name: "play it back",
    camera: ON_PLAYER,
    labels: ["keeps-it"],
  },
  { id: "ask", name: "ask?", camera: {}, labels: [{ id: "policies", lit: 1 }] },
  {
    id: "always",
    name: "always send?",
    fields: { main: { policy: "always" } },
    labels: [{ id: "policies", lit: 2 }],
  },
  {
    id: "never",
    name: "never send?",
    fields: { main: { policy: "never" } },
    labels: ["policies"],
  },
  { id: "never-means", name: "never means never", labels: ["never-means"] },
  {
    id: "clean-2",
    name: "back to clean",
    fields: { main: { ...CLEAN, policy: "ask", writeMs: undefined } },
  },

  // 5. The end
  { id: "all-that", name: "all that for a text field", labels: ["all-that"] },
  { id: "done", name: "done. right?", labels: ["done"] },
  {
    id: "no-field",
    name: "what if there's no field?",
    camera: { scale: 2.1, rotate: -4, tilt: 10 },
    labels: ["no-field"],
    duration: 900,
  },
  {
    id: "another-time",
    name: "maybe another time",
    fields: { main: { opacity: 0 } },
    background: "#0b0b0b",
    labels: ["another-time"],
  },
  {
    id: "continued",
    name: "to be continued",
    background: "#0b0b0b",
    labels: ["continued"],
  },
]

function resolve(list: Beat[]): Step<Scene>[] {
  let fields: Record<string, FieldScene> = {}
  let camera: Camera = {}

  return list.map((beat) => {
    if (beat.fields) {
      fields = { ...fields }
      for (const [id, patch] of Object.entries(beat.fields)) {
        if (patch === null) delete fields[id]
        else fields[id] = { ...fields[id], ...patch }
      }
    }
    if (beat.camera) camera = beat.camera

    return {
      id: beat.id,
      name: beat.name,
      scene: { fields, cursor: beat.cursor ?? null },
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
