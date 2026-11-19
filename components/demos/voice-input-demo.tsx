"use client"

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
  type ReactNode,
} from "react"
import { getAudioContext, type VoiceBeamColorVariant } from "voice-glow"

import { DemoFrame } from "@/components/demos/demo-frame"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  VoiceInput,
  VoiceTranscriptionError,
  type VoiceInputProps,
  type VoiceInsertMode,
  type VoiceMeterStyle,
  type VoiceSubmitMode,
  type VoiceTranscribe,
} from "@/components/ui/voice-input"
import { cn } from "@/lib/utils"

type MicSource = "real" | "simulated" | "blocked"
type Outcome = "works" | "fails" | "empty"
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

/** The field's own corner, `rounded-lg` at the Labs radius. */
const FIELD_RADIUS = 9

const PARTS = [
  ["showGlow", "Glow"],
  ["showMicPicker", "Mic picker"],
  ["showTimer", "Timer"],
  ["showPlayback", "Playback"],
  ["showRecordingToggle", "Recording choice"],
  ["confirmReset", "Confirm reset"],
  ["allowPause", "Pause"],
  ["autoGainControl", "Auto gain"],
] as const

type Part = (typeof PARTS)[number][0]

/** Every default here is the component's own: the portal layout. */
const DEFAULT_PARTS: Record<Part, boolean> = {
  showGlow: true,
  showMicPicker: true,
  showTimer: true,
  showPlayback: true,
  showRecordingToggle: true,
  confirmReset: true,
  allowPause: false,
  autoGainControl: true,
}

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
 * Input's mic in the corner, exactly as the component ships. The tabs under
 * them are the props, layered on top of that default.
 *
 * The microphone can be swapped for a synthetic or a blocked one and the
 * transcription made to fail, so every state is reachable without hardware
 * or an API key. The log is the point of the privacy line: it shows what the
 * app was handed — audio or not — and when stored audio was deleted.
 */
export function VoiceInputDemo({ className, ...props }: ComponentProps<"div">) {
  const [submit, setSubmit] = useState<VoiceSubmitMode>("auto")
  const [insert, setInsert] = useState<VoiceInsertMode>("replace")
  const [mic, setMic] = useState<MicSource>("real")
  const [outcome, setOutcome] = useState<Outcome>("works")

  const [meter, setMeter] = useState<VoiceMeterStyle>("meter")
  const [tone, setTone] = useState<Tone>("neutral")
  const [radius, setRadius] = useState<number | null>(null)
  const [glowStrength, setGlowStrength] = useState(1)

  const [parts, setParts] = useState(DEFAULT_PARTS)
  const [sendRecording, setSendRecording] = useState(true)
  const [active, setActive] = useState<string | null>(null)
  const [log, setLog] = useState<LogEntry[]>([])

  const simulated = useSimulatedMicrophone()

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
      if (outcome === "fails") {
        note("← 502 transcription failed")
        throw new VoiceTranscriptionError("failed")
      }
      if (outcome === "empty") {
        note("← 422 no words heard")
        throw new VoiceTranscriptionError("empty")
      }
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

  const getStream =
    mic === "simulated"
      ? simulated
      : mic === "blocked"
        ? () =>
            Promise.reject(
              new DOMException("Permission denied", "NotAllowedError")
            )
        : undefined

  const toneStyle = TONES[tone]
  /** Props both fields share; anything left at its default is the portal. */
  const shared = (id: string): VoiceInputProps => ({
    submit,
    insert,
    getStream,
    onDeleteRecording: (result) => {
      note(`DELETE /api/voice/${result.audioId}`, "deleted")
    },
    // One recording at a time across the form, as in the portal.
    disabled: active !== null && active !== id,
    onActiveChange: (on) =>
      setActive((current) => (on ? id : current === id ? null : current)),
    sendRecording,
    onSendRecordingChange: setSendRecording,
    meter,
    radius: radius ?? undefined,
    glowVariant: toneStyle.glow,
    glowStrength,
    style: toneStyle.accent
      ? ({ "--voice-accent": toneStyle.accent } as CSSProperties)
      : undefined,
    ...parts,
    // A synthetic or blocked source has no devices to switch between.
    showMicPicker: parts.showMicPicker && mic === "real",
  })

  return (
    <div
      className={cn("flex w-content max-w-full flex-col gap-6", className)}
      {...props}
    >
      <DemoFrame className="w-full min-w-0! px-4 py-8 sm:px-8">
        {/* A new flow or microphone starts both fields from a clean slate. */}
        <div
          key={`${submit}-${mic}`}
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

      <Tabs defaultValue="flow" className="gap-6">
        <TabsList>
          <TabsTrigger value="flow">Flow</TabsTrigger>
          <TabsTrigger value="look">Look</TabsTrigger>
          <TabsTrigger value="parts">Parts</TabsTrigger>
        </TabsList>

        <TabsContent value="flow" className="flex flex-col gap-3">
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
            label="Transcript"
            value={insert}
            onChange={setInsert}
            options={[
              ["replace", "Replaces text"],
              ["append", "Appends"],
            ]}
          />
          <Choice
            label="Microphone"
            value={mic}
            onChange={setMic}
            options={[
              ["real", "Real"],
              ["simulated", "Simulated"],
              ["blocked", "Blocked"],
            ]}
          />
          <Choice
            label="Transcription"
            value={outcome}
            onChange={setOutcome}
            options={[
              ["works", "Works"],
              ["fails", "Fails"],
              ["empty", "Hears nothing"],
            ]}
          />
          <Row label="Send recordings">
            <Switch
              size="sm"
              checked={sendRecording}
              onCheckedChange={setSendRecording}
              aria-label="Send recordings with the answers"
            />
          </Row>
        </TabsContent>

        <TabsContent value="look" className="flex flex-col gap-3">
          <Choice
            label="Meter"
            value={meter}
            onChange={setMeter}
            options={[
              ["meter", "Level"],
              ["bars", "Bars"],
              ["wave", "Line"],
              ["dots", "Dots"],
            ]}
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
          <Row label="Radius">
            <Slider
              aria-label="Field corner radius"
              min={0}
              max={24}
              step={1}
              value={[radius ?? FIELD_RADIUS]}
              onValueChange={(value) =>
                setRadius(Array.isArray(value) ? value[0] : value)
              }
              className="w-44"
            />
            <Value>{radius === null ? "Field" : `${radius}px`}</Value>
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
              className="w-44"
            />
            <Value>{Math.round(glowStrength * 100)}%</Value>
          </Row>
        </TabsContent>

        <TabsContent value="parts">
          <div className="grid grid-cols-2 gap-x-6 gap-y-3">
            {PARTS.map(([key, label]) => (
              <label
                key={key}
                className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none"
              >
                <Switch
                  size="sm"
                  checked={parts[key]}
                  onCheckedChange={(checked) =>
                    setParts((current) => ({ ...current, [key]: checked }))
                  }
                />
                {label}
              </label>
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  )
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

function Row({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="flex min-h-9 items-center gap-4">
      <span className="w-28 shrink-0 text-sm text-muted-foreground">
        {label}
      </span>
      <div className="flex min-w-0 items-center gap-3">{children}</div>
    </div>
  )
}

function Value({ children }: { children: ReactNode }) {
  return (
    <span className="w-10 text-xs text-muted-foreground tabular-nums">
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

/**
 * A stand-in microphone: a voiced buzz shaped into syllables, so the
 * waveform, the glow and the recording all have something speech-like to
 * show. It plays nowhere; it only feeds the stream.
 */
function useSimulatedMicrophone() {
  const nodesRef = useRef<{ stop: () => void } | null>(null)
  useEffect(() => () => nodesRef.current?.stop(), [])

  return async () => {
    const context = getAudioContext()
    if (!context) throw new DOMException("No Web Audio", "NotSupportedError")
    if (context.state === "suspended") await context.resume()
    nodesRef.current?.stop()

    const voice = context.createOscillator()
    voice.type = "sawtooth"
    voice.frequency.value = 150
    const vibrato = context.createOscillator()
    vibrato.frequency.value = 3
    const vibratoDepth = context.createGain()
    vibratoDepth.gain.value = 18
    vibrato.connect(vibratoDepth).connect(voice.frequency)

    const formant = context.createBiquadFilter()
    formant.type = "bandpass"
    formant.frequency.value = 900
    formant.Q.value = 1.2

    // Syllables: a slow and a fast LFO multiplied into the envelope.
    const envelope = context.createGain()
    envelope.gain.value = 0
    const syllable = context.createOscillator()
    syllable.frequency.value = 3.4
    const phrase = context.createOscillator()
    phrase.frequency.value = 0.45
    const syllableDepth = context.createGain()
    syllableDepth.gain.value = 0.35
    const phraseDepth = context.createGain()
    phraseDepth.gain.value = 0.3
    syllable.connect(syllableDepth).connect(envelope.gain)
    phrase.connect(phraseDepth).connect(envelope.gain)

    const destination = context.createMediaStreamDestination()
    voice.connect(formant).connect(envelope).connect(destination)
    const oscillators = [voice, vibrato, syllable, phrase]
    oscillators.forEach((node) => node.start())

    const stop = () => {
      oscillators.forEach((node) => {
        try {
          node.stop()
        } catch {
          // Already stopped.
        }
      })
      envelope.disconnect()
    }
    nodesRef.current = { stop }
    const [track] = destination.stream.getAudioTracks()
    // The recorder stops the track when a take ends; take the buzz with it.
    const stopTrack = track.stop.bind(track)
    track.stop = () => {
      stopTrack()
      stop()
    }
    return destination.stream
  }
}
