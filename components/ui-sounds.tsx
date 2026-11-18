"use client"

import { useEffect } from "react"
import { bind, setEnabled, setTheme, setVolume } from "cuelume"

import {
  SOUND_THEME,
  SOUND_VOLUME,
  soundOn,
  subscribeSound,
} from "@/lib/sounds"

/**
 * Mounted once in the root layout. Sets the theme and volume, wires every
 * `data-cuelume-*` element (delegated, so later renders are covered), and
 * keeps Cuelume's on/off in step with the Sound toggle, which follows
 * prefers-reduced-motion until a visitor chooses (see lib/sounds.ts).
 */
export function UiSounds() {
  useEffect(() => {
    setTheme(SOUND_THEME)
    setVolume(SOUND_VOLUME)
    const sync = () => setEnabled(soundOn())
    sync()
    const unsubscribe = subscribeSound(sync)
    const unbind = bind()
    return () => {
      unsubscribe()
      unbind()
    }
  }, [])

  return null
}
