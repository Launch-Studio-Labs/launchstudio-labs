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
 * theme, quiet and subtle. Every step forward plays one cue: the step's own
 * when it does something, or the step sound picked in the editor. Back and
 * jumps are silent. On by default (audio starts on the first key, a user
 * gesture); the editor's speaker mutes it, remembered on this machine.
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
    return window.localStorage.getItem(STORAGE_KEY) !== "off"
  } catch {
    return true
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

/** Cuelume's cues, for the step sound picker, in the order they read best. */
export const STEP_SOUNDS: { name: SoundName; hint: string }[] = [
  { name: "tap", hint: "a small glassy tap" },
  { name: "type", hint: "one keystroke" },
  { name: "select", hint: "a soft pick" },
  { name: "navigate", hint: "a short move" },
  { name: "toggle", hint: "a switch" },
  { name: "open", hint: "something opening" },
  { name: "close", hint: "something closing" },
  { name: "ready", hint: "a warm note" },
  { name: "success", hint: "it worked" },
  { name: "count", hint: "a number rolling" },
  { name: "loading", hint: "a waiting pulse" },
  { name: "attention", hint: "a high bell" },
  { name: "warning", hint: "careful" },
  { name: "error", hint: "it didn't work" },
]

/** Plays a step's cue, quietly. Only call it when sound is on. */
export function stepCue(name: SoundName) {
  setup()
  play(name, { emphasis: "subtle" })
}
