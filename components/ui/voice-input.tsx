"use client"

/**
 * Voice Input — a normal text field with a microphone in its corner.
 *
 * The field stays a field: people type into it as usual. The mic is the
 * extra. Recording plays Voice Glow along the field and shows a level meter,
 * the clock and the microphone under it; stopping sends the take for
 * transcription and writes the text back into the same field. Once there is a
 * recording, the corner button turns into a reset (with a confirm), a recap
 * player sits under the field, and a line pinned inside the field lets the
 * person choose whether their recording is sent at all.
 *
 * Wrap your own shadcn `Input` / `Textarea`, or leave `children` out and it
 * renders one.
 *
 * Part of the Launch Studio Labs Voice Input component.
 * https://labs.launchstudio.space/voice-input
 *
 * The glow is Voice Glow by Jakub Antalik — https://libraries.dev/voice —
 * used through the `voice-glow` npm package under the MIT License,
 * Copyright (c) 2026 Jakub Antalik.
 */

import {
  useCallback,
  useEffect,
  useId,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type KeyboardEvent,
  type ReactNode,
} from "react"
import {
  ArrowCounterClockwiseIcon,
  CaretDownIcon,
  CircleNotchIcon,
  MicrophoneIcon,
  StopIcon,
} from "@phosphor-icons/react"
import {
  VoiceBeam,
  type VoiceBeamColorVariant,
  type VoiceBeamMotion,
} from "voice-glow"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Popover,
  PopoverContent,
  PopoverDescription,
  PopoverTitle,
  PopoverTrigger,
} from "@/components/ui/popover"
import {
  LiveWaveform,
  VoicePlayer,
  type VoiceWaveformStyle,
} from "@/components/ui/voice-waveform"
import {
  useVoiceRecorder,
  type VoiceRecorderProblem,
  type VoiceTake,
} from "@/hooks/use-voice-recorder"
import { cn } from "@/lib/utils"
import { formatElapsed, type AudioInput } from "@/lib/voice-recording"

export type { VoiceTake } from "@/hooks/use-voice-recorder"
export type { VoiceWaveformStyle } from "@/components/ui/voice-waveform"

// ── Public types ──

/**
 * What happens when a take ends.
 * - `auto`: it goes straight to `onTranscribe` (the portal behaviour)
 * - `manual`: it is held under the field with playback, Send and Discard
 */
export type VoiceSubmitMode = "auto" | "manual"

/**
 * How the transcript lands in the field.
 * - `replace`: it becomes the field's text (the portal behaviour)
 * - `append`: it is added after what is already there
 */
export type VoiceInsertMode = "replace" | "append"

/**
 * How the voice is drawn — one family, used both inside the field
 * (`fieldEffect`) and in the meter under it (`meter`).
 * - `glow`: Voice Glow, the soft light that rises with the voice
 * - `level`: three level bars (the portal's meter)
 * - `bars` / `wave` / `dots`: a live waveform
 * - `none`: nothing
 */
export type VoiceVisual = "glow" | "level" | VoiceWaveformStyle | "none"

/**
 * The mic button's corner radius.
 * - `"auto"`: concentric with the field — the field's radius minus the
 *   button's inset (`max(0, fieldRadius - inset)`)
 * - `"full"`: a circle
 * - a number: that radius, in px
 */
export type VoiceButtonRadius = "auto" | "full" | number

/** What `onTranscribe` resolves with. */
export interface VoiceTranscription {
  transcript: string
  /**
   * Your reference to the stored audio, if the server kept it. Handed back
   * to `onDeleteRecording` when the person resets, re-records, or turns
   * sending recordings off.
   */
  audioId?: string | null
}

export interface VoiceTranscribeContext {
  /**
   * The person's choice. False means: transcribe, then throw the audio away
   * — do not store it, do not forward it. The component also leaves the
   * audio out of the result it hands to `onResult`.
   */
  sendRecording: boolean
  /** Aborted when the person cancels or the component unmounts. */
  signal: AbortSignal
}

export type VoiceTranscribe = (
  take: VoiceTake,
  context: VoiceTranscribeContext
) => Promise<VoiceTranscription>

/**
 * Throw from `onTranscribe` to pick the message the person sees.
 * - `empty`: the model heard no words (shown as a microphone problem if the
 *   take was flat silence)
 * - `unconfigured`: transcription is not set up on this server
 * - `failed`: anything else; the take is kept so "Try again" can resend it
 */
export class VoiceTranscriptionError extends Error {
  constructor(
    readonly code: "empty" | "unconfigured" | "failed",
    message?: string
  ) {
    super(message ?? code)
    this.name = "VoiceTranscriptionError"
  }
}

export interface VoiceResult {
  transcript: string
  /** The field's text after the transcript was written in. */
  value: string
  durationMs: number
  /** The recording — or null when the person chose not to send it. */
  audio: Blob | null
  mimeType: string
  /** From `onTranscribe`; null when nothing was stored. */
  audioId: string | null
  /** Whether the audio was sent along with this result. */
  sentRecording: boolean
}

export type VoiceInputProblem =
  | VoiceRecorderProblem
  | "silent"
  | "empty"
  | "unconfigured"
  | "failed"
  | "delete-failed"

export interface VoiceInputLabels {
  record: string
  stop: string
  preparing: string
  listening: string
  quiet: string
  pause: string
  paused: string
  resume: string
  processing: string
  send: string
  discard: string
  retry: string
  reset: string
  resetTitle: string
  resetBody: (length: string) => string
  resetConfirm: string
  resetCancel: string
  microphone: string
  chooseMic: string
  systemDefault: string
  recordingsSent: string
  recordingsWithheld: string
  withholdRecordings: string
  sendRecordings: string
  play: string
  pausePlayback: string
  position: string
  problems: Record<VoiceInputProblem, string>
  announce: {
    recording: (mic: string) => string
    done: string
    cancelled: string
    reset: string
    switched: (mic: string) => string
    nextMic: (mic: string) => string
  }
}

/** The portal's copy, minus anything questionnaire-specific. */
export const voiceInputLabels: VoiceInputLabels = {
  record: "Record voice answer",
  stop: "Stop and submit recording",
  preparing: "Getting the microphone ready…",
  listening: "Listening",
  quiet: "No sound yet",
  pause: "Pause",
  paused: "Paused",
  resume: "Resume",
  processing: "Writing your answer…",
  send: "Send",
  discard: "Discard",
  retry: "Try again",
  reset: "Reset recording & answer",
  resetTitle: "Reset this answer?",
  resetBody: (length) =>
    `This deletes the ${length} recording and clears the text. It can't be undone.`,
  resetConfirm: "Delete",
  resetCancel: "Cancel",
  microphone: "Microphone",
  chooseMic: "Choose microphone",
  systemDefault: "System default",
  recordingsSent: "Full recordings are sent with your answers.",
  recordingsWithheld: "Recordings won't be sent with your answers.",
  withholdRecordings: "Don't send recordings",
  sendRecordings: "Send recordings",
  play: "Play recording",
  pausePlayback: "Pause recording",
  position: "Recording position",
  problems: {
    unsupported: "This browser can't record audio. Type your answer instead.",
    insecure:
      "Recording needs a secure (https) page. Type your answer instead.",
    denied:
      "Microphone access is blocked. Allow it in the browser, or type your answer.",
    "no-device": "No microphone was found. Type your answer instead.",
    "too-short":
      "That was too short. Say your answer, then stop the recording.",
    error:
      "Couldn't turn that recording into an answer. Try again, or type it.",
    silent:
      "Your microphone didn't pick up any sound. Choose another one, or check your system's input settings.",
    empty:
      "We couldn't make out any words. Try again a little closer to the microphone, or type your answer.",
    unconfigured:
      "Voice answers aren't available right now. Type your answer instead.",
    failed:
      "Couldn't transcribe that recording. Try again, or type your answer.",
    "delete-failed": "Couldn't delete the stored recording. Try again.",
  },
  announce: {
    recording: (mic) => `Recording with ${mic}. Press Escape to cancel.`,
    done: "Answer written from your recording.",
    cancelled: "Recording cancelled.",
    reset: "Recording and answer cleared.",
    switched: (mic) => `Switched to ${mic}. Recording started again.`,
    nextMic: (mic) => `The next recording will use ${mic}.`,
  },
}

/** Keys the recap player, so each new take mounts a fresh one. */
let takeCounter = 0
function nextTakeId() {
  takeCounter += 1
  return takeCounter
}

/** Problems where re-sending the same take can succeed. */
const RETRYABLE = new Set<VoiceInputProblem>(["failed", "error"])
/** Problems where the microphone itself is the likely culprit. */
const MIC_PROBLEMS = new Set<VoiceInputProblem>([
  "empty",
  "silent",
  "no-device",
])
/** Breathing room between the last line of text and the note inside the field. */
const NOTE_GAP = 8

/** Greys for the glow's band, so `glowVariant="mono"` reads as neutral. */
const NEUTRAL_BAND = {
  light: {
    core: "#404040",
    above: "#737373",
    mid: "#a3a3a3",
    below: "#d4d4d4",
  },
  dark: { core: "#ffffff", above: "#d4d4d4", mid: "#a3a3a3", below: "#737373" },
} as const

/**
 * The field the mic sits in when you don't bring one: the portal's Input and
 * Textarea, so the default looks the same wherever it is installed.
 */
const FIELD_BASE =
  "w-full min-w-0 rounded-lg border border-transparent bg-input/50 px-3 text-base transition-[color,box-shadow,background-color] outline-none placeholder:text-muted-foreground focus-visible:border-ring focus-visible:ring-3 focus-visible:ring-ring/30 disabled:cursor-not-allowed disabled:opacity-50 aria-invalid:border-destructive aria-invalid:ring-3 aria-invalid:ring-destructive/20 md:text-sm dark:aria-invalid:border-destructive/50 dark:aria-invalid:ring-destructive/40"
const INPUT_CLASS = cn(FIELD_BASE, "h-9 py-1")
const TEXTAREA_CLASS = cn(
  FIELD_BASE,
  "flex field-sizing-content min-h-24 resize-none py-3"
)

export type VoiceFieldProps = Omit<
  ComponentProps<"textarea">,
  "value" | "defaultValue" | "onChange" | "children" | "ref"
>

export interface VoiceInputProps extends Omit<
  ComponentProps<"div">,
  "onChange" | "children" | "defaultValue"
> {
  /**
   * The field to put the mic on — a shadcn `Input` or `Textarea`. Leave it
   * out and the component renders one (see `multiline`).
   */
  children?: ReactNode
  /** The built-in field is a textarea. Ignored when you pass `children`. */
  multiline?: boolean
  /** Text of the built-in field (controlled). */
  value?: string
  defaultValue?: string
  /**
   * The field's text changed — typing in the built-in field, or a
   * transcript written in. With `children`, pass `value` too and this is
   * called with the text after a transcript lands.
   */
  onValueChange?: (value: string) => void
  placeholder?: string
  /** Props for the built-in field: id, name, aria-*, maxLength… */
  fieldProps?: VoiceFieldProps
  /** @default "replace" */
  insert?: VoiceInsertMode

  // Pipeline
  /** Turns a take into text. Leave it out for a mic that only records. */
  onTranscribe?: VoiceTranscribe
  /** A transcript landed. */
  onResult?: (result: VoiceResult) => void
  /** The person reset the answer (after the confirm). */
  onReset?: () => void
  /**
   * Remove stored audio. Called with the result whenever a stored recording
   * should stop existing: reset, a new take replacing it, or sending turned
   * off after it was sent. Only called when the result carries an `audioId`.
   * Reject to show "couldn't delete".
   */
  onDeleteRecording?: (result: VoiceResult) => void | Promise<void>
  /** Recording started or stopped — e.g. to block the mic on other fields. */
  onActiveChange?: (active: boolean) => void
  /** @default "auto" */
  submit?: VoiceSubmitMode

  // Privacy
  /** Controlled: whether audio is sent along with the transcript. */
  sendRecording?: boolean
  /** @default true */
  defaultSendRecording?: boolean
  onSendRecordingChange?: (send: boolean) => void

  // Recording
  /** Pause/resume in the meter row. @default false */
  allowPause?: boolean
  /** Browser automatic gain control. @default true */
  autoGainControl?: boolean
  /** @default 300000 (5 minutes) */
  maxDurationMs?: number
  /** @default 700 */
  minDurationMs?: number
  /** Replaces getUserMedia — tests, demos, custom sources. */
  getStream?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  /** Disables the mic (the field stays usable). */
  disabled?: boolean

  // Parts
  /** @default true */
  showMicPicker?: boolean
  /** @default true */
  showTimer?: boolean
  /** The recap player under the field. @default true */
  showPlayback?: boolean
  /** The send / don't-send line inside the field. @default true */
  showRecordingToggle?: boolean
  /** Ask before resetting. @default true */
  confirmReset?: boolean

  // Look
  /** The voice drawn inside the field while recording. @default "glow" */
  fieldEffect?: VoiceVisual
  /** The voice drawn in the line under the field. @default "level" */
  meter?: VoiceVisual
  /** Waveform in the recap player. @default "bars" */
  playerWaveform?: VoiceWaveformStyle
  /** Corner radius of the field in px. Default: the field's own. */
  radius?: number
  /** The mic button's corner radius. @default "auto" (concentric) */
  buttonRadius?: VoiceButtonRadius
  /** Voice Glow palette. @default "mono" (neutral) */
  glowVariant?: VoiceBeamColorVariant
  /** Your own glow colours, centre first — overrides `glowVariant`. */
  glowColors?: string[]
  /** 0–1. @default 1 */
  glowStrength?: number
  /** Follows the `.dark` class on <html> unless set. */
  theme?: "light" | "dark"

  labels?: Partial<Omit<VoiceInputLabels, "problems" | "announce">> & {
    problems?: Partial<VoiceInputLabels["problems"]>
    announce?: Partial<VoiceInputLabels["announce"]>
  }
}

export function VoiceInput({
  children,
  multiline = false,
  value: valueProp,
  defaultValue = "",
  onValueChange,
  placeholder,
  fieldProps,
  insert = "replace",
  onTranscribe,
  onResult,
  onReset,
  onDeleteRecording,
  onActiveChange,
  submit = "auto",
  sendRecording: sendRecordingProp,
  defaultSendRecording = true,
  onSendRecordingChange,
  allowPause = false,
  autoGainControl = true,
  maxDurationMs,
  minDurationMs,
  getStream,
  disabled = false,
  showMicPicker = true,
  showTimer = true,
  showPlayback = true,
  showRecordingToggle = true,
  confirmReset = true,
  fieldEffect = "glow",
  meter = "level",
  playerWaveform = "bars",
  radius,
  buttonRadius = "auto",
  glowVariant = "mono",
  glowColors,
  glowStrength = 1,
  theme: themeProp,
  labels: labelOverrides,
  className,
  style,
  onKeyDown,
  ...props
}: VoiceInputProps) {
  const labels: VoiceInputLabels = {
    ...voiceInputLabels,
    ...labelOverrides,
    problems: { ...voiceInputLabels.problems, ...labelOverrides?.problems },
    announce: { ...voiceInputLabels.announce, ...labelOverrides?.announce },
  }
  const theme = useDocumentTheme(themeProp)
  const reduced = useReducedMotion()

  const [textState, setTextState] = useState(defaultValue)
  const text = valueProp ?? textState
  const [sendState, setSendState] = useState(defaultSendRecording)
  const sendRecording = sendRecordingProp ?? sendState

  const [processing, setProcessing] = useState(false)
  /** A finished take waiting for Send (`submit="manual"`). */
  const [held, setHeld] = useState<VoiceTake | null>(null)
  /** The last take that failed server-side, kept so "Try again" can resend it. */
  const [lastTake, setLastTake] = useState<VoiceTake | null>(null)
  /** This field's recording, once a take has produced text. */
  const [result, setResult] = useState<VoiceResult | null>(null)
  /** The take behind `result` (or `held`), played back from memory. */
  const [localAudio, setLocalAudio] = useState<{
    id: number
    blob: Blob
    durationMs: number
  } | null>(null)
  const [sendProblem, setSendProblem] = useState<VoiceInputProblem | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const [noteSpace, setNoteSpace] = useState(0)

  /** The field's text before the current recording's transcript went in. */
  const beforeRef = useRef("")
  const abortRef = useRef<AbortController | null>(null)
  const wrapperRef = useRef<HTMLDivElement | null>(null)
  const noteRef = useRef<HTMLDivElement | null>(null)
  const cornerRef = useRef<HTMLSpanElement | null>(null)
  const ringRef = useRef<HTMLSpanElement | null>(null)
  /** Keep focus on the corner when the button there is swapped out. */
  const cornerFocusRef = useRef(false)

  const recorder = useVoiceRecorder({
    autoGainControl,
    maxDurationMs,
    minDurationMs,
    getStream,
    onTake: (take) => {
      setLastTake(null)
      if (submit === "manual" && onTranscribe) {
        setHeld(take)
        setLocalAudio({
          id: nextTakeId(),
          blob: take.blob,
          durationMs: take.durationMs,
        })
        return
      }
      void send(take)
    },
  })
  const { status, getLevel } = recorder
  const recording = status === "recording"
  const paused = status === "paused"
  const live = recording || paused
  const busy = status === "requesting" || status === "stopping" || processing
  const idle = !live && !busy
  const problem: VoiceInputProblem | null = recorder.problem ?? sendProblem
  const recorded = result !== null || held !== null

  // Cancel an in-flight send when the component goes away.
  useEffect(() => () => abortRef.current?.abort(), [])

  // Other fields can block their mics while this one records.
  const onActiveChangeRef = useRef(onActiveChange)
  useEffect(() => {
    onActiveChangeRef.current = onActiveChange
  })
  useEffect(() => {
    onActiveChangeRef.current?.(live)
  }, [live])

  // The ring around the stop button and the meter bars breathe with the
  // voice; written per frame, no renders.
  useEffect(() => {
    if (!live) return
    let raf = 0
    const shape = [0.7, 1, 0.82]
    // Level bars can sit in the field, in the meter, or both.
    const levelGroups = Array.from(
      wrapperRef.current?.querySelectorAll<HTMLElement>("[data-voice-level]") ??
        []
    )
    const tick = () => {
      const level = paused ? 0 : getLevel()
      const ring = ringRef.current
      if (ring) {
        if (reduced) {
          ring.style.transform = "scale(1.18)"
          ring.style.opacity = String(0.08 + level * 0.32)
        } else {
          ring.style.transform = `scale(${1 + level * 0.36})`
          ring.style.opacity = String(0.12 + level * 0.22)
        }
      }
      for (const group of levelGroups) {
        const bars = group.children
        for (let i = 0; i < bars.length; i++) {
          const bar = bars[i] as HTMLElement
          const value = Math.min(1, level * shape[i % 3] * 1.25)
          if (reduced) {
            bar.style.transform = "scaleY(1)"
            bar.style.opacity = String(0.25 + value * 0.75)
          } else {
            bar.style.transform = `scaleY(${0.25 + value * 0.75})`
            bar.style.opacity = "1"
          }
        }
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    const ring = ringRef.current
    return () => {
      cancelAnimationFrame(raf)
      if (ring) ring.style.opacity = "0"
    }
  }, [live, paused, reduced, getLevel, meter, fieldEffect])

  // The button's corners follow the field's: concentric by default, so the
  // gap between them is even all the way round. Measured, not assumed — the
  // field may be yours, with its own radius, and the inset differs between
  // an input (4px) and a textarea (8px).
  useEffect(() => {
    const wrapper = wrapperRef.current
    const corner = cornerRef.current
    const field = wrapper?.querySelector<HTMLElement>(
      "[data-slot=input], [data-slot=textarea]"
    )
    if (!wrapper || !corner) return
    const measure = () => {
      let fieldRadius = 0
      let inset = 0
      if (field) {
        const fieldRect = field.getBoundingClientRect()
        const cornerRect = corner.getBoundingClientRect()
        inset = Math.max(
          0,
          Math.min(
            cornerRect.top - fieldRect.top,
            fieldRect.right - cornerRect.right
          )
        )
        fieldRadius = parseFloat(getComputedStyle(field).borderTopRightRadius)
        if (!Number.isFinite(fieldRadius)) fieldRadius = 0
      }
      const value =
        buttonRadius === "full"
          ? corner.offsetWidth / 2
          : buttonRadius === "auto"
            ? Math.max(0, fieldRadius - inset)
            : Math.max(0, buttonRadius)
      corner.style.setProperty("--voice-button-radius", `${value}px`)
      wrapper.style.setProperty("--voice-field-radius", `${fieldRadius}px`)
    }
    measure()
    const observer = new ResizeObserver(measure)
    if (field) observer.observe(field)
    return () => observer.disconnect()
  }, [buttonRadius, radius, multiline, children])

  // Track the note's real height (copy length, language, width): it becomes
  // the field's bottom padding so typed text always ends above it.
  const showNote = showRecordingToggle && Boolean(onTranscribe) && recorded
  useEffect(() => {
    const element = noteRef.current
    if (!showNote || !element) return
    const observer = new ResizeObserver(() => {
      setNoteSpace(Math.ceil(element.getBoundingClientRect().height))
    })
    observer.observe(element)
    return () => observer.disconnect()
  }, [showNote])

  // Browsers without `field-sizing: content` keep a textarea at a fixed
  // height and scroll it. Grow it with its text instead while the note is
  // there, so lines never scroll underneath it.
  useEffect(() => {
    if (!showNote || typeof CSS === "undefined") return
    if (CSS.supports("field-sizing", "content")) return
    const textarea = wrapperRef.current?.querySelector("textarea")
    if (!textarea) return
    const fit = () => {
      textarea.style.height = "auto"
      textarea.style.height = `${textarea.scrollHeight + 2}px`
    }
    fit()
    textarea.addEventListener("input", fit)
    return () => {
      textarea.removeEventListener("input", fit)
      textarea.style.height = ""
    }
  }, [showNote, noteSpace])

  // The corner swaps mic ↔ reset; keep keyboard focus there when it does.
  const cornerKey = idle && result && !held ? "reset" : "mic"
  useEffect(() => {
    const corner = cornerRef.current
    if (!cornerFocusRef.current || !corner) return
    if (corner.contains(document.activeElement)) return
    if (document.activeElement && document.activeElement !== document.body) {
      cornerFocusRef.current = false
      return
    }
    corner.querySelector<HTMLElement>("button")?.focus()
  }, [cornerKey])

  function setText(next: string) {
    if (valueProp === undefined) setTextState(next)
    onValueChange?.(next)
  }

  function setSendRecording(next: boolean) {
    if (sendRecordingProp === undefined) setSendState(next)
    onSendRecordingChange?.(next)
  }

  async function deleteStored(value: VoiceResult | null) {
    if (!value?.audioId || !onDeleteRecording) return true
    try {
      await onDeleteRecording(value)
      return true
    } catch {
      setSendProblem("delete-failed")
      return false
    }
  }

  function isMultiline() {
    return Boolean(wrapperRef.current?.querySelector("textarea"))
  }

  async function send(take: VoiceTake) {
    if (!onTranscribe) {
      // A mic that only records: keep the take for playback.
      setLocalAudio({
        id: nextTakeId(),
        blob: take.blob,
        durationMs: take.durationMs,
      })
      return
    }
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setSendProblem(null)
    setProcessing(true)
    const keep = sendRecording
    try {
      const output = await onTranscribe(take, {
        sendRecording: keep,
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      const transcript = output.transcript.trim()
      if (!transcript) throw new VoiceTranscriptionError("empty")

      // A new take replaces the last one: its stored audio goes.
      const previous = result
      if (previous) await deleteStored(previous)

      const before = previous ? beforeRef.current : text
      beforeRef.current = before
      const value =
        insert === "append" && before.trim()
          ? `${before.replace(/\s+$/, "")}${isMultiline() ? "\n\n" : " "}${transcript}`
          : transcript
      const next: VoiceResult = {
        transcript,
        value,
        durationMs: take.durationMs,
        audio: keep ? take.blob : null,
        mimeType: take.mimeType,
        audioId: keep ? (output.audioId ?? null) : null,
        sentRecording: keep,
      }
      setText(value)
      setResult(next)
      setHeld(null)
      setLastTake(null)
      setLocalAudio({
        id: nextTakeId(),
        blob: take.blob,
        durationMs: take.durationMs,
      })
      setAnnouncement(labels.announce.done)
      onResult?.(next)
    } catch (error) {
      if (controller.signal.aborted) return
      const code =
        error instanceof VoiceTranscriptionError ? error.code : "failed"
      // An empty transcript from a take the meter saw as flat silence is a
      // microphone problem, not a mumbling one.
      setSendProblem(code === "empty" && take.silent ? "silent" : code)
      if (code === "failed") setLastTake(take)
    } finally {
      if (abortRef.current === controller) {
        abortRef.current = null
        setProcessing(false)
      }
    }
  }

  async function onPress() {
    if (busy) return
    if (live) {
      await recorder.stop()
      return
    }
    if (disabled) return
    setSendProblem(null)
    setAnnouncement("")
    setLastTake(null)
    if (held) {
      // A new take replaces the one waiting for Send.
      setHeld(null)
      setLocalAudio(null)
    }
    await recorder.start()
  }

  async function cancel() {
    await recorder.cancel()
    setAnnouncement(labels.announce.cancelled)
  }

  function cancelProcessing() {
    abortRef.current?.abort()
    abortRef.current = null
    setProcessing(false)
    setAnnouncement(labels.announce.cancelled)
  }

  function discardHeld() {
    setHeld(null)
    setLocalAudio(null)
    setAnnouncement(labels.announce.cancelled)
  }

  async function reset() {
    if (!(await deleteStored(result))) return
    setText(insert === "append" ? beforeRef.current : "")
    setResult(null)
    setLocalAudio(null)
    setLastTake(null)
    setSendProblem(null)
    cornerFocusRef.current = true
    onReset?.()
    setAnnouncement(labels.announce.reset)
  }

  async function toggleSendRecording() {
    const next = !sendRecording
    setSendRecording(next)
    setAnnouncement(next ? labels.recordingsSent : labels.recordingsWithheld)
    // Turning it off is immediate: a recording already sent stops existing.
    if (!next && result?.sentRecording) {
      if (!(await deleteStored(result))) return
      const withheld: VoiceResult = {
        ...result,
        audio: null,
        audioId: null,
        sentRecording: false,
      }
      setResult(withheld)
      onResult?.(withheld)
    }
  }

  function retry() {
    const take = lastTake
    if (!take || !idle) return
    void send(take)
  }

  async function chooseInput(deviceId: string) {
    const { restarted, input } = await recorder.chooseInput(deviceId)
    if (!input) return
    setAnnouncement(
      restarted
        ? labels.announce.switched(input.label)
        : labels.announce.nextMic(input.label)
    )
  }

  function handleKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    onKeyDown?.(event)
    if (event.defaultPrevented || event.key !== "Escape") return
    if (live) {
      event.preventDefault()
      void cancel()
    } else if (processing) {
      event.preventDefault()
      cancelProcessing()
    }
  }

  const motion = useProcessingMotion(processing && !reduced)
  const label = live
    ? labels.stop
    : processing
      ? labels.processing
      : busy
        ? labels.preparing
        : labels.record
  const canRetry =
    problem !== null && RETRYABLE.has(problem) && lastTake !== null
  const showMicMenu =
    showMicPicker &&
    recorder.inputs.length > 0 &&
    (live || (problem !== null && MIC_PROBLEMS.has(problem)))
  const micMenu = showMicMenu ? (
    <MicMenu
      inputs={recorder.inputs}
      active={recorder.activeInput}
      onChoose={(id) => void chooseInput(id)}
      labels={labels}
    />
  ) : null
  const playback =
    showPlayback && idle && localAudio && (result || held) ? localAudio : null
  const playerLabels = {
    play: labels.play,
    pause: labels.pausePlayback,
    position: labels.position,
  }

  // The built-in field: the portal's Input / Textarea.
  const fieldStyle =
    radius !== undefined
      ? { borderRadius: radius, ...fieldProps?.style }
      : fieldProps?.style
  const field =
    children ??
    (multiline ? (
      <textarea
        data-slot="textarea"
        placeholder={placeholder}
        {...fieldProps}
        style={fieldStyle}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={cn(TEXTAREA_CLASS, fieldProps?.className)}
      />
    ) : (
      <input
        data-slot="input"
        type="text"
        placeholder={placeholder}
        {...(fieldProps as ComponentProps<"input">)}
        style={fieldStyle}
        value={text}
        onChange={(event) => setText(event.target.value)}
        className={cn(INPUT_CLASS, fieldProps?.className)}
      />
    ))

  // The send-recordings note lives inside the field, pinned bottom-left, and
  // only once this field has a recording. Its measured height becomes the
  // field's bottom padding, so typed text always ends above it.
  const noteSpaceStyle = showNote
    ? ({ "--voice-note-space": `${noteSpace + NOTE_GAP}px` } as CSSProperties)
    : undefined
  const sendNote = showNote ? (
    <div
      ref={noteRef}
      className="pointer-events-none absolute inset-x-0 bottom-0 z-[4] px-3 pb-2.5"
    >
      <p className="pt-2 text-xs leading-relaxed text-muted-foreground">
        {sendRecording ? labels.recordingsSent : labels.recordingsWithheld}{" "}
        <button
          type="button"
          onClick={() => void toggleSendRecording()}
          className="pointer-events-auto rounded-sm font-medium text-foreground underline decoration-foreground/25 underline-offset-2 transition-[text-decoration-color] outline-none hover:decoration-foreground/60 focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          {sendRecording ? labels.withholdRecordings : labels.sendRecordings}
        </button>
      </p>
    </div>
  ) : null

  /** Shared by the field glow and the glow meter. */
  const glowProps = {
    theme,
    colorVariant: glowVariant,
    colors: glowColors,
    // Voice Glow's band keeps its own tint (pink on light) whatever the
    // palette; a neutral glow needs a neutral band too.
    bandColors:
      glowVariant === "mono" && !glowColors ? NEUTRAL_BAND[theme] : undefined,
    strength: glowStrength,
  }

  const state = live
    ? status
    : processing
      ? "processing"
      : busy
        ? status
        : held
          ? "held"
          : result
            ? "recorded"
            : "idle"

  return (
    <div
      ref={wrapperRef}
      data-slot="voice-input"
      data-state={state}
      onKeyDown={handleKeyDown}
      style={{ ...noteSpaceStyle, ...style }}
      className={cn(
        "group/voice-field relative",
        // Room for the button so typed text and the placeholder never run
        // underneath it: inset + 28px button + 8px breathing room.
        "[&_[data-slot=input]]:pr-10 [&_[data-slot=textarea]]:pr-11",
        // A recorded field reserves a footer strip for the note. A single-line
        // input grows downward: its text keeps the 36px row the mic is
        // centred on, and the note gets the space under it.
        showNote &&
          "[&_[data-slot=input]]:h-auto [&_[data-slot=input]]:pt-1.5 [&_[data-slot=input]]:pb-(--voice-note-space) md:[&_[data-slot=input]]:pt-2 [&_[data-slot=textarea]]:pb-(--voice-note-space)",
        className
      )}
      {...props}
    >
      <VoiceBeam
        stream={recording ? recorder.stream : null}
        motion={motion}
        type="default"
        {...glowProps}
        active={fieldEffect === "glow" && (live || processing)}
        paused={paused}
        borderRadius={radius}
        className="w-full"
        css={`
          [data-voice-beam="{id}"]:not([data-active]):not([data-fading]) {
            overflow: visible;
          }
        `}
      >
        {field}
        {sendNote}
        {live && fieldEffect !== "glow" && fieldEffect !== "none" && (
          <FieldVisual
            visual={fieldEffect}
            analyser={recorder.analyser}
            getLevel={getLevel}
            paused={paused}
          />
        )}
      </VoiceBeam>

      <span
        ref={cornerRef}
        onFocusCapture={() => {
          cornerFocusRef.current = true
        }}
        onBlurCapture={(event) => {
          // Focus that leaves on purpose stays gone; focus lost to a button
          // the corner swapped out is put back.
          if (event.relatedTarget) cornerFocusRef.current = false
        }}
        className={cn(
          "absolute top-1 right-1 z-20 size-7 group-has-[[data-slot=textarea]]/voice-field:top-2 group-has-[[data-slot=textarea]]/voice-field:right-2",
          // Until it is measured: concentric with a shadcn rounded-lg field.
          "[--voice-button-radius:max(0px,calc(var(--radius,0.5rem)-4px))] group-has-[[data-slot=textarea]]/voice-field:[--voice-button-radius:max(0px,calc(var(--radius,0.5rem)-8px))]"
        )}
      >
        <span
          ref={ringRef}
          aria-hidden="true"
          className={cn(
            "pointer-events-none absolute inset-0 rounded-[var(--voice-button-radius)] bg-[var(--voice-accent,var(--color-foreground))] opacity-0 transition-opacity duration-200",
            !recording && "invisible"
          )}
        />
        {cornerKey === "reset" ? (
          <ResetControl
            length={formatElapsed(result?.durationMs ?? 0)}
            confirm={confirmReset}
            labels={labels}
            onConfirm={() => void reset()}
          />
        ) : (
          <button
            type="button"
            onClick={() => void onPress()}
            // Busy stays focusable (aria-disabled) so keyboard focus isn't
            // dropped to the page while the answer is written.
            disabled={disabled && !live}
            aria-disabled={busy || undefined}
            aria-label={label}
            aria-busy={busy || undefined}
            title={live ? undefined : label}
            data-state={live ? status : busy ? "busy" : "idle"}
            className={cn(
              CORNER_BUTTON,
              live
                ? "bg-[var(--voice-accent,var(--color-foreground))] text-[var(--voice-accent-foreground,var(--color-background))] shadow-[0_1px_2px_rgba(0,0,0,0.12)] hover:opacity-90"
                : REST_BUTTON,
              disabled && !live && "opacity-50"
            )}
          >
            {busy ? (
              <CircleNotchIcon
                className="size-3.5 animate-spin text-muted-foreground"
                aria-hidden="true"
              />
            ) : live ? (
              <StopIcon className="size-3" weight="fill" aria-hidden="true" />
            ) : (
              <MicrophoneIcon
                className="size-3.5"
                weight="fill"
                aria-hidden="true"
              />
            )}
          </button>
        )}
      </span>

      {live && (
        <div className="mt-2 flex min-h-6 items-center gap-2 text-xs font-medium text-muted-foreground">
          {meter !== "none" && (
            <MeterVisual
              visual={meter}
              analyser={recorder.analyser}
              getLevel={getLevel}
              paused={paused}
              stream={recording ? recorder.stream : null}
              glow={glowProps}
            />
          )}
          <span
            className={cn(
              "shrink-0",
              recorder.quiet && !paused && "font-semibold text-foreground"
            )}
          >
            {paused
              ? labels.paused
              : recorder.quiet
                ? labels.quiet
                : labels.listening}
          </span>
          {showTimer && (
            <span className="shrink-0 text-muted-foreground/70 tabular-nums">
              {formatElapsed(recorder.elapsedMs)}
            </span>
          )}
          {allowPause && (
            <button
              type="button"
              onClick={paused ? recorder.resume : recorder.pause}
              className={TEXT_BUTTON}
            >
              {paused ? labels.resume : labels.pause}
            </button>
          )}
          <span className="ml-auto flex min-w-0 items-center">{micMenu}</span>
        </div>
      )}

      {busy && !live && (
        <p className="mt-2 flex min-h-6 items-center text-xs font-medium text-muted-foreground">
          {processing ? labels.processing : labels.preparing}
        </p>
      )}

      {held && idle && (
        <div className="mt-2.5 flex items-center gap-2">
          {playback ? (
            <VoicePlayer
              key={playback.id}
              source={playback.blob}
              durationMs={playback.durationMs}
              waveform={playerWaveform}
              labels={playerLabels}
              className="min-w-0 flex-1"
            />
          ) : (
            <span className="flex-1 text-xs text-muted-foreground tabular-nums">
              {formatElapsed(held.durationMs)}
            </span>
          )}
          <Button variant="ghost" size="xs" onClick={discardHeld}>
            {labels.discard}
          </Button>
          <Button size="xs" onClick={() => void send(held)}>
            {labels.send}
          </Button>
        </div>
      )}

      {!held && playback && (
        <div className="mt-2.5">
          <VoicePlayer
            key={playback.id}
            source={playback.blob}
            durationMs={playback.durationMs}
            waveform={playerWaveform}
            labels={playerLabels}
          />
        </div>
      )}

      {idle && problem && (
        <div className="mt-2 flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1">
          <p
            className="min-w-0 flex-1 basis-56 text-xs font-medium text-destructive"
            role="alert"
          >
            {labels.problems[problem]}
          </p>
          {(canRetry || micMenu) && (
            <span className="flex min-w-0 items-center gap-1">
              {canRetry && (
                <button type="button" onClick={retry} className={TEXT_BUTTON}>
                  {labels.retry}
                </button>
              )}
              {micMenu}
            </span>
          )}
        </div>
      )}

      <span className="sr-only" aria-live="polite">
        {recording
          ? labels.announce.recording(
              recorder.activeInput?.label ?? labels.microphone
            )
          : processing
            ? labels.processing
            : announcement}
      </span>
    </div>
  )
}

// ── Pieces ──

type VisualProps = {
  analyser: AnalyserNode | null
  getLevel: () => number
  paused: boolean
}

function LevelBars({ className, bar }: { className?: string; bar: string }) {
  return (
    <span
      data-voice-level
      aria-hidden="true"
      className={cn("flex items-center", className)}
    >
      {[0, 1, 2].map((index) => (
        <span
          key={index}
          className={cn(
            "h-full origin-center scale-y-25 rounded-full bg-[var(--voice-accent,var(--color-foreground))]",
            bar
          )}
        />
      ))}
    </span>
  )
}

/**
 * The meter in the line under the field. `glow` is a small Voice Glow pill —
 * the same light that plays along the field, at the size of a meter.
 */
function MeterVisual({
  visual,
  analyser,
  getLevel,
  paused,
  stream,
  glow,
}: VisualProps & {
  visual: Exclude<VoiceVisual, "none">
  stream: MediaStream | null
  glow: Partial<ComponentProps<typeof VoiceBeam>>
}) {
  const dim = paused && "opacity-40"
  if (visual === "level") {
    return (
      <LevelBars
        className={cn("h-3 gap-[2px] transition-opacity", dim)}
        bar="w-[3px]"
      />
    )
  }
  if (visual === "glow") {
    return (
      <VoiceBeam
        {...glow}
        stream={stream}
        active
        paused={paused}
        type="pill"
        borderRadius={9}
        className="shrink-0"
      >
        <span
          aria-hidden="true"
          className="block h-[18px] w-20 rounded-[9px] bg-foreground/[0.04]"
        />
      </VoiceBeam>
    )
  }
  return (
    <LiveWaveform
      analyser={analyser}
      getLevel={getLevel}
      frozen={paused}
      waveform={visual}
      className={cn(
        "h-4 w-20 shrink-0 text-[var(--voice-wave,var(--color-foreground))]",
        dim
      )}
    />
  )
}

/**
 * The voice drawn inside the field when it isn't the glow: a band along the
 * bottom of the field, faint enough that typed text reads over it.
 */
function FieldVisual({
  visual,
  analyser,
  getLevel,
  paused,
}: VisualProps & { visual: "level" | VoiceWaveformStyle }) {
  return (
    <div
      aria-hidden="true"
      data-slot="voice-input-field-visual"
      className={cn(
        "pointer-events-none absolute inset-x-0 bottom-0 z-[3] h-full max-h-12 overflow-hidden rounded-b-[var(--voice-field-radius,0.5rem)] transition-opacity duration-200",
        "animate-in fade-in-0",
        paused ? "opacity-40" : "opacity-100"
      )}
    >
      {visual === "level" ? (
        <LevelBars
          className="absolute inset-x-0 bottom-1.5 mx-auto h-5 w-fit gap-[3px] opacity-35"
          bar="w-1"
        />
      ) : (
        <LiveWaveform
          analyser={analyser}
          getLevel={getLevel}
          frozen={paused}
          waveform={visual}
          className={cn(
            "absolute inset-x-3 inset-y-1.5 h-auto text-[var(--voice-wave,var(--color-foreground))]",
            visual === "wave" ? "opacity-35" : "opacity-[0.16]"
          )}
        />
      )}
    </div>
  )
}

const CORNER_BUTTON = cn(
  "relative inline-flex size-7 items-center justify-center rounded-[var(--voice-button-radius,9999px)] outline-none",
  // Hit area: 36px with a pointer, 44px on touch.
  "before:absolute before:-inset-1 before:rounded-[inherit] before:content-[''] pointer-coarse:before:-inset-2",
  "transition-[background-color,color,box-shadow,scale,opacity] duration-150 ease-out active:scale-[0.94]",
  "focus-visible:ring-3 focus-visible:ring-ring/40",
  "disabled:cursor-default disabled:active:scale-100 aria-disabled:cursor-default aria-disabled:active:scale-100"
)

/** The resting corner button: white, a hairline and a soft drop. */
const REST_BUTTON =
  "bg-card text-muted-foreground shadow-[0_0_0_1px_rgba(0,0,0,0.07),0_1px_2px_rgba(0,0,0,0.06)] hover:text-foreground hover:shadow-[0_0_0_1px_rgba(0,0,0,0.12),0_1px_3px_rgba(0,0,0,0.08)] dark:shadow-[0_0_0_1px_rgba(255,255,255,0.1)] dark:hover:shadow-[0_0_0_1px_rgba(255,255,255,0.18)]"

const TEXT_BUTTON =
  "rounded-md px-1.5 py-1 text-xs font-semibold text-foreground transition-colors outline-none hover:bg-foreground/5 focus-visible:ring-3 focus-visible:ring-ring/30"

/**
 * Replaces the mic once there's a recording. Deleting a recording someone
 * may have spent minutes on takes two deliberate steps: the button opens a
 * confirmation that names exactly what goes, with Cancel focused.
 */
function ResetControl({
  length,
  confirm,
  labels,
  onConfirm,
}: {
  length: string
  confirm: boolean
  labels: VoiceInputLabels
  onConfirm: () => void
}) {
  const [open, setOpen] = useState(false)
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const id = useId()
  const className = cn(
    CORNER_BUTTON,
    REST_BUTTON,
    "hover:text-destructive data-popup-open:text-destructive"
  )
  const icon = (
    <ArrowCounterClockwiseIcon
      className="size-3.5"
      weight="bold"
      aria-hidden="true"
    />
  )

  if (!confirm) {
    return (
      <button
        type="button"
        aria-label={labels.reset}
        title={labels.reset}
        onClick={onConfirm}
        className={className}
      >
        {icon}
      </button>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        aria-label={labels.reset}
        title={open ? undefined : labels.reset}
        className={className}
      >
        {icon}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        initialFocus={cancelRef}
        aria-labelledby={`${id}-title`}
        aria-describedby={`${id}-body`}
        className="w-[min(18rem,calc(100vw-24px))] gap-0 rounded-xl p-3.5"
      >
        <PopoverTitle id={`${id}-title`} className="text-sm font-semibold">
          {labels.resetTitle}
        </PopoverTitle>
        <PopoverDescription
          id={`${id}-body`}
          className="mt-1 text-xs leading-relaxed"
        >
          {labels.resetBody(length)}
        </PopoverDescription>
        <div className="mt-3 flex justify-end gap-1.5">
          <Button
            ref={cancelRef}
            type="button"
            variant="ghost"
            size="xs"
            onClick={() => setOpen(false)}
          >
            {labels.resetCancel}
          </Button>
          <Button
            type="button"
            variant="destructive"
            size="xs"
            onClick={() => {
              setOpen(false)
              onConfirm()
            }}
          >
            {labels.resetConfirm}
          </Button>
        </div>
      </PopoverContent>
    </Popover>
  )
}

function MicMenu({
  inputs,
  active,
  onChoose,
  labels,
}: {
  inputs: AudioInput[]
  active: AudioInput | null
  onChoose: (deviceId: string) => void
  labels: VoiceInputLabels
}) {
  const current = active?.label ?? inputs[0]?.label ?? labels.microphone
  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger
        aria-label={`${labels.chooseMic}: ${current}`}
        className="-mr-1.5 flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs font-medium text-muted-foreground transition-colors outline-none hover:bg-foreground/5 hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 data-popup-open:bg-foreground/5 data-popup-open:text-foreground"
      >
        <MicrophoneIcon
          className="size-3 shrink-0"
          weight="fill"
          aria-hidden="true"
        />
        <span className="max-w-48 truncate sm:max-w-64">{current}</span>
        <CaretDownIcon
          className="size-3 shrink-0"
          weight="bold"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto max-w-80 min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel className="text-xs text-muted-foreground">
            {labels.microphone}
          </DropdownMenuLabel>
          <DropdownMenuRadioGroup
            value={active?.deviceId ?? ""}
            onValueChange={(value) => onChoose(String(value))}
          >
            {inputs.map((input) => (
              <DropdownMenuRadioItem
                key={input.deviceId}
                value={input.deviceId}
              >
                <span className="truncate">{input.label}</span>
                {input.isDefault && (
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {labels.systemDefault}
                  </span>
                )}
              </DropdownMenuRadioItem>
            ))}
          </DropdownMenuRadioGroup>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}

// ── Hooks ──

/**
 * The thinking glow: the lobes gather into one beam that sweeps the edge
 * while the take is transcribed, and spread back out when it lands.
 */
function useProcessingMotion(active: boolean) {
  const state = useRef({ gather: 0, offset: 0, dir: 1, last: 0 })

  return useCallback((): VoiceBeamMotion | null => {
    const now = performance.now()
    const motion = state.current
    const dt = motion.last ? Math.min(0.05, (now - motion.last) / 1000) : 0.016
    motion.last = now
    const target = active ? 1 : 0
    motion.gather += (target - motion.gather) * Math.min(1, dt * 2.4)
    if (motion.gather > 0.08) {
      motion.offset += motion.dir * dt * 0.62
      if (motion.offset > 0.78) {
        motion.offset = 0.78
        motion.dir = -1
      } else if (motion.offset < -0.78) {
        motion.offset = -0.78
        motion.dir = 1
      }
    } else {
      motion.offset *= 1 - Math.min(1, dt * 3)
    }
    if (motion.gather < 0.02 && !active) return null
    return {
      gather: motion.gather,
      offset: motion.offset,
      stretch: 0.18,
      heldLevel: 0.58,
      cornerFollow: 0.4,
    }
  }, [active])
}

function useReducedMotion() {
  const [reduced, setReduced] = useState(false)
  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReduced(query.matches)
    const initial = window.setTimeout(update, 0)
    query.addEventListener("change", update)
    return () => {
      window.clearTimeout(initial)
      query.removeEventListener("change", update)
    }
  }, [])
  return reduced
}

/** Light or dark, from the `.dark` class shadcn themes put on <html>. */
function useDocumentTheme(override?: "light" | "dark") {
  const [theme, setTheme] = useState<"light" | "dark">("light")
  useEffect(() => {
    if (override) return
    const root = document.documentElement
    const update = () =>
      setTheme(root.classList.contains("dark") ? "dark" : "light")
    const initial = window.setTimeout(update, 0)
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => {
      window.clearTimeout(initial)
      observer.disconnect()
    }
  }, [override])
  return override ?? theme
}
