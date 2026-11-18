"use client"

import { useSyncExternalStore } from "react"
import { SpeakerHighIcon, SpeakerSlashIcon } from "@phosphor-icons/react"

import { setSoundOn, soundOn, subscribeSound } from "@/lib/sounds"
import { cn } from "@/lib/utils"

/**
 * The Sound toggle Cuelume's guide asks for: one quiet line in the sidebar
 * footer. The server and first paint say "on"; hydration swaps in the
 * visitor's real setting, which starts off for prefers-reduced-motion.
 *
 * It carries no cue attribute of its own: turning sound on plays `toggle`
 * once audio is unlocked, and turning it off is silent by definition.
 */
export function SoundToggle({ className }: { className?: string }) {
  const on = useSyncExternalStore(subscribeSound, soundOn, () => true)
  const Icon = on ? SpeakerHighIcon : SpeakerSlashIcon

  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={() => void setSoundOn(!on)}
      className={cn(
        "inline-flex w-fit items-center gap-2 rounded-sm text-sm text-muted-foreground transition-colors duration-150 ease-out outline-none hover:text-foreground focus-visible:ring-2 focus-visible:ring-ring/50 motion-reduce:transition-none",
        className
      )}
    >
      <Icon className="size-4" />
      {on ? "Sound on" : "Sound off"}
    </button>
  )
}
