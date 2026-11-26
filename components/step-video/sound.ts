import {
  play,
  setEnabled,
  setTheme,
  setVolume,
  unlock,
  type SoundName,
} from "cuelume"

/**
 * Step cues, by Cuelume, set up the way the blueprint videos are: the "mech"
 * theme, quiet, and sparse — a step only sounds when the deck gives it a cue,
 * never on every key. Off by default; the editor's toggle turns it on, and
 * the choice is remembered on this machine.
 */
const STORAGE_KEY = "step-video-sound"
const VOLUME = 0.3

let ready = false

function setup() {
  if (ready) return
  setTheme("mech")
  setVolume(VOLUME)
  ready = true
}

export function soundStored(): boolean {
  try {
    return window.localStorage.getItem(STORAGE_KEY) === "on"
  } catch {
    return false
  }
}

export async function setSound(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off")
  } catch {
    // The choice holds for this page only.
  }
  setup()
  setEnabled(on)
  if (on) await unlock()
}

/** Plays a step's cue, quietly. Only call it when sound is on. */
export function stepCue(name: SoundName) {
  setup()
  play(name, { emphasis: "subtle" })
}
