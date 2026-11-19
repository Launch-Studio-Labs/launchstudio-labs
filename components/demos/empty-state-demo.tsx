"use client"

import { useState, type ComponentProps } from "react"

import { DemoFrame } from "@/components/demos/demo-frame"
import { EmptyStatePanel } from "@/components/empty-states/empty-state-panel"
import {
  EMPTY_STATE_TYPES,
  EMPTY_STATES,
  type EmptyStateType,
} from "@/components/empty-states/states"
import {
  EMPTY_STATE_STYLES,
  type EmptyStateStyleId,
} from "@/components/empty-states/styles"
import { focusStyle } from "@/components/empty-states/tuning"
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group"
import { cn } from "@/lib/utils"

function Picker<T extends string>({
  label,
  value,
  options,
  onChange,
}: {
  label: string
  value: T
  options: readonly { value: T; label: string }[]
  onChange: (value: T) => void
}) {
  return (
    <div className="flex items-start gap-3">
      {/* h-8 matches the toggles, so the label sits on their line. */}
      <span className="flex h-8 w-11 shrink-0 items-center text-sm text-muted-foreground">
        {label}
      </span>
      <ToggleGroup
        aria-label={label}
        size="sm"
        spacing={1}
        value={[value]}
        // Pressing the selected item again would empty the group; keep it.
        onValueChange={(next: unknown[]) => {
          if (next.length > 0) onChange(next[0] as T)
        }}
        className="flex-wrap"
      >
        {options.map((option) => (
          <ToggleGroupItem key={option.value} value={option.value}>
            {option.label}
          </ToggleGroupItem>
        ))}
      </ToggleGroup>
    </div>
  )
}

const STYLE_OPTIONS = EMPTY_STATE_STYLES.map((style) => ({
  value: style.id,
  label: style.name,
}))

const STATE_OPTIONS = EMPTY_STATE_TYPES.map((type) => ({
  value: type,
  label: EMPTY_STATES[type].name,
}))

/**
 * One empty state at full size, with the style and the state to choose.
 * Changing the state morphs the art in place rather than swapping it, which
 * is the thing to judge each direction on: how it gets from one state to the
 * next.
 */
export function EmptyStateDemo({ className, ...props }: ComponentProps<"div">) {
  const [styleId, setStyleId] = useState<EmptyStateStyleId>("field")
  const [state, setState] = useState<EmptyStateType>("working")

  return (
    <div
      className={cn("flex w-content max-w-full flex-col gap-6", className)}
      {...props}
    >
      <div className="flex flex-col gap-3">
        <Picker
          label="Style"
          value={styleId}
          options={STYLE_OPTIONS}
          onChange={(id) => {
            setStyleId(id)
            // Points the dev dials at the style on show.
            focusStyle(id)
          }}
        />
        <Picker
          label="State"
          value={state}
          options={STATE_OPTIONS}
          onChange={setState}
        />
      </div>

      {/* Forced: tailwind-merge can't tell `min-w-content` is a width, so a
          plain min-w-0 would lose to it and the frame would overflow a phone. */}
      <DemoFrame className="w-full min-w-0!">
        <EmptyStatePanel
          state={state}
          styleId={styleId}
          className="rounded-lg border border-solid border-border bg-background"
        />
      </DemoFrame>
    </div>
  )
}
