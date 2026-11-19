/**
 * Voice Input — pure helpers for recording in the browser and handing the
 * audio to a transcription API. No DOM or framework imports, so they run in
 * a test runner or on the server (`audioExtension`, `isAcceptedAudio`).
 *
 * Part of the Launch Studio Labs Voice Input component.
 * https://labs.launchstudio.space/voice-input
 */

/**
 * Recorder formats in order of preference. Opus in WebM is what Chromium
 * records natively; Safari records AAC in MP4 (and WebM only from 18.4).
 * Every entry maps to an extension OpenAI's transcription endpoint accepts —
 * it infers the format from the filename.
 */
export const RECORDING_MIME_TYPES = [
  "audio/webm;codecs=opus",
  "audio/webm",
  "audio/mp4;codecs=mp4a.40.2",
  "audio/mp4",
  "audio/ogg;codecs=opus",
] as const

/** First supported recorder format, or "" to let the browser choose. */
export function pickRecordingMime(isSupported: (type: string) => boolean) {
  for (const type of RECORDING_MIME_TYPES) {
    try {
      if (isSupported(type)) return type
    } catch {
      // Some engines throw on unknown types instead of returning false.
    }
  }
  return ""
}

/** "audio/webm;codecs=opus" → "audio/webm". */
export function baseMime(type: string) {
  return type.split(";")[0].trim().toLowerCase()
}

/**
 * File extension for a recorded audio type. OpenAI reads the format from
 * the extension, so it has to describe the container the browser actually
 * produced.
 */
export function audioExtension(contentType: string) {
  const type = baseMime(contentType)
  if (type.includes("mp4") || type.includes("m4a") || type.includes("aac")) {
    return "m4a"
  }
  if (type.includes("mpeg") || type.includes("mp3")) return "mp3"
  if (type.includes("ogg")) return "ogg"
  if (type.includes("wav")) return "wav"
  if (type.includes("flac")) return "flac"
  return "webm"
}

export function isAcceptedAudio(contentType: string) {
  const type = baseMime(contentType)
  return (
    type.startsWith("audio/") || type === "video/webm" || type === "video/mp4"
  )
}

/**
 * Peak sample level (0–1) below which a whole take counts as silent: about
 * -60 dBFS. A working microphone in a quiet room never stays this low while
 * someone speaks; a muted, virtual or OS-blocked input delivers exact zeros.
 */
export const SILENCE_PEAK = 0.001

export function isSilentTake(peak: number | null) {
  return peak !== null && peak < SILENCE_PEAK
}

/** Peak absolute sample of a time-domain buffer (−1…1 floats). */
export function peakOf(samples: ArrayLike<number>) {
  let peak = 0
  for (let i = 0; i < samples.length; i++) {
    const value = Math.abs(samples[i])
    if (value > peak) peak = value
  }
  return peak
}

/** Root mean square of a time-domain buffer (−1…1 floats). */
export function rmsOf(samples: ArrayLike<number>) {
  if (samples.length === 0) return 0
  let sum = 0
  for (let i = 0; i < samples.length; i++) sum += samples[i] * samples[i]
  return Math.sqrt(sum / samples.length)
}

/**
 * Map RMS to a 0–1 meter value on a decibel scale: -60 dBFS reads empty,
 * -12 dBFS (a close, normal speaking voice) reads full.
 */
export function meterLevel(rms: number) {
  if (!(rms > 0)) return 0
  const db = 20 * Math.log10(rms)
  const level = (db + 60) / 48
  return level < 0 ? 0 : level > 1 ? 1 : level
}

export interface AudioInput {
  deviceId: string
  label: string
  /** Chromium's "default" entry, which follows the system input setting. */
  isDefault?: boolean
}

/**
 * The deviceId to ask getUserMedia for: the stored choice while that device
 * is still connected, otherwise null (use the browser's default).
 */
export function resolveInputDevice(
  inputs: readonly AudioInput[],
  storedId: string | null
) {
  if (!storedId) return null
  return inputs.some((input) => input.deviceId === storedId) ? storedId : null
}

/**
 * Display name for an input. Chromium prefixes the system default with
 * "Default - "; labels are empty until microphone permission is granted.
 */
export function inputLabel(label: string, index: number) {
  const clean = label.replace(/^default\s*-\s*/i, "").trim()
  return clean || `Microphone ${index + 1}`
}

/**
 * The audio inputs worth listing. Chromium adds a "default" entry that
 * follows the system input (kept, first, flagged) and a Windows-only
 * "communications" alias (dropped).
 */
export function listInputs(
  devices: readonly {
    kind: string
    deviceId: string
    label: string
  }[]
): AudioInput[] {
  const audio = devices.filter(
    (device) =>
      device.kind === "audioinput" &&
      device.deviceId &&
      device.deviceId !== "communications"
  )
  const ordered = [
    ...audio.filter((device) => device.deviceId === "default"),
    ...audio.filter((device) => device.deviceId !== "default"),
  ]
  return ordered.map((device, index) => ({
    deviceId: device.deviceId,
    label: inputLabel(device.label, index),
    ...(device.deviceId === "default" ? { isDefault: true } : {}),
  }))
}

/** "m:ss" for a recording clock. */
export function formatElapsed(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000))
  const minutes = Math.floor(total / 60)
  const seconds = total % 60
  return `${minutes}:${String(seconds).padStart(2, "0")}`
}

// ── Playback preview ──

/**
 * Per-bucket peaks (0–1) of a decoded recording, normalised to its loudest
 * moment so a quiet take still reads. Runs once per recording: an 8-minute
 * take at 24 kHz is ~11.5M samples, a single linear pass.
 */
export function computePeaks(
  channels: readonly ArrayLike<number>[],
  buckets: number
) {
  const length = channels[0]?.length ?? 0
  const count = Math.max(0, Math.floor(buckets))
  const peaks = new Array<number>(count).fill(0)
  if (!length || !count) return peaks
  for (let b = 0; b < count; b++) {
    const start = Math.floor((b * length) / count)
    const end = Math.max(start + 1, Math.floor(((b + 1) * length) / count))
    let peak = 0
    for (const channel of channels) {
      for (let i = start; i < end && i < length; i++) {
        const value = Math.abs(channel[i])
        if (value > peak) peak = value
      }
    }
    peaks[b] = peak
  }
  return normalizePeaks(peaks)
}

function normalizePeaks(peaks: number[]) {
  let max = 0
  for (const peak of peaks) if (peak > max) max = peak
  if (max <= 0) return peaks.map(() => 0)
  return peaks.map((peak) => Math.min(1, peak / max))
}

/**
 * Fit precomputed peaks to the number of bars that fit on screen, keeping
 * the loudest value in each group so short spikes don't vanish.
 */
export function resamplePeaks(peaks: readonly number[], count: number) {
  const bars = Math.max(0, Math.floor(count))
  if (!bars || !peaks.length) return new Array<number>(bars).fill(0)
  const out = new Array<number>(bars)
  for (let b = 0; b < bars; b++) {
    const start = Math.floor((b * peaks.length) / bars)
    const end = Math.max(start + 1, Math.floor(((b + 1) * peaks.length) / bars))
    let peak = 0
    for (let i = start; i < end && i < peaks.length; i++) {
      if (peaks[i] > peak) peak = peaks[i]
    }
    out[b] = peak
  }
  return out
}

/** Bar height as a fraction of the track: silence still shows as a dot. */
export function barHeight(peak: number, min = 0.12) {
  const value = Number.isFinite(peak) ? Math.min(1, Math.max(0, peak)) : 0
  return min + (1 - min) * value
}

/** Playback position (seconds) for a pointer at clientX over the track. */
export function seekFromPointer(
  clientX: number,
  left: number,
  width: number,
  duration: number
) {
  if (!(width > 0) || !(duration > 0)) return 0
  const fraction = Math.min(1, Math.max(0, (clientX - left) / width))
  return fraction * duration
}

/** Clamp a seek (seconds) into the recording. */
export function clampTime(time: number, duration: number) {
  if (!(duration > 0) || !Number.isFinite(time)) return 0
  return Math.min(duration, Math.max(0, time))
}

/** New position for a slider key, or null when the key isn't a seek key. */
export function seekForKey(
  key: string,
  current: number,
  duration: number,
  step = 5
) {
  switch (key) {
    case "ArrowRight":
    case "ArrowUp":
      return clampTime(current + step, duration)
    case "ArrowLeft":
    case "ArrowDown":
      return clampTime(current - step, duration)
    case "PageUp":
      return clampTime(current + Math.max(step, duration / 10), duration)
    case "PageDown":
      return clampTime(current - Math.max(step, duration / 10), duration)
    case "Home":
      return 0
    case "End":
      return clampTime(duration, duration)
    default:
      return null
  }
}

/** "0:12 / 1:04" — position and length of a recording, in seconds. */
export function formatPlayback(current: number, duration: number) {
  return `${formatElapsed(current * 1000)} / ${formatElapsed(duration * 1000)}`
}
