"use client"

import { CaretDownIcon, MusicNoteSimpleIcon } from "@phosphor-icons/react"
import type { SoundName } from "cuelume"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { STEP_SOUNDS } from "./sound"

/**
 * The step sound: what every step without a cue of its own plays — mostly a
 * new line of text arriving. Picking one plays it.
 */
export function StepSoundPicker({
  value,
  onChange,
}: {
  value: SoundName | "none"
  onChange: (value: SoundName | "none") => void
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        data-step-sound-picker=""
        className="mr-1 flex h-8 items-center gap-1.5 rounded-full px-2.5 text-xs text-muted-foreground transition-colors outline-none hover:text-foreground focus-visible:ring-3 focus-visible:ring-ring/30 data-popup-open:text-foreground"
        title="The sound for steps without one of their own"
      >
        <MusicNoteSimpleIcon className="size-3.5" />
        Step sound
        <span className="text-foreground capitalize">{value}</span>
        <CaretDownIcon className="size-3" />
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-60">
        <DropdownMenuRadioGroup
          value={value}
          onValueChange={(next) => onChange(next as SoundName | "none")}
        >
          <DropdownMenuLabel className="text-xs leading-relaxed text-muted-foreground">
            Plays on every step that has no cue of its own.
          </DropdownMenuLabel>
          <DropdownMenuSeparator />
          {STEP_SOUNDS.map((sound) => (
            <DropdownMenuRadioItem
              key={sound.name}
              value={sound.name}
              closeOnClick={false}
              className="text-sm"
            >
              <span className="capitalize">{sound.name}</span>
              <span className="ml-auto pl-3 text-xs text-muted-foreground">
                {sound.hint}
              </span>
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          <DropdownMenuRadioItem value="none" className="text-sm">
            None
          </DropdownMenuRadioItem>
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
