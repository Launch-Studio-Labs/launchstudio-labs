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
import { Textarea } from "@/components/ui/textarea"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import {
  VoiceInput,
  VoiceTranscriptionError,
  type VoiceInputSize,
  type VoiceInputVariant,
  type VoiceSubmitMode,
  type VoiceTranscribe,
  type VoiceWaveformStyle,
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

const DEFAULT_RADIUS: Record<VoiceInputSize, number> = {
  sm: 20,
  md: 24,
  lg: 28,
}

const PARTS = [
  ["showGlow", "Glow"],
  ["showWaveform", "Waveform"],
  ["showPlayback", "Playback"],
  ["showMicPicker", "Mic picker"],
  ["showTimer", "Timer"],
  ["showTranscript", "Transcript"],
  ["showRecordingToggle", "Recording choice"],
  ["confirmReset", "Confirm delete"],
  ["allowPause", "Pause"],
  ["autoGainControl", "Auto gain"],
] as const

type Part = (typeof PARTS)[number][0]

const DEFAULT_PARTS: Record<Part, boolean> = {
  showGlow: true,
  showWaveform: true,
  showPlayback: true,
  showMicPicker: true,
  showTimer: true,
  showTranscript: true,
  showRecordingToggle: true,
  confirmReset: true,
  allowPause: false,
  autoGainControl: true,
}

/** What the "server" would say, by length — the demo has no model behind it. */
const SAMPLE_TRANSCRIPTS = [
  "Quick one: the launch moves to Thursday.",
  "We want the onboarding to feel calm, not chatty. Fewer steps, clearer copy, and a real empty state on the dashboard.",
  "Here's the longer version. The pricing page should lead with the team plan, the FAQ needs the refund answer near the top, and the footer links can lose the duplicate docs entry.",
]

type LogEntry = { id: number; text: string; tone?: "withheld" | "deleted" }

/**
 * Voice Input with every switch it has, a microphone you can swap for a
 * synthetic one (or a blocked one), and a stand-in transcription service, so
 * every state is reachable without hardware or an API key.
 *
 * The log under the control is the point of the privacy switch: it shows what
 * the app was handed — audio or not — and when stored audio was deleted.
 */
export function VoiceInputDemo({ className, ...props }: ComponentProps<"div">) {
  const [submit, setSubmit] = useState<VoiceSubmitMode>("auto")
  const [mic, setMic] = useState<MicSource>("real")
  const [outcome, setOutcome] = useState<Outcome>("works")
  const [inField, setInField] = useState(false)

  const [variant, setVariant] = useState<VoiceInputVariant>("outline")
  const [size, setSize] = useState<VoiceInputSize>("md")
  const [waveform, setWaveform] = useState<VoiceWaveformStyle>("bars")
  const [tone, setTone] = useState<Tone>("neutral")
  const [radius, setRadius] = useState<number | null>(null)
  const [glowStrength, setGlowStrength] = useState(0.8)

  const [parts, setParts] = useState(DEFAULT_PARTS)
  const [sendRecording, setSendRecording] = useState(true)
  const [text, setText] = useState("")
  const [log, setLog] = useState<LogEntry[]>([])
  const logId = useRef(0)
  const outcomeRef = useRef(outcome)
  useEffect(() => {
    outcomeRef.current = outcome
  }, [outcome])

  const simulated = useSimulatedMicrophone()

  function note(text: string, tone?: LogEntry["tone"]) {
    logId.current += 1
    const entry = { id: logId.current, text, tone }
    setLog((current) => [entry, ...current].slice(0, 4))
  }

  const transcribe: VoiceTranscribe = async (
    take,
    { sendRecording, signal }
  ) => {
    const kb = Math.max(1, Math.round(take.blob.size / 1024))
    const seconds = (take.durationMs / 1000).toFixed(1)
    note(
      sendRecording
        ? `POST /api/voice · ${seconds}s · ${kb} KB audio, kept`
        : `POST /api/voice · ${seconds}s · ${kb} KB audio, transcribe and discard`,
      sendRecording ? undefined : "withheld"
    )
    await wait(1400, signal)
    if (outcomeRef.current === "fails") {
      note("← 502 transcription failed")
      throw new VoiceTranscriptionError("failed")
    }
    if (outcomeRef.current === "empty") {
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
    return { transcript: SAMPLE_TRANSCRIPTS[index], audioId }
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
  const field = inField ? (
    <Textarea
      value={text}
      onChange={(event) => setText(event.target.value)}
      placeholder="Type, or record and the transcript lands here"
      aria-label="Answer"
      className="min-h-24 rounded-none border-0 bg-transparent px-4 pt-3.5 shadow-none focus-visible:ring-0"
    />
  ) : null

  return (
    <div
      className={cn("flex w-content max-w-full flex-col gap-6", className)}
      {...props}
    >
      <DemoFrame className="w-full min-w-0! px-4 py-10 sm:px-6">
        <div className="flex w-full max-w-[26rem] flex-col gap-3">
          <VoiceInput
            // A new flow or microphone starts from a clean slate.
            key={`${submit}-${mic}-${inField}`}
            submit={submit}
            getStream={getStream}
            onTranscribe={transcribe}
            onResult={(result) => {
              if (inField) setText(result.transcript)
            }}
            onReset={() => {
              if (inField) setText("")
            }}
            onDeleteRecording={(result) => {
              note(`DELETE /api/voice/${result.audioId}`, "deleted")
            }}
            sendRecording={sendRecording}
            onSendRecordingChange={setSendRecording}
            variant={variant}
            size={size}
            radius={radius ?? undefined}
            waveform={waveform}
            glowVariant={toneStyle.glow}
            glowStrength={glowStrength}
            style={
              toneStyle.accent
                ? ({ "--voice-accent": toneStyle.accent } as CSSProperties)
                : undefined
            }
            {...parts}
            showTranscript={parts.showTranscript && !inField}
            // A synthetic or blocked source has no devices to switch between.
            showMicPicker={parts.showMicPicker && mic === "real"}
          >
            {field}
          </VoiceInput>
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
              ["review", "Review"],
              ["manual", "Hold"],
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
          <Row label="Send audio">
            <Switch
              size="sm"
              checked={sendRecording}
              onCheckedChange={setSendRecording}
              aria-label="Send audio with the transcript"
            />
          </Row>
          <Row label="Inside a field">
            <Switch
              size="sm"
              checked={inField}
              onCheckedChange={setInField}
              aria-label="Put a text field inside the control"
            />
          </Row>
        </TabsContent>

        <TabsContent value="look" className="flex flex-col gap-3">
          <Choice
            label="Surface"
            value={variant}
            onChange={setVariant}
            options={[
              ["outline", "Outline"],
              ["soft", "Soft"],
              ["ghost", "Ghost"],
            ]}
          />
          <Choice
            label="Size"
            value={size}
            onChange={(next) => {
              setSize(next)
              setRadius(null)
            }}
            options={[
              ["sm", "S"],
              ["md", "M"],
              ["lg", "L"],
            ]}
          />
          <Choice
            label="Waveform"
            value={waveform}
            onChange={setWaveform}
            options={[
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
              aria-label="Corner radius"
              min={0}
              max={32}
              step={1}
              value={[radius ?? DEFAULT_RADIUS[size]]}
              onValueChange={(value) =>
                setRadius(Array.isArray(value) ? value[0] : value)
              }
              className="w-44"
            />
            <Value>{radius ?? DEFAULT_RADIUS[size]}px</Value>
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
