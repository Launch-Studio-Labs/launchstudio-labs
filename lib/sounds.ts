import {
  play,
  setEnabled,
  unlock,
  type PlayOptions,
  type SoundName,
} from "cuelume"

/**
 * Interface sounds, by Cuelume (https://cuelume.dev/agents.md), set up the
 * way the studio site sets them up: the "mech" theme, kept quiet.
 *
 * Most cues are declarative: `data-cuelume-*` attributes on the control, wired
 * once by `bind()` in components/ui-sounds.tsx. `cue()` is for outcomes an
 * attribute cannot express, like a copy that actually landed.
 *
 * Cuelume is safe to import on the server and builds its AudioContext lazily
 * on the first cue, which only ever follows a user gesture, so nothing sounds
 * on load. Invalid names and blocked audio are silent no-ops.
 */
export const SOUND_THEME = "mech" as const

/** Global level, kept low so cues sit under the interface, not on top. */
export const SOUND_VOLUME = 0.4

export function cue(name: SoundName, options?: PlayOptions) {
  play(name, options)
}

/*
 * The Sound toggle. Cuelume stores nothing, so the app owns the setting: an
 * explicit choice lives in localStorage; with no choice, sound follows
 * prefers-reduced-motion, off when reduced, and keeps following it live.
 */
const STORAGE_KEY = "labs-sound"
const REDUCED = "(prefers-reduced-motion: reduce)"
const listeners = new Set<() => void>()

function storedChoice(): boolean | null {
  try {
    const value = window.localStorage.getItem(STORAGE_KEY)
    return value === "on" ? true : value === "off" ? false : null
  } catch {
    return null
  }
}

/** Whether sound is on right now. Client only. */
export function soundOn(): boolean {
  return storedChoice() ?? !window.matchMedia(REDUCED).matches
}

/**
 * For useSyncExternalStore: fires on a toggle, on a toggle in another tab,
 * and when the reduced-motion preference changes.
 */
export function subscribeSound(onChange: () => void) {
  listeners.add(onChange)
  const reduce = window.matchMedia(REDUCED)
  reduce.addEventListener("change", onChange)
  window.addEventListener("storage", onChange)
  return () => {
    listeners.delete(onChange)
    reduce.removeEventListener("change", onChange)
    window.removeEventListener("storage", onChange)
  }
}

/**
 * Turn sound on or off from the toggle's click. Turning it on unlocks audio
 * in that same gesture and trusts `unlock()` over the toggle: if the browser
 * cannot play, the setting falls back to off.
 */
export async function setSoundOn(on: boolean) {
  try {
    window.localStorage.setItem(STORAGE_KEY, on ? "on" : "off")
  } catch {
    // Private mode and the like: the choice holds for this page only.
  }
  setEnabled(on)
  listeners.forEach((listener) => listener())
  if (!on) return
  if (await unlock()) {
    play("toggle", { direction: "forward" })
  } else {
    await setSoundOn(false)
  }
}
