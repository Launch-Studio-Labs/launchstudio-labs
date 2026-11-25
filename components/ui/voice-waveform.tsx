"use client"

/**
 * Dictation Input — the live waveform drawn while recording and the playback
 * player shown after. Both paint in `currentColor`, so they follow whatever
 * text colour the parent sets.
 *
 * Part of the Launch Studio Labs Dictation Input component.
 * https://labs.launchstudio.space/dictation-input
 */

import {
  useCallback,
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type KeyboardEvent,
  type PointerEvent,
} from "react"
import { PauseIcon, PlayIcon } from "@phosphor-icons/react"
import { getAudioContext } from "voice-glow"

import { cn } from "@/lib/utils"
import {
  barHeight,
  clampTime,
  computePeaks,
  formatElapsed,
  formatPlayback,
  resamplePeaks,
  seekForKey,
  seekFromPointer,
} from "@/lib/voice-recording"

/**
 * - `bars`: a scrolling history of the level, newest on the right — reads as
 *   "this is being kept", the way a voice memo does
 * - `dots`: the same history as dots, quieter than bars
 */
export type VoiceWaveformStyle = "bars" | "dots"

/**
 * What the live canvas can draw: the waveform styles, plus `level` — a row of
 * bars across the whole lane that all rise and fall with the voice.
 */
export type LiveWaveformStyle = VoiceWaveformStyle | "level"

const BAR = { bars: 3, dots: 3, level: 4 } as const
const GAP = { bars: 2, dots: 3, level: 4 } as const
/** A new bar enters this often, so the history scrolls at a steady pace. */
const BAR_EVERY_MS = 70

export interface LiveWaveformProps extends ComponentProps<"div"> {
  analyser: AnalyserNode | null
  /** Smoothed 0–1 level, sampled per frame. */
  getLevel: () => number
  /** Hold the picture where it is (a paused take). */
  frozen?: boolean
  /**
   * The take is being transcribed: no voice any more, so each style plays
   * its own "working" motion — a pulse through the bars and dots, a sweep
   * across the level bars.
   */
  processing?: boolean
  waveform?: LiveWaveformStyle
  /**
   * Paint with these instead of `currentColor`: a palette in Voice Glow's
   * order (centre first, then pairs outward), laid across the lane as a
   * horizontal gradient, centre in the middle.
   */
  colors?: readonly string[]
}

/**
 * The signal while a take runs, on a canvas so it costs one paint per frame
 * and no React renders.
 */
export function LiveWaveform({
  analyser,
  getLevel,
  frozen = false,
  processing = false,
  waveform = "bars",
  colors,
  className,
  ...props
}: LiveWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)
  const frozenRef = useRef(frozen)
  const processingRef = useRef(processing)
  /** Kept across re-subscriptions, so the picture carries on into processing. */
  const historyRef = useRef<number[]>([])
  useEffect(() => {
    frozenRef.current = frozen
    processingRef.current = processing
  }, [frozen, processing])

  useEffect(() => {
    const canvas = canvasRef.current
    const context = canvas?.getContext("2d")
    if (!canvas || !context) return

    let width = 0
    let height = 0
    let color = "currentColor"
    const resize = () => {
      const rect = canvas.getBoundingClientRect()
      const ratio = window.devicePixelRatio || 1
      width = rect.width
      height = rect.height
      canvas.width = Math.round(width * ratio)
      canvas.height = Math.round(height * ratio)
      context.setTransform(ratio, 0, 0, ratio, 0, 0)
      color = getComputedStyle(canvas).color
    }
    resize()
    const observer = new ResizeObserver(resize)
    observer.observe(canvas)

    const history = historyRef.current
    let lastPush = 0
    /** 0 while listening, eases to 1 while processing, so the switch blends. */
    let work = processingRef.current ? 1 : 0
    let raf = 0
    let frame = 0

    const draw = (now: number) => {
      raf = requestAnimationFrame(draw)
      // Colour follows theme switches without a style read every frame.
      if (++frame % 30 === 0) color = getComputedStyle(canvas).color
      if (frozenRef.current && frame > 1) return

      context.clearRect(0, 0, width, height)
      const paint = colors?.length
        ? paletteGradient(context, width, colors)
        : color
      context.fillStyle = paint
      context.strokeStyle = paint
      const mid = height / 2
      const t = now / 1000
      work += ((processingRef.current ? 1 : 0) - work) * 0.08

      const bar = BAR[waveform]
      const gap = GAP[waveform]
      const count = Math.max(1, Math.floor((width + gap) / (bar + gap)))

      if (waveform === "level") {
        // Every bar follows the one level, shaped by a gentle bell and a fixed
        // ripple so the row reads as a voice, not a block. Processing sweeps
        // a crest from left to right and back.
        const level = frozenRef.current ? 0 : getLevel()
        const offset = (width - (count * (bar + gap) - gap)) / 2
        for (let i = 0; i < count; i++) {
          const u = (i + 0.5) / count
          const bell = 0.45 + 0.55 * Math.sin(u * Math.PI)
          const ripple = 0.8 + 0.2 * Math.sin(i * 1.7) * Math.cos(i * 0.6)
          const listening = level * bell * ripple * 1.3
          const sweep = Math.cos(u * Math.PI * 2 - Math.sin(t * 1.4) * Math.PI)
          const thinking = 0.18 + 0.42 * Math.max(0, sweep) ** 3
          const value = Math.min(1, listening * (1 - work) + thinking * work)
          const h = Math.max(bar, (0.12 + 0.88 * value) * height)
          roundRect(
            context,
            offset + i * (bar + gap),
            mid - h / 2,
            bar,
            h,
            bar / 2
          )
        }
        return
      }

      if (now - lastPush >= BAR_EVERY_MS) {
        lastPush = now
        // Processing feeds the history a rolling pulse, so it keeps moving
        // the way it did while listening.
        const pulse =
          0.16 +
          0.5 *
            (0.5 + 0.5 * Math.sin(t * 5)) *
            (0.55 + 0.45 * Math.sin(t * 1.3))
        history.push(getLevel() * (1 - work) + pulse * work)
        if (history.length > count) history.splice(0, history.length - count)
      }
      for (let i = 0; i < count; i++) {
        // Newest on the right; the lane fills from the right edge.
        const level = history[history.length - count + i] ?? 0
        const x = i * (bar + gap)
        if (waveform === "dots") {
          const r = bar / 2
          const spread = level * (mid - r)
          context.globalAlpha = 0.35 + level * 0.65
          context.beginPath()
          context.arc(x + r, mid - spread * 0.5, r, 0, Math.PI * 2)
          context.arc(x + r, mid + spread * 0.5, r, 0, Math.PI * 2)
          context.fill()
        } else {
          const h = Math.max(bar, barHeight(level, 0.1) * height)
          context.globalAlpha = 1
          roundRect(context, x, mid - h / 2, bar, h, bar / 2)
        }
      }
      context.globalAlpha = 1
    }
    raf = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(raf)
      observer.disconnect()
    }
  }, [analyser, getLevel, waveform, colors])

  return (
    <div
      data-slot="voice-live-waveform"
      aria-hidden="true"
      className={cn("relative h-6 min-w-0", className)}
      {...props}
    >
      <canvas ref={canvasRef} className="absolute inset-0 size-full" />
    </div>
  )
}

/**
 * A palette (centre first, then left/right pairs outward) as a gradient
 * across the lane: the outermost pair at the edges, the centre colour in the
 * middle — the same arrangement as Voice Glow's lobes.
 */
function paletteGradient(
  context: CanvasRenderingContext2D,
  width: number,
  colors: readonly string[]
) {
  const gradient = context.createLinearGradient(0, 0, Math.max(1, width), 0)
  const pairs = Math.floor((colors.length - 1) / 2)
  gradient.addColorStop(0.5, colors[0])
  for (let k = 1; k <= pairs; k++) {
    const offset = (0.5 * k) / pairs
    gradient.addColorStop(0.5 - offset, colors[2 * k - 1])
    gradient.addColorStop(0.5 + offset, colors[2 * k])
  }
  return gradient
}

function roundRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) {
  context.beginPath()
  if (context.roundRect) context.roundRect(x, y, w, h, r)
  else context.rect(x, y, w, h)
  context.fill()
}

// ── Playback ──

/** Peaks kept per recording; bars on screen are resampled from these. */
const PEAK_RESOLUTION = 1200
/** Voice needs nothing above 12 kHz; decoding at 24 kHz halves the memory. */
const DECODE_RATE = 24_000
const TRACK_HEIGHT = 28

type Load =
  | { state: "loading" }
  | { state: "ready"; buffer: AudioBuffer; peaks: number[] }
  | { state: "failed" }

export interface VoicePlayerLabels {
  play: string
  pause: string
  position: string
}

export interface VoicePlayerProps extends Omit<
  ComponentProps<"div">,
  "children"
> {
  /** The recording: a Blob from this session or a URL to a stored file. */
  source: Blob | string
  /** Shown before the audio decodes (and if it never does). */
  durationMs?: number | null
  waveform?: VoiceWaveformStyle
  labels?: Partial<VoicePlayerLabels>
}

const PLAYER_LABELS: VoicePlayerLabels = {
  play: "Play recording",
  pause: "Pause recording",
  position: "Playback position",
}

/**
 * A recording's waveform with play/pause and a scrubbable timeline. Plays
 * through Web Audio from the decoded buffer, so MediaRecorder WebM (no
 * duration, no cues) and Safari's MP4 seek the same.
 *
 * Remount it (a `key`) for a new recording.
 */
export function VoicePlayer({
  source,
  durationMs = null,
  waveform = "bars",
  labels: labelOverrides,
  className,
  ...props
}: VoicePlayerProps) {
  const labels = { ...PLAYER_LABELS, ...labelOverrides }
  const [load, setLoad] = useState<Load>({ state: "loading" })
  const [playing, setPlaying] = useState(false)
  const [second, setSecond] = useState(0)
  const [width, setWidth] = useState(0)

  const trackRef = useRef<HTMLDivElement | null>(null)
  const playedRef = useRef<HTMLDivElement | null>(null)
  const timeRef = useRef<HTMLSpanElement | null>(null)
  const nodeRef = useRef<AudioBufferSourceNode | null>(null)
  /** Position in seconds while paused; where playback started while playing. */
  const offsetRef = useRef(0)
  const startedAtRef = useRef(0)
  const rafRef = useRef(0)
  const dragRef = useRef<{ resume: boolean } | null>(null)

  // Decode once per recording.
  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const bytes =
          typeof source === "string"
            ? await fetch(source).then((res) => {
                if (!res.ok) throw new Error(String(res.status))
                return res.arrayBuffer()
              })
            : await source.arrayBuffer()
        const buffer = await decode(bytes)
        if (cancelled) return
        const channels = Array.from(
          { length: buffer.numberOfChannels },
          (_, i) => buffer.getChannelData(i)
        )
        setLoad({
          state: "ready",
          buffer,
          peaks: computePeaks(channels, PEAK_RESOLUTION),
        })
      } catch {
        if (!cancelled) setLoad({ state: "failed" })
      }
    })()
    return () => {
      cancelled = true
    }
  }, [source])

  // Bars follow the track's width.
  useEffect(() => {
    const track = trackRef.current
    if (!track) return
    const observer = new ResizeObserver(([entry]) => {
      setWidth(Math.floor(entry.contentRect.width))
    })
    observer.observe(track)
    return () => observer.disconnect()
  }, [])

  const duration =
    load.state === "ready" ? load.buffer.duration : (durationMs ?? 0) / 1000

  const currentTime = useCallback(() => {
    const node = nodeRef.current
    const context = node?.context
    if (!node || !context) return offsetRef.current
    return clampTime(
      offsetRef.current + (context.currentTime - startedAtRef.current),
      duration
    )
  }, [duration])

  const paint = useCallback(
    (time: number) => {
      const fraction = duration > 0 ? time / duration : 0
      if (playedRef.current) {
        playedRef.current.style.clipPath = `inset(0 ${(1 - fraction) * 100}% 0 0)`
      }
      if (timeRef.current) {
        timeRef.current.textContent = formatPlayback(time, duration)
      }
      const whole = Math.floor(time)
      setSecond((prev) => (prev === whole ? prev : whole))
    },
    [duration]
  )

  const stopNode = useCallback(() => {
    cancelAnimationFrame(rafRef.current)
    const node = nodeRef.current
    nodeRef.current = null
    if (node) {
      node.onended = null
      try {
        node.stop()
      } catch {
        // Already stopped.
      }
      node.disconnect()
    }
  }, [])

  const startAt = useCallback(
    (time: number) => {
      if (load.state !== "ready") return
      const context = getAudioContext()
      if (!context) return
      stopNode()
      if (context.state === "suspended") void context.resume()
      const from = time >= duration - 0.05 ? 0 : clampTime(time, duration)
      const node = context.createBufferSource()
      node.buffer = load.buffer
      node.connect(context.destination)
      node.onended = () => {
        if (nodeRef.current !== node) return
        nodeRef.current = null
        cancelAnimationFrame(rafRef.current)
        offsetRef.current = 0
        setPlaying(false)
        paint(duration)
        // Rest at the start after a short beat at the end.
        window.setTimeout(() => {
          if (!nodeRef.current) paint(0)
        }, 400)
      }
      offsetRef.current = from
      startedAtRef.current = context.currentTime
      node.start(0, from)
      nodeRef.current = node
      setPlaying(true)
      const tick = () => {
        paint(currentTime())
        rafRef.current = requestAnimationFrame(tick)
      }
      rafRef.current = requestAnimationFrame(tick)
    },
    [load, duration, stopNode, paint, currentTime]
  )

  const pause = useCallback(() => {
    const time = currentTime()
    stopNode()
    offsetRef.current = time
    setPlaying(false)
    paint(time)
  }, [currentTime, stopNode, paint])

  const seek = useCallback(
    (time: number) => {
      const next = clampTime(time, duration)
      if (nodeRef.current) {
        startAt(next)
      } else {
        offsetRef.current = next
        paint(next)
      }
    },
    [duration, startAt, paint]
  )

  // Stop the sound when the player goes away (reset, re-record, unmount).
  useEffect(() => stopNode, [stopNode])

  useEffect(() => {
    if (load.state === "ready") paint(offsetRef.current)
  }, [load, paint])

  function toggle() {
    if (load.state !== "ready") return
    if (nodeRef.current) pause()
    else startAt(offsetRef.current)
  }

  function onPointerDown(event: PointerEvent<HTMLDivElement>) {
    if (load.state !== "ready" || event.button !== 0) return
    const track = event.currentTarget
    track.setPointerCapture(event.pointerId)
    // Quiet while scrubbing; carry on from the new spot on release.
    dragRef.current = { resume: nodeRef.current !== null }
    if (nodeRef.current) {
      const time = currentTime()
      stopNode()
      offsetRef.current = time
    }
    scrubTo(event.clientX, track)
  }

  function onPointerMove(event: PointerEvent<HTMLDivElement>) {
    if (!dragRef.current) return
    scrubTo(event.clientX, event.currentTarget)
  }

  function onPointerUp(event: PointerEvent<HTMLDivElement>) {
    const drag = dragRef.current
    if (!drag) return
    dragRef.current = null
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    if (drag.resume) startAt(offsetRef.current)
    else setPlaying(false)
  }

  function scrubTo(clientX: number, track: HTMLDivElement) {
    const rect = track.getBoundingClientRect()
    const time = seekFromPointer(clientX, rect.left, rect.width, duration)
    offsetRef.current = time
    paint(time)
  }

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (event.key === " " || event.key === "Enter") {
      event.preventDefault()
      toggle()
      return
    }
    const next = seekForKey(event.key, currentTime(), duration)
    if (next === null) return
    event.preventDefault()
    seek(next)
  }

  const ready = load.state === "ready"
  const dots = waveform === "dots"
  const bar = dots ? 3 : 2
  const gap = dots ? 2.5 : 1.5
  const bars = Math.max(0, Math.floor((width + gap) / (bar + gap)))
  const heights = ready
    ? resamplePeaks(load.peaks, bars).map((peak) => barHeight(peak))
    : new Array<number>(bars).fill(barHeight(0))
  const total = formatElapsed(duration * 1000)

  const wave = (className: string) => (
    <svg
      width={width}
      height={TRACK_HEIGHT}
      viewBox={`0 0 ${width} ${TRACK_HEIGHT}`}
      className={cn("absolute inset-0 block", className)}
      aria-hidden="true"
      focusable="false"
    >
      {heights.map((height, i) => {
        const x = i * (bar + gap)
        if (dots) {
          const spread = (height - barHeight(0)) * (TRACK_HEIGHT / 2 - bar)
          return (
            <g key={i}>
              <circle
                cx={x + bar / 2}
                cy={TRACK_HEIGHT / 2 - spread / 2}
                r={bar / 2}
              />
              <circle
                cx={x + bar / 2}
                cy={TRACK_HEIGHT / 2 + spread / 2}
                r={bar / 2}
              />
            </g>
          )
        }
        const h = Math.max(bar, height * TRACK_HEIGHT)
        return (
          <rect
            key={i}
            x={x}
            y={(TRACK_HEIGHT - h) / 2}
            width={bar}
            height={h}
            rx={bar / 2}
          />
        )
      })}
    </svg>
  )

  if (load.state === "failed") {
    return (
      <p
        data-slot="voice-player"
        className={cn("text-xs text-muted-foreground tabular-nums", className)}
      >
        {total}
      </p>
    )
  }

  return (
    <div
      data-slot="voice-player"
      className={cn("flex min-w-0 items-center gap-2.5", className)}
      {...props}
    >
      <button
        type="button"
        onClick={toggle}
        disabled={!ready}
        aria-label={playing ? labels.pause : labels.play}
        className={cn(
          "relative inline-flex size-7 shrink-0 items-center justify-center rounded-full bg-background text-foreground shadow-xs ring-1 ring-foreground/10 outline-none",
          "before:absolute before:-inset-1 before:rounded-full before:content-[''] pointer-coarse:before:-inset-2",
          "transition-[box-shadow,scale] duration-150 ease-out active:scale-[0.94]",
          "hover:ring-foreground/20 focus-visible:ring-3 focus-visible:ring-ring/40",
          "disabled:cursor-default disabled:text-muted-foreground disabled:active:scale-100"
        )}
      >
        {playing ? (
          <PauseIcon className="size-3" weight="fill" aria-hidden="true" />
        ) : (
          <PlayIcon
            className="size-3 translate-x-px"
            weight="fill"
            aria-hidden="true"
          />
        )}
      </button>

      <div
        ref={trackRef}
        role="slider"
        tabIndex={ready ? 0 : -1}
        aria-label={labels.position}
        aria-valuemin={0}
        aria-valuemax={Math.round(duration)}
        aria-valuenow={second}
        aria-valuetext={`${formatElapsed(second * 1000)} of ${total}`}
        aria-disabled={!ready || undefined}
        onPointerDown={onPointerDown}
        onPointerMove={onPointerMove}
        onPointerUp={onPointerUp}
        onPointerCancel={onPointerUp}
        onKeyDown={onKeyDown}
        className={cn(
          "relative h-7 min-w-0 flex-1 cursor-pointer rounded-sm outline-none select-none",
          // Vertical swipes still scroll the page; horizontal ones scrub.
          "touch-pan-y",
          "focus-visible:ring-3 focus-visible:ring-ring/40 focus-visible:ring-offset-2",
          !ready && "cursor-default"
        )}
      >
        {wave(
          cn(
            "fill-[var(--voice-wave-rest,color-mix(in_oklab,var(--color-muted-foreground)_45%,transparent))]",
            !ready && "animate-pulse"
          )
        )}
        <div
          ref={playedRef}
          className="absolute inset-0"
          style={{ clipPath: "inset(0 100% 0 0)" }}
        >
          {wave("fill-[var(--voice-wave,var(--color-foreground))]")}
        </div>
      </div>

      <span
        ref={timeRef}
        className="shrink-0 text-xs text-muted-foreground tabular-nums"
      >
        {formatPlayback(0, duration)}
      </span>
    </div>
  )
}

async function decode(bytes: ArrayBuffer) {
  const Offline =
    window.OfflineAudioContext ??
    (
      window as unknown as {
        webkitOfflineAudioContext?: typeof OfflineAudioContext
      }
    ).webkitOfflineAudioContext
  if (Offline) {
    try {
      // decodeAudioData resamples to the context's rate.
      const context = new Offline(1, 1, DECODE_RATE)
      return await context.decodeAudioData(bytes.slice(0))
    } catch {
      // Older Safari only decodes at hardware rates; fall through.
    }
  }
  const context = getAudioContext()
  if (!context) throw new Error("No Web Audio")
  return context.decodeAudioData(bytes)
}
