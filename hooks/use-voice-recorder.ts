"use client"

/**
 * useVoiceRecorder — microphone, MediaRecorder and level metering for the
 * Dictation Input component, usable on its own for a custom UI.
 *
 * It owns everything between "the user pressed record" and "here is a
 * finished take": the permission request, device choice (remembered across
 * visits), auto gain, pause/resume, the clock, the max-length cutoff, silence
 * detection and every way that can fail. What happens to the take afterwards
 * — sending it, holding it for review — is the caller's business.
 *
 * Part of the Launch Studio Labs Dictation Input component.
 * https://labs.launchstudio.space/dictation-input
 */

import { useCallback, useEffect, useRef, useState } from "react"
import { getAudioContext } from "voice-glow"

import {
  isSilentTake,
  listInputs,
  meterLevel,
  peakOf,
  pickRecordingMime,
  resolveInputDevice,
  rmsOf,
  type AudioInput,
} from "@/lib/voice-recording"

export type VoiceRecorderStatus =
  "idle" | "requesting" | "recording" | "paused" | "stopping"

/**
 * Why the microphone could not be used, or why a take was thrown away.
 * - `unsupported`: no getUserMedia / MediaRecorder in this browser
 * - `insecure`: the page is not a secure context (https or localhost)
 * - `denied`: the user or the browser blocked microphone access
 * - `no-device`: there is no microphone, or the chosen one is gone
 * - `too-short`: the take ended before `minDurationMs`
 * - `error`: anything else the browser threw
 */
export type VoiceRecorderProblem =
  "unsupported" | "insecure" | "denied" | "no-device" | "too-short" | "error"

export interface VoiceTake {
  blob: Blob
  mimeType: string
  /** Recorded time, pauses excluded. */
  durationMs: number
  /**
   * The meter saw flat silence for the whole take: a muted, virtual or
   * OS-blocked input. Worth telling apart from "they mumbled".
   */
  silent: boolean
}

export interface UseVoiceRecorderOptions {
  /**
   * Browser automatic gain control. On by default: with it off, quiet
   * microphones arrive too faint for transcription models, which answer a
   * barely-there voice with an empty transcript.
   */
  autoGainControl?: boolean
  echoCancellation?: boolean
  noiseSuppression?: boolean
  /** The take stops itself here. Default 5 minutes. */
  maxDurationMs?: number
  /** Shorter takes are discarded as `too-short`. Default 700ms. */
  minDurationMs?: number
  /** With no signal this long into a take, `quiet` turns true. Default 2.5s. */
  quietAfterMs?: number
  /**
   * localStorage key the chosen microphone is remembered under, or `false`
   * to forget it with the page.
   */
  rememberInput?: string | false
  /**
   * Replaces `navigator.mediaDevices.getUserMedia`. For tests, demos and
   * custom sources (a synthetic stream, a WebRTC track).
   */
  getStream?: (constraints: MediaStreamConstraints) => Promise<MediaStream>
  /** A finished take. Not called for cancelled or too-short takes. */
  onTake?: (take: VoiceTake) => void
}

const DEFAULT_INPUT_KEY = "dictation-input.device"

export function useVoiceRecorder({
  autoGainControl = true,
  echoCancellation = true,
  noiseSuppression = true,
  maxDurationMs = 5 * 60_000,
  minDurationMs = 700,
  quietAfterMs = 2500,
  rememberInput = DEFAULT_INPUT_KEY,
  getStream,
  onTake,
}: UseVoiceRecorderOptions = {}) {
  const [status, setStatus] = useState<VoiceRecorderStatus>("idle")
  const [problem, setProblem] = useState<VoiceRecorderProblem | null>(null)
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null)
  const [inputs, setInputs] = useState<AudioInput[]>([])
  const [activeInput, setActiveInput] = useState<AudioInput | null>(null)
  const [elapsedMs, setElapsedMs] = useState(0)
  const [quiet, setQuiet] = useState(false)

  const recorderRef = useRef<MediaRecorder | null>(null)
  const streamRef = useRef<MediaStream | null>(null)
  const chunksRef = useRef<Blob[]>([])
  /** Recorded time banked before the current run (pauses split runs). */
  const bankedRef = useRef(0)
  /** When the current run started, or 0 while paused. */
  const runStartRef = useRef(0)
  const timerRef = useRef(0)
  const finishingRef = useRef(false)
  const unmountedRef = useRef(false)
  const meterRef = useRef<{
    stop: () => void
    peak: () => number | null
  } | null>(null)
  const levelRef = useRef(0)

  // The latest options, read from async callbacks without re-subscribing.
  const optionsRef = useRef({
    autoGainControl,
    echoCancellation,
    noiseSuppression,
    maxDurationMs,
    minDurationMs,
    quietAfterMs,
    rememberInput,
    getStream,
    onTake,
  })
  useEffect(() => {
    optionsRef.current = {
      autoGainControl,
      echoCancellation,
      noiseSuppression,
      maxDurationMs,
      minDurationMs,
      quietAfterMs,
      rememberInput,
      getStream,
      onTake,
    }
  })

  const recordedMs = useCallback(() => {
    const run = runStartRef.current ? Date.now() - runStartRef.current : 0
    return bankedRef.current + run
  }, [])

  const stopTimer = useCallback(() => {
    window.clearInterval(timerRef.current)
    timerRef.current = 0
  }, [])

  const stopMeter = useCallback(() => {
    meterRef.current?.stop()
    meterRef.current = null
    levelRef.current = 0
    setAnalyser(null)
  }, [])

  const releaseMic = useCallback(() => {
    stopTimer()
    stopMeter()
    streamRef.current?.getTracks().forEach((track) => track.stop())
    streamRef.current = null
    recorderRef.current = null
    setStream(null)
  }, [stopMeter, stopTimer])

  const refreshInputs = useCallback(async () => {
    if (!navigator.mediaDevices?.enumerateDevices) return []
    try {
      const next = listInputs(await navigator.mediaDevices.enumerateDevices())
      // Labels stay empty until permission is granted; a list of blank
      // "Microphone 1, 2" isn't worth showing.
      const labelled =
        next.length > 0 && !/^Microphone \d+$/.test(next[0].label)
      if (!unmountedRef.current) setInputs(labelled ? next : [])
      return next
    } catch {
      return []
    }
  }, [])

  // Plugging in a headset or switching the system default updates the menu.
  useEffect(() => {
    const devices = navigator.mediaDevices
    if (!devices?.addEventListener) return
    const onChange = () => void refreshInputs()
    devices.addEventListener("devicechange", onChange)
    // Labels are already readable when permission was granted on an earlier
    // visit, so the picker can show before the first take.
    const initial = window.setTimeout(onChange, 0)
    return () => {
      window.clearTimeout(initial)
      devices.removeEventListener("devicechange", onChange)
    }
  }, [refreshInputs])

  useEffect(() => {
    unmountedRef.current = false
    return () => {
      unmountedRef.current = true
      const recorder = recorderRef.current
      releaseMic()
      if (recorder && recorder.state !== "inactive") {
        try {
          recorder.stop()
        } catch {
          // The track ending already stopped it.
        }
      }
    }
  }, [releaseMic])

  function startMeter(next: MediaStream, context: AudioContext | null) {
    stopMeter()
    if (!context) return
    let source: MediaStreamAudioSourceNode
    let node: AnalyserNode
    let sink: GainNode
    try {
      source = context.createMediaStreamSource(next)
      node = context.createAnalyser()
      node.fftSize = 1024
      node.smoothingTimeConstant = 0.6
      // Safari only runs a graph that reaches the destination; a muted gain
      // keeps it pulling without playing the microphone back.
      sink = context.createGain()
      sink.gain.value = 0
      source.connect(node)
      node.connect(sink)
      sink.connect(context.destination)
    } catch {
      return
    }
    const samples = new Float32Array(node.fftSize)
    let peak = 0
    let frames = 0
    let raf = 0
    const tick = () => {
      node.getFloatTimeDomainData(samples)
      // Paused runs don't count toward the silence check.
      if (context.state === "running" && runStartRef.current) {
        frames += 1
        peak = Math.max(peak, peakOf(samples))
      }
      const target = meterLevel(rmsOf(samples))
      // Fast attack, slower release: reads like a VU meter, not a flicker.
      const level = levelRef.current
      levelRef.current =
        level + (target - level) * (target > level ? 0.5 : 0.12)
      raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    setAnalyser(node)
    meterRef.current = {
      stop: () => {
        cancelAnimationFrame(raf)
        try {
          source.disconnect()
          node.disconnect()
          sink.disconnect()
        } catch {
          // Already disconnected.
        }
      },
      // Only trust the peak once the graph has been running for a moment;
      // a suspended context reads as zeros.
      peak: () => (frames > 20 ? peak : null),
    }
  }

  function constraints(deviceId: string | null): MediaStreamConstraints {
    const { autoGainControl, echoCancellation, noiseSuppression } =
      optionsRef.current
    return {
      audio: {
        autoGainControl,
        echoCancellation,
        noiseSuppression,
        ...(deviceId ? { deviceId: { exact: deviceId } } : {}),
      },
    }
  }

  async function requestMicrophone(storedId: string | null) {
    const custom = optionsRef.current.getStream
    const request = (c: MediaStreamConstraints) =>
      custom ? custom(c) : navigator.mediaDevices.getUserMedia(c)
    let deviceId = storedId
    if (deviceId && !custom) {
      // Drop a remembered device that is no longer plugged in. Before
      // permission enumerateDevices hides ids, so keep it and let `exact`
      // decide.
      try {
        const listed = listInputs(
          await navigator.mediaDevices.enumerateDevices()
        )
        const known = listed.some((input) => input.deviceId !== "")
        if (known && !resolveInputDevice(listed, deviceId)) deviceId = null
      } catch {
        // Fall through with the stored id.
      }
    }
    if (deviceId) {
      try {
        return await request(constraints(deviceId))
      } catch (error) {
        const name = errorName(error)
        if (name === "NotAllowedError" || name === "SecurityError") throw error
        // The remembered device vanished or refused: forget it, use default.
        writeStoredInput(optionsRef.current.rememberInput, null)
      }
    }
    try {
      return await request(constraints(null))
    } catch (error) {
      const name = errorName(error)
      if (
        name === "NotAllowedError" ||
        name === "SecurityError" ||
        name === "NotFoundError"
      ) {
        throw error
      }
      // Some engines reject the processing constraints outright.
      return request({ audio: true })
    }
  }

  async function showActiveInput(track: MediaStreamTrack | undefined) {
    const list = await refreshInputs()
    if (!track || unmountedRef.current) return
    const id = track.getSettings?.().deviceId ?? ""
    const match =
      list.find((input) => input.deviceId === id) ??
      // Safari can omit deviceId from settings; the label still matches.
      list.find((input) => track.label && input.label === track.label)
    setActiveInput(
      match ??
        // A custom source's track label is a node name, not a device.
        (track.label && !optionsRef.current.getStream
          ? { deviceId: id, label: track.label }
          : null)
    )
  }

  function startClock() {
    stopTimer()
    timerRef.current = window.setInterval(() => {
      const ms = recordedMs()
      setElapsedMs(ms)
      const { quietAfterMs, maxDurationMs } = optionsRef.current
      if (ms >= quietAfterMs) {
        setQuiet(isSilentTake(meterRef.current?.peak() ?? null))
      }
      if (ms >= maxDurationMs) void stop()
    }, 200)
  }

  async function begin(deviceId: string | null) {
    setStatus("requesting")
    // Created inside the click: Safari only lets an AudioContext start from
    // a user gesture. It is the same context Voice Glow analyses with.
    const context = getAudioContext()
    let next: MediaStream
    try {
      next = await requestMicrophone(deviceId)
    } catch (error) {
      if (unmountedRef.current) return false
      const name = errorName(error)
      setProblem(
        name === "NotAllowedError" || name === "SecurityError"
          ? "denied"
          : name === "NotFoundError" || name === "OverconstrainedError"
            ? "no-device"
            : "error"
      )
      setStatus("idle")
      return false
    }
    if (unmountedRef.current) {
      next.getTracks().forEach((track) => track.stop())
      return false
    }

    let recorder: MediaRecorder
    try {
      const mime = pickRecordingMime((type) =>
        MediaRecorder.isTypeSupported(type)
      )
      recorder = new MediaRecorder(next, mime ? { mimeType: mime } : undefined)
    } catch {
      next.getTracks().forEach((track) => track.stop())
      setProblem("unsupported")
      setStatus("idle")
      return false
    }

    chunksRef.current = []
    recorder.ondataavailable = (event) => {
      if (event.data.size) chunksRef.current.push(event.data)
    }
    recorderRef.current = recorder
    streamRef.current = next
    setStream(next)

    const track = next.getAudioTracks()[0]
    // Unplugging the microphone ends the track: keep what was said.
    track?.addEventListener("ended", () => {
      if (recorderRef.current === recorder) void stop()
    })
    void showActiveInput(track)

    if (context && context.state === "suspended") {
      await context.resume().catch(() => {})
    }
    startMeter(next, context)

    bankedRef.current = 0
    runStartRef.current = Date.now()
    recorder.start(250)
    setElapsedMs(0)
    setQuiet(false)
    setStatus("recording")
    startClock()
    return true
  }

  /** Stop the recorder and resolve with every chunk it produced. */
  function stopRecorder(recorder: MediaRecorder) {
    return new Promise<Blob>((resolve) => {
      // The final dataavailable fires before stop, so the blob is complete.
      recorder.addEventListener(
        "stop",
        () => {
          resolve(
            new Blob(chunksRef.current, {
              type: recorder.mimeType || "audio/webm",
            })
          )
        },
        { once: true }
      )
      recorder.stop()
    })
  }

  /** Ask for the microphone and start a take. Call it from a click. */
  async function start() {
    if (status !== "idle") return false
    setProblem(null)
    if (typeof window !== "undefined" && window.isSecureContext === false) {
      setProblem("insecure")
      return false
    }
    if (!optionsRef.current.getStream && !canRecord()) {
      setProblem("unsupported")
      return false
    }
    return begin(readStoredInput(optionsRef.current.rememberInput))
  }

  /** Finish the take and hand it to `onTake`. */
  async function stop() {
    if (finishingRef.current) return null
    const recorder = recorderRef.current
    if (!recorder || recorder.state === "inactive") return null
    finishingRef.current = true
    const durationMs = recordedMs()
    runStartRef.current = 0
    stopTimer()
    setStatus("stopping")
    const peak = meterRef.current?.peak() ?? null
    const blob = await stopRecorder(recorder)
    releaseMic()
    finishingRef.current = false
    if (unmountedRef.current) return null
    setStatus("idle")
    setQuiet(false)
    if (durationMs < optionsRef.current.minDurationMs || blob.size === 0) {
      setProblem("too-short")
      return null
    }
    const take: VoiceTake = {
      blob,
      mimeType: blob.type || "audio/webm",
      durationMs,
      silent: isSilentTake(peak),
    }
    optionsRef.current.onTake?.(take)
    return take
  }

  function pause() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== "recording") return
    recorder.pause()
    bankedRef.current = recordedMs()
    runStartRef.current = 0
    setElapsedMs(bankedRef.current)
    setStatus("paused")
  }

  function resume() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state !== "paused") return
    recorder.resume()
    runStartRef.current = Date.now()
    setStatus("recording")
  }

  /** Throw the current take away. Nothing reaches `onTake`. */
  async function cancel() {
    const recorder = recorderRef.current
    if (!recorder || recorder.state === "inactive" || finishingRef.current) {
      return
    }
    finishingRef.current = true
    runStartRef.current = 0
    stopTimer()
    await stopRecorder(recorder)
    releaseMic()
    finishingRef.current = false
    if (unmountedRef.current) return
    setStatus("idle")
    setQuiet(false)
    setElapsedMs(0)
  }

  /**
   * Use another microphone. Mid-take, the take restarts on the new device
   * rather than stitching two recordings together.
   */
  async function chooseInput(deviceId: string) {
    writeStoredInput(optionsRef.current.rememberInput, deviceId)
    const input = inputs.find((item) => item.deviceId === deviceId) ?? null
    if (status === "recording" || status === "paused") {
      await cancel()
      await begin(deviceId)
      return { restarted: true, input }
    }
    if (input) setActiveInput(input)
    return { restarted: false, input }
  }

  return {
    status,
    problem,
    clearProblem: useCallback(() => setProblem(null), []),
    /** The live microphone stream while a take is running. */
    stream,
    /** Analyser on the live stream, for drawing a waveform. */
    analyser,
    /** The smoothed level, 0–1. Read it per frame; it is not state. */
    getLevel: useCallback(() => levelRef.current, []),
    elapsedMs,
    /** No signal at all for `quietAfterMs` into the take. */
    quiet,
    inputs,
    activeInput,
    start,
    stop,
    pause,
    resume,
    cancel,
    chooseInput,
  }
}

export type VoiceRecorder = ReturnType<typeof useVoiceRecorder>

function errorName(error: unknown) {
  return error instanceof DOMException || error instanceof Error
    ? error.name
    : ""
}

export function canRecord() {
  return (
    typeof navigator !== "undefined" &&
    typeof navigator.mediaDevices?.getUserMedia === "function" &&
    typeof MediaRecorder !== "undefined"
  )
}

function readStoredInput(key: string | false) {
  if (!key) return null
  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function writeStoredInput(key: string | false, deviceId: string | null) {
  if (!key) return
  try {
    if (deviceId) window.localStorage.setItem(key, deviceId)
    else window.localStorage.removeItem(key)
  } catch {
    // Private mode: the choice just lasts for this take.
  }
}
