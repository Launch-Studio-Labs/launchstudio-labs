"use client"

/**
 * Voice Input — record, review and send a spoken answer.
 *
 * One control for the whole flow: ask for the microphone, record with a live
 * waveform, pause, stop, play it back, send it for transcription (or hold it
 * for review first), re-record with a confirm, and let the person decide
 * whether their audio leaves the device at all.
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
  PauseIcon,
  StopIcon,
  TrashIcon,
  XIcon,
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
 * - `auto`: it goes straight to `onTranscribe`; the result lands at once
 * - `review`: it is transcribed, then held until the person accepts it
 * - `manual`: nothing is sent until the person presses Send
 */
export type VoiceSubmitMode = "auto" | "review" | "manual"

/** What `onTranscribe` resolves with. */
export interface VoiceTranscription {
  transcript: string
  /**
   * Your reference to the stored audio, if the server kept it. Handed back
   * to `onDeleteRecording` when the person re-records, deletes, or turns
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
  prompt: string
  take: string
  record: string
  stop: string
  pause: string
  resume: string
  cancel: string
  requesting: string
  requestingHint: string
  listening: string
  paused: string
  quiet: string
  stopping: string
  processing: string
  send: string
  discard: string
  accept: string
  rerecord: string
  reset: string
  resetTitle: string
  resetBody: (length: string) => string
  resetConfirm: string
  resetCancel: string
  retry: string
  microphone: string
  chooseMic: string
  systemDefault: string
  recordingSent: string
  recordingWithheld: string
  withholdRecording: string
  sendRecording: string
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

export const voiceInputLabels: VoiceInputLabels = {
  prompt: "Record a voice note",
  take: "Voice note",
  record: "Start recording",
  stop: "Stop recording",
  pause: "Pause",
  resume: "Resume",
  cancel: "Discard recording",
  requesting: "Waiting for the microphone…",
  requestingHint: "Allow microphone access when your browser asks.",
  listening: "Listening",
  paused: "Paused",
  quiet: "We can't hear anything. Check your microphone.",
  stopping: "Finishing…",
  processing: "Transcribing…",
  send: "Send",
  discard: "Discard",
  accept: "Use transcript",
  rerecord: "Re-record",
  reset: "Delete recording",
  resetTitle: "Delete this recording?",
  resetBody: (length) =>
    `The ${length} recording and its transcript will be removed. You can record a new one after.`,
  resetConfirm: "Delete",
  resetCancel: "Keep",
  retry: "Try again",
  microphone: "Microphone",
  chooseMic: "Choose microphone",
  systemDefault: "Default",
  recordingSent: "Your recording is sent with the transcript.",
  recordingWithheld: "Only the transcript is sent. Audio stays on this device.",
  withholdRecording: "Don't send recording",
  sendRecording: "Send recording",
  play: "Play recording",
  pausePlayback: "Pause recording",
  position: "Playback position",
  problems: {
    unsupported:
      "This browser can't record audio. Try a recent Chrome, Safari or Firefox.",
    insecure: "Recording needs a secure (https) page.",
    denied:
      "Microphone access is blocked. Allow it from the address bar, then try again.",
    "no-device": "No microphone found. Plug one in or pick another.",
    "too-short": "That was too short to keep. Hold on a little longer.",
    error: "The microphone couldn't start. Try again.",
    silent:
      "The recording was silent. Your microphone may be muted — pick another or check its settings.",
    empty: "We couldn't hear any words. Try again a little closer to the mic.",
    unconfigured: "Voice input isn't available right now.",
    failed: "Couldn't transcribe that. Your recording is kept — try again.",
    "delete-failed": "Couldn't delete the stored recording. Try again.",
  },
  announce: {
    recording: (mic) => `Recording with ${mic}. Press Escape to discard.`,
    done: "Transcript ready.",
    cancelled: "Recording discarded.",
    reset: "Recording deleted.",
    switched: (mic) => `Switched to ${mic}. Recording restarted.`,
    nextMic: (mic) => `${mic} will be used for the next recording.`,
  },
}

/** Problems where the microphone itself is the likely culprit. */
const MIC_PROBLEMS = new Set<VoiceInputProblem>([
  "silent",
  "no-device",
  "empty",
])

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

export type VoiceInputVariant = "outline" | "soft" | "ghost"
export type VoiceInputSize = "sm" | "md" | "lg"

export interface VoiceInputProps extends Omit<
  ComponentProps<"div">,
  "onChange" | "children"
> {
  // Pipeline
  /** Turns a take into text. Leave it out for a plain voice recorder. */
  onTranscribe?: VoiceTranscribe
  /** A finished result — on accept in `review`, on arrival otherwise. */
  onResult?: (result: VoiceResult) => void
  /** The person deleted the result (after the confirm). */
  onReset?: () => void
  /**
   * Remove stored audio. Called with the result whenever a stored recording
   * should stop existing: re-record, delete, or sending turned off after it
   * was sent. Only called when the result carries an `audioId`.
   */
  onDeleteRecording?: (result: VoiceResult) => void | Promise<void>
  /** @default "auto" */
  submit?: VoiceSubmitMode

  // Privacy
  /** Controlled: whether audio is sent along with the transcript. */
  sendRecording?: boolean
  /** @default true */
  defaultSendRecording?: boolean
  onSendRecordingChange?: (send: boolean) => void

  // Recording
  /** @default false */
  allowPause?: boolean
  /** Browser automatic gain control. @default true */
  autoGainControl?: boolean
  /** @default 300000 (5 minutes) */
  maxDurationMs?: number
  /** @default 700 */
  minDurationMs?: number
  /** Replaces getUserMedia — tests, demos, custom sources. */
  getStream?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  disabled?: boolean

  // Chrome
  /** @default true */
  showGlow?: boolean
  /** @default true */
  showWaveform?: boolean
  /** Playback of the take once it's recorded. @default true */
  showPlayback?: boolean
  /** @default true */
  showMicPicker?: boolean
  /** @default true */
  showTimer?: boolean
  /** Print the transcript inside the control. @default true */
  showTranscript?: boolean
  /** The "send recording / transcript only" line. @default true */
  showRecordingToggle?: boolean
  /** Ask before deleting a recording. @default true */
  confirmReset?: boolean

  // Look
  /** @default "outline" */
  variant?: VoiceInputVariant
  /** @default "md" */
  size?: VoiceInputSize
  /** Corner radius in px. Defaults to a radius that suits the size. */
  radius?: number
  /** @default "bars" */
  waveform?: VoiceWaveformStyle
  /** Voice Glow palette. @default "mono" (neutral) */
  glowVariant?: VoiceBeamColorVariant
  /** Your own glow colours, centre first — overrides `glowVariant`. */
  glowColors?: string[]
  /** 0–1. @default 0.8 */
  glowStrength?: number
  /** Follows the `.dark` class on <html> unless set. */
  theme?: "light" | "dark"

  labels?: Partial<Omit<VoiceInputLabels, "problems" | "announce">> & {
    problems?: Partial<VoiceInputLabels["problems"]>
    announce?: Partial<VoiceInputLabels["announce"]>
  }
  /**
   * Rendered inside the glowing surface, above the controls — a textarea the
   * transcript is written into, a question, a preview.
   */
  children?: ReactNode
}

type View = "ready" | "held" | "processing" | "review" | "done"

const SIZES = {
  sm: {
    row: "min-h-10 gap-1.5 px-1.5",
    button: "size-7",
    icon: "size-3.5",
    radius: 20,
  },
  md: {
    row: "min-h-12 gap-2 px-2",
    button: "size-8",
    icon: "size-4",
    radius: 24,
  },
  lg: {
    row: "min-h-14 gap-2.5 px-2.5",
    button: "size-10",
    icon: "size-[18px]",
    radius: 28,
  },
} as const

const VARIANTS: Record<VoiceInputVariant, string> = {
  outline: "border-border bg-background shadow-xs",
  soft: "border-transparent bg-muted",
  ghost: "border-transparent bg-transparent",
}

export function VoiceInput({
  onTranscribe,
  onResult,
  onReset,
  onDeleteRecording,
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
  showGlow = true,
  showWaveform = true,
  showPlayback = true,
  showMicPicker = true,
  showTimer = true,
  showTranscript = true,
  showRecordingToggle = true,
  confirmReset = true,
  variant = "outline",
  size = "md",
  radius,
  waveform = "bars",
  glowVariant = "mono",
  glowColors,
  glowStrength = 0.8,
  theme: themeProp,
  labels: labelOverrides,
  children,
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
  const dims = SIZES[size]
  const corner = radius ?? dims.radius
  const theme = useDocumentTheme(themeProp)
  const reduced = useReducedMotion()

  const [sendState, setSendState] = useState(defaultSendRecording)
  const sendRecording = sendRecordingProp ?? sendState
  const [view, setView] = useState<View>("ready")
  const [take, setTake] = useState<VoiceTake | null>(null)
  /** Remounts the player for each new take. */
  const [takeId, setTakeId] = useState(0)
  const [result, setResult] = useState<VoiceResult | null>(null)
  const [sendProblem, setSendProblem] = useState<VoiceInputProblem | null>(null)
  const [announcement, setAnnouncement] = useState("")
  const abortRef = useRef<AbortController | null>(null)
  const rootRef = useRef<HTMLDivElement | null>(null)
  const primaryRef = useRef<HTMLButtonElement | null>(null)
  const ringRef = useRef<HTMLSpanElement | null>(null)
  /** Keep focus inside the control when the element holding it goes away. */
  const hadFocusRef = useRef(false)

  const recorder = useVoiceRecorder({
    autoGainControl,
    maxDurationMs,
    minDurationMs,
    getStream,
    onTake: (next) => {
      setTake(next)
      setTakeId((id) => id + 1)
      if (submit === "manual" || !onTranscribe) {
        if (!onTranscribe) finishWithoutTranscript(next)
        else setView("held")
        return
      }
      void send(next)
    },
  })
  const { status, getLevel } = recorder
  const recording = status === "recording"
  const paused = status === "paused"
  const live = recording || paused
  const busy = status === "requesting" || status === "stopping"
  const processing = view === "processing"
  const problem: VoiceInputProblem | null = recorder.problem ?? sendProblem

  // Cancel any in-flight send when the component goes away.
  useEffect(() => () => abortRef.current?.abort(), [])

  // The record button breathes with the voice; written per frame, no renders.
  useEffect(() => {
    const ring = ringRef.current
    if (!ring || !recording) return
    let raf = 0
    const tick = () => {
      const level = getLevel()
      if (reduced) {
        ring.style.transform = "scale(1.15)"
        ring.style.opacity = String(0.1 + level * 0.3)
      } else {
        ring.style.transform = `scale(${1 + level * 0.4})`
        ring.style.opacity = String(0.14 + level * 0.22)
      }
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => {
      cancelAnimationFrame(raf)
      ring.style.opacity = "0"
    }
  }, [recording, reduced, getLevel])

  const phase = live || busy ? status : view
  // After a state change removes the focused button, land on the next action.
  useEffect(() => {
    if (!hadFocusRef.current) return
    const root = rootRef.current
    if (!root || root.contains(document.activeElement)) return
    hadFocusRef.current = false
    const next =
      root.querySelector<HTMLElement>("[data-voice-focus]") ??
      root.querySelector<HTMLElement>("button:not([disabled])")
    next?.focus()
  }, [phase])

  function setSendRecording(next: boolean) {
    if (sendRecordingProp === undefined) setSendState(next)
    onSendRecordingChange?.(next)
  }

  function finishWithoutTranscript(next: VoiceTake) {
    const value = buildResult(next, { transcript: "" }, sendRecording)
    setResult(value)
    setView("done")
    onResult?.(value)
  }

  async function send(next: VoiceTake) {
    if (!onTranscribe) return finishWithoutTranscript(next)
    abortRef.current?.abort()
    const controller = new AbortController()
    abortRef.current = controller
    setSendProblem(null)
    setView("processing")
    const keep = sendRecording
    try {
      const output = await onTranscribe(next, {
        sendRecording: keep,
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      if (!output.transcript.trim()) {
        throw new VoiceTranscriptionError("empty")
      }
      const value = buildResult(next, output, keep)
      setResult(value)
      if (submit === "review") {
        setView("review")
      } else {
        setView("done")
        setAnnouncement(labels.announce.done)
        onResult?.(value)
      }
    } catch (error) {
      if (controller.signal.aborted) return
      const code =
        error instanceof VoiceTranscriptionError ? error.code : "failed"
      // An empty transcript from a take the meter saw as flat silence is a
      // microphone problem, not a mumbling one.
      setSendProblem(code === "empty" && next.silent ? "silent" : code)
      // A failed send keeps the take so "Try again" can resend it; an empty
      // or silent one needs a new recording.
      if (code === "failed") {
        setView(submit === "manual" ? "held" : "ready")
      } else {
        setTake(null)
        setView("ready")
      }
    }
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

  async function start() {
    if (disabled) return
    setSendProblem(null)
    setAnnouncement("")
    await recorder.start()
  }

  function onPrimary() {
    if (busy || processing) return
    if (live) {
      void recorder.stop()
      return
    }
    void start()
  }

  async function cancelLive() {
    await recorder.cancel()
    setAnnouncement(labels.announce.cancelled)
  }

  function cancelProcessing() {
    abortRef.current?.abort()
    setView(submit === "manual" ? "held" : "ready")
    if (submit !== "manual") setTake(null)
    setAnnouncement(labels.announce.cancelled)
  }

  function discardHeld() {
    setTake(null)
    setView("ready")
    setAnnouncement(labels.announce.cancelled)
  }

  async function rerecord() {
    // A result that was never accepted may still have stored audio.
    if (!(await deleteStored(result))) return
    setResult(null)
    setTake(null)
    setView("ready")
    void start()
  }

  function accept() {
    if (!result) return
    setView("done")
    setAnnouncement(labels.announce.done)
    onResult?.(result)
  }

  async function reset() {
    if (!(await deleteStored(result))) return
    setResult(null)
    setTake(null)
    setSendProblem(null)
    setView("ready")
    onReset?.()
    setAnnouncement(labels.announce.reset)
    hadFocusRef.current = true
  }

  async function toggleSendRecording() {
    const next = !sendRecording
    setSendRecording(next)
    setAnnouncement(next ? labels.recordingSent : labels.recordingWithheld)
    // Turning it off is immediate: a recording already sent stops existing.
    if (!next && result?.sentRecording) {
      const ok = await deleteStored(result)
      if (!ok) return
      const withheld: VoiceResult = {
        ...result,
        audio: null,
        audioId: null,
        sentRecording: false,
      }
      setResult(withheld)
      if (view === "done") onResult?.(withheld)
    }
  }

  function retry() {
    setSendProblem(null)
    recorder.clearProblem()
    if (take && sendProblem === "failed") {
      void send(take)
      return
    }
    void start()
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
      void cancelLive()
    } else if (processing) {
      event.preventDefault()
      cancelProcessing()
    }
  }

  const glowOn = showGlow && (live || processing)
  const motion = useProcessingMotion(processing && !reduced)
  const playbackSource = take?.blob ?? null
  const transcript = result?.transcript.trim() ?? ""
  const hasTake = view === "held" || view === "review" || view === "done"
  const showToggle =
    showRecordingToggle && Boolean(onTranscribe) && !live && !busy
  const micMenu =
    showMicPicker && recorder.inputs.length > 0 ? (
      <MicMenu
        inputs={recorder.inputs}
        active={recorder.activeInput}
        onChoose={(id) => void chooseInput(id)}
        labels={labels}
      />
    ) : null
  const iconButton = cn(dims.button, "rounded-full")
  const showPlayer = showPlayback && playbackSource !== null

  // ── Control row ──
  let row: ReactNode
  if (hasTake && !live && !busy) {
    const length = formatElapsed(take?.durationMs ?? result?.durationMs ?? 0)
    row = (
      <>
        {showPlayer ? (
          <VoicePlayer
            key={takeId}
            source={playbackSource}
            durationMs={take?.durationMs}
            waveform={waveform}
            labels={{
              play: labels.play,
              pause: labels.pausePlayback,
              position: labels.position,
            }}
            className="flex-1 pl-0.5"
          />
        ) : (
          <span className="flex-1 truncate pl-2 text-sm text-muted-foreground tabular-nums">
            {labels.take} · {length}
          </span>
        )}
        {view === "held" && (
          <>
            <IconAction
              label={labels.discard}
              className={iconButton}
              onClick={discardHeld}
            >
              <TrashIcon className={dims.icon} />
            </IconAction>
            <Button
              data-voice-focus
              size={size === "lg" ? "default" : "sm"}
              onClick={() => take && void send(take)}
            >
              {labels.send}
            </Button>
          </>
        )}
        {view === "review" && (
          <>
            <Button
              variant="ghost"
              size={size === "lg" ? "default" : "sm"}
              onClick={() => void rerecord()}
            >
              {labels.rerecord}
            </Button>
            <Button
              data-voice-focus
              size={size === "lg" ? "default" : "sm"}
              onClick={accept}
            >
              {labels.accept}
            </Button>
          </>
        )}
        {view === "done" && (
          <ResetControl
            confirm={confirmReset}
            length={length}
            labels={labels}
            className={iconButton}
            iconClassName={dims.icon}
            onConfirm={() => void reset()}
          />
        )}
      </>
    )
  } else {
    const label = live
      ? labels.stop
      : busy
        ? labels.requesting
        : processing
          ? labels.processing
          : labels.record
    row = (
      <>
        <button
          ref={primaryRef}
          type="button"
          onClick={onPrimary}
          disabled={disabled && !live}
          aria-disabled={busy || processing || undefined}
          aria-busy={busy || processing || undefined}
          // Idle, the visible prompt is the name; icon-only states get a label.
          aria-label={live || busy || processing ? label : undefined}
          data-state={phase}
          className={cn(
            "group/voice relative flex min-w-0 shrink-0 items-center gap-2.5 rounded-full text-left outline-none",
            "focus-visible:ring-3 focus-visible:ring-ring/40",
            "disabled:cursor-not-allowed disabled:opacity-50 aria-disabled:cursor-default",
            !live && !processing && !busy && "flex-1 pr-3"
          )}
        >
          <span
            className={cn(
              "relative grid shrink-0 place-items-center",
              dims.button
            )}
          >
            <span
              ref={ringRef}
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 rounded-full bg-[var(--voice-accent,var(--color-foreground))] opacity-0"
            />
            <span
              className={cn(
                "relative grid size-full place-items-center rounded-full",
                "transition-[background-color,color,box-shadow,scale] duration-150 ease-out",
                "group-active/voice:scale-[0.94] group-aria-disabled/voice:group-active/voice:scale-100",
                live
                  ? "bg-[var(--voice-accent,var(--color-foreground))] text-[var(--voice-accent-foreground,var(--color-background))] shadow-xs"
                  : "bg-background text-foreground shadow-xs ring-1 ring-foreground/10 group-hover/voice:ring-foreground/20"
              )}
            >
              {busy || processing ? (
                <CircleNotchIcon
                  className={cn(
                    dims.icon,
                    "animate-spin text-muted-foreground"
                  )}
                  aria-hidden="true"
                />
              ) : live ? (
                <StopIcon
                  className="size-[40%]"
                  weight="fill"
                  aria-hidden="true"
                />
              ) : (
                <MicrophoneIcon
                  className={dims.icon}
                  weight="fill"
                  aria-hidden="true"
                />
              )}
            </span>
          </span>
          {!live && (
            <span
              className={cn(
                "truncate text-sm",
                busy || processing ? "text-muted-foreground" : "text-foreground"
              )}
            >
              {busy
                ? status === "stopping"
                  ? labels.stopping
                  : labels.requesting
                : processing
                  ? labels.processing
                  : labels.prompt}
            </span>
          )}
        </button>

        {live && (
          <div
            className={cn(
              "flex min-w-0 flex-1 items-center gap-3 text-[var(--voice-wave,var(--color-foreground))] transition-opacity duration-200",
              paused && "opacity-40"
            )}
          >
            {showWaveform ? (
              <LiveWaveform
                analyser={recorder.analyser}
                getLevel={recorder.getLevel}
                frozen={paused}
                waveform={waveform}
                className="flex-1"
              />
            ) : (
              <span className="flex-1 truncate text-sm text-muted-foreground">
                {paused ? labels.paused : labels.listening}
              </span>
            )}
          </div>
        )}

        {live && showTimer && (
          <span className="shrink-0 text-xs text-muted-foreground tabular-nums">
            {formatElapsed(recorder.elapsedMs)}
          </span>
        )}
        {live && allowPause && (
          <IconAction
            label={paused ? labels.resume : labels.pause}
            className={iconButton}
            onClick={paused ? recorder.resume : recorder.pause}
          >
            {paused ? (
              <MicrophoneIcon className={dims.icon} weight="fill" />
            ) : (
              <PauseIcon className={dims.icon} weight="fill" />
            )}
          </IconAction>
        )}
        {live && (
          <IconAction
            label={labels.cancel}
            className={iconButton}
            onClick={() => void cancelLive()}
          >
            <XIcon className={dims.icon} />
          </IconAction>
        )}
        {processing && (
          <IconAction
            label={labels.cancel}
            className={cn(iconButton, "ml-auto")}
            onClick={cancelProcessing}
          >
            <XIcon className={dims.icon} />
          </IconAction>
        )}
        {view === "ready" && !live && !busy && micMenu && !problem && (
          <span className="ml-auto flex min-w-0 shrink items-center">
            {micMenu}
          </span>
        )}
      </>
    )
  }

  // ── Line under the control ──
  let footer: ReactNode = null
  if (live) {
    footer = (
      <div className="flex min-h-6 items-center gap-3 text-xs text-muted-foreground">
        <span
          className={cn(
            "min-w-0 flex-1 truncate",
            recorder.quiet && !paused && "font-medium text-foreground"
          )}
        >
          {paused
            ? labels.paused
            : recorder.quiet
              ? labels.quiet
              : labels.listening}
        </span>
        {micMenu}
      </div>
    )
  } else if (status === "requesting") {
    footer = (
      <p className="min-h-6 text-xs text-muted-foreground">
        {labels.requestingHint}
      </p>
    )
  } else if (problem) {
    const micProblem = MIC_PROBLEMS.has(problem)
    footer = (
      <div className="flex min-h-6 flex-wrap items-center gap-x-3 gap-y-1">
        <p
          role="alert"
          className="min-w-0 flex-1 basis-56 text-xs font-medium text-destructive"
        >
          {labels.problems[problem]}
        </p>
        {problem !== "unsupported" &&
          problem !== "insecure" &&
          problem !== "unconfigured" && (
            <span className="flex items-center gap-1">
              {problem !== "delete-failed" && (
                <Button variant="ghost" size="xs" onClick={retry}>
                  {labels.retry}
                </Button>
              )}
              {micProblem && micMenu}
            </span>
          )}
      </div>
    )
  } else if (showToggle && (hasTake || view === "ready")) {
    footer = (
      <p className="min-h-6 text-xs text-muted-foreground">
        {sendRecording ? labels.recordingSent : labels.recordingWithheld}{" "}
        <button
          type="button"
          onClick={() => void toggleSendRecording()}
          className="rounded-sm font-medium text-foreground underline decoration-foreground/25 underline-offset-2 transition-[text-decoration-color] outline-none hover:decoration-foreground/60 focus-visible:ring-3 focus-visible:ring-ring/40"
        >
          {sendRecording ? labels.withholdRecording : labels.sendRecording}
        </button>
      </p>
    )
  }

  return (
    <div
      ref={rootRef}
      data-slot="voice-input"
      data-state={phase}
      data-size={size}
      onKeyDown={handleKeyDown}
      onFocusCapture={() => {
        hadFocusRef.current = true
      }}
      onBlurCapture={(event) => {
        // Focus that left on purpose stays gone. Only focus lost to a button
        // this control removed (the target is no longer in the page) is
        // caught and put back on the next action.
        const target = event.target
        requestAnimationFrame(() => {
          if (target.isConnected) hadFocusRef.current = false
        })
      }}
      className={cn("flex w-full min-w-0 flex-col gap-2", className)}
      style={
        {
          "--voice-radius": `${corner}px`,
          ...style,
        } as CSSProperties
      }
      {...props}
    >
      <VoiceBeam
        stream={recording ? recorder.stream : null}
        active={glowOn}
        paused={paused}
        motion={motion}
        theme={theme}
        colorVariant={glowVariant}
        colors={glowColors}
        // Voice Glow's band keeps its own tint (pink on light) whatever the
        // palette; a neutral glow needs a neutral band too.
        bandColors={
          glowVariant === "mono" && !glowColors
            ? NEUTRAL_BAND[theme]
            : undefined
        }
        strength={glowStrength}
        borderRadius={corner}
        type={size === "sm" && !children ? "pill" : "default"}
        className="w-full"
      >
        <div
          data-slot="voice-input-surface"
          className={cn(
            "flex w-full flex-col overflow-hidden rounded-(--voice-radius) border transition-[background-color,border-color] duration-200",
            VARIANTS[variant]
          )}
        >
          {children && <div className="min-w-0">{children}</div>}
          {showTranscript &&
            transcript &&
            (view === "review" || view === "done") && (
              <p
                data-slot="voice-input-transcript"
                className="px-4 pt-3 text-sm leading-relaxed whitespace-pre-wrap text-foreground"
              >
                {transcript}
              </p>
            )}
          <div className={cn("flex items-center", dims.row)}>{row}</div>
        </div>
      </VoiceBeam>

      {footer && <div className="px-1">{footer}</div>}

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

function buildResult(
  take: VoiceTake,
  output: VoiceTranscription,
  sent: boolean
): VoiceResult {
  return {
    transcript: output.transcript.trim(),
    durationMs: take.durationMs,
    audio: sent ? take.blob : null,
    mimeType: take.mimeType,
    audioId: sent ? (output.audioId ?? null) : null,
    sentRecording: sent,
  }
}

// ── Pieces ──

function IconAction({
  label,
  className,
  children,
  ...props
}: Omit<ComponentProps<typeof Button>, "aria-label"> & { label: string }) {
  return (
    <Button
      variant="ghost"
      size="icon"
      aria-label={label}
      title={label}
      className={cn(
        "relative shrink-0 text-muted-foreground hover:text-foreground",
        // A 40px hit area with a pointer, 48px on touch.
        "before:absolute before:-inset-1 before:content-[''] pointer-coarse:before:-inset-2",
        className
      )}
      {...props}
    >
      {children}
    </Button>
  )
}

/**
 * Deleting a recording someone may have spent minutes on takes two
 * deliberate steps: the button opens a confirmation that names what goes,
 * with the safe choice focused.
 */
function ResetControl({
  confirm,
  length,
  labels,
  className,
  iconClassName,
  onConfirm,
}: {
  confirm: boolean
  length: string
  labels: VoiceInputLabels
  className: string
  iconClassName: string
  onConfirm: () => void
}) {
  const [open, setOpen] = useState(false)
  const cancelRef = useRef<HTMLButtonElement | null>(null)
  const id = useId()
  const icon = (
    <ArrowCounterClockwiseIcon className={iconClassName} weight="bold" />
  )

  if (!confirm) {
    return (
      <IconAction
        label={labels.reset}
        className={className}
        onClick={onConfirm}
      >
        {icon}
      </IconAction>
    )
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger
        render={
          <IconAction
            label={labels.reset}
            className={cn(className, "data-popup-open:text-destructive")}
          />
        }
      >
        {icon}
      </PopoverTrigger>
      <PopoverContent
        side="bottom"
        align="end"
        sideOffset={8}
        initialFocus={cancelRef}
        aria-labelledby={`${id}-title`}
        className="w-[min(18rem,calc(100vw-24px))] gap-3 rounded-2xl p-3.5"
      >
        <div className="flex flex-col gap-1">
          <PopoverTitle id={`${id}-title`} className="text-sm font-medium">
            {labels.resetTitle}
          </PopoverTitle>
          <PopoverDescription className="text-xs leading-relaxed">
            {labels.resetBody(length)}
          </PopoverDescription>
        </div>
        <div className="flex justify-end gap-1.5">
          <Button
            ref={cancelRef}
            variant="ghost"
            size="xs"
            onClick={() => setOpen(false)}
          >
            {labels.resetCancel}
          </Button>
          <Button
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
        className="flex min-w-0 items-center gap-1 rounded-md px-1.5 py-1 text-xs text-muted-foreground transition-colors outline-none hover:bg-muted hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 data-popup-open:bg-muted data-popup-open:text-foreground"
      >
        <MicrophoneIcon
          className="size-3 shrink-0"
          weight="fill"
          aria-hidden="true"
        />
        <span className="max-w-40 truncate sm:max-w-56">{current}</span>
        <CaretDownIcon
          className="size-3 shrink-0"
          weight="bold"
          aria-hidden="true"
        />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-auto max-w-80 min-w-56">
        <DropdownMenuGroup>
          <DropdownMenuLabel>{labels.microphone}</DropdownMenuLabel>
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
    update()
    query.addEventListener("change", update)
    return () => query.removeEventListener("change", update)
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
    update()
    const observer = new MutationObserver(update)
    observer.observe(root, { attributes: true, attributeFilter: ["class"] })
    return () => observer.disconnect()
  }, [override])
  return override ?? theme
}
