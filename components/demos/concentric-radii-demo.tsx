"use client"

import { useState, type ComponentProps } from "react"
import {
  CheckCircleIcon,
  MicrophoneIcon,
  XCircleIcon,
} from "@phosphor-icons/react"

import { DemoFrame } from "@/components/demos/demo-frame"
import { clamp } from "@/components/demos/measuring"
import { Slider } from "@/components/ui/slider"
import { cn } from "@/lib/utils"
import {
  naiveConcentricRadius,
  visualConcentricRadius,
} from "@/lib/visual-concentric-radius"

/**
 * Opens on the case that started this: a field at the Labs radius (7.2px) with
 * a 28px mic button inset by 4px. The textbook rule leaves that button at
 * 3.2px, which reads as nearly square. Drag padding to 8 for the textarea,
 * which is already past the outer radius.
 */
const DEFAULT_OUTER = 7.2
const DEFAULT_PADDING = 4
/** The mic button's size. Fixed: only the radius and the padding move. */
const SIZE = 28

const OUTER_RANGE = { min: 0, max: 32, step: 0.1 }
/** Runs past the outer radius, so the cutoff can be seen. */
const PADDING_RANGE = { min: 0, max: 32, step: 1 }

/** The field's width before it is magnified. */
const SPECIMEN_WIDTH = 216

/**
 * The loupe's height, how far in from its top-right the corner sits, and the
 * height the zoom fits the corner into.
 */
const LOUPE_HEIGHT = 129
const LOUPE_INSET = 12
const LOUPE_VIEW = 84

/** The panel's padding. The loupe runs out through it to the panel's left edge. */
const PANEL_PADDING = 16

/** What a pill resolves to in CSS — larger than any box it is set on. */
const PILL = 9999

/** Placeholder sits where an input's text would, whatever the padding. */
const TEXT_INSET = 12

function formatRadius(radius: number) {
  return radius >= PILL ? "full" : `${Number(radius.toFixed(1))}px`
}

function sliderValue(value: number | readonly number[]) {
  return Array.isArray(value) ? value[0] : (value as number)
}

/**
 * A field with a button in it, the shape the rule is about. The button is a
 * real control's proportions — icon at half its size — so a large size reads
 * as a tile rather than a stretched button.
 */
function Field({
  outer,
  padding,
  size,
  inner,
}: {
  outer: number
  padding: number
  size: number
  inner: number
}) {
  const icon = clamp(Math.round(size * 0.5), 10, 32)

  return (
    <div
      style={{ width: SPECIMEN_WIDTH, borderRadius: outer, padding }}
      className="flex items-center border border-input bg-background"
    >
      <span
        style={{ paddingLeft: Math.max(0, TEXT_INSET - padding) }}
        className="min-w-0 flex-1 truncate pr-2 text-sm text-muted-foreground"
      >
        Ask anything
      </span>
      <span
        style={{ width: size, height: size, borderRadius: inner }}
        className="flex shrink-0 items-center justify-center bg-primary text-primary-foreground"
      >
        <MicrophoneIcon weight="fill" style={{ width: icon, height: icon }} />
      </span>
    </div>
  )
}

/**
 * The field's top-right corner, magnified. A 2px difference in radius is hard
 * to call at 1×; up close you can see whether the button's corner bends with
 * the field's or sits square inside it. The zoom follows the specimen so the
 * corner and the button fill the loupe whatever the sliders say.
 *
 * No backing of its own: just the magnified field, cropped. The crop runs out
 * through the panel's padding to its left edge and across to the right edge
 * of the panel's content.
 */
function Loupe(props: ComponentProps<typeof Field>) {
  const region = props.padding + Math.min(props.size, 24) * 0.75 + 4
  const zoom = clamp(Math.floor(LOUPE_VIEW / region), 2, 6)

  return (
    <div
      aria-hidden
      style={{ height: LOUPE_HEIGHT, marginLeft: -PANEL_PADDING }}
      className="relative mt-auto shrink-0 overflow-hidden rounded-bl-[calc(var(--radius-lg)-1px)]"
    >
      <div
        style={{
          top: LOUPE_INSET,
          right: LOUPE_INSET,
          transform: `scale(${zoom})`,
          transformOrigin: "top right",
        }}
        className="absolute"
      >
        <Field {...props} />
      </div>
    </div>
  )
}

function Panel({
  label,
  good,
  note,
  inner,
  ...field
}: {
  label: string
  good: boolean
  /** Why this panel's number is what it is, when that isn't obvious. */
  note?: string
} & ComponentProps<typeof Field>) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-3 self-stretch rounded-lg border border-border bg-background p-4">
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          {/* size-4 pairs with text-sm: the icon matches the cap height. */}
          {good ? (
            <CheckCircleIcon
              weight="fill"
              className="size-4 shrink-0 text-in-range"
            />
          ) : (
            <XCircleIcon
              weight="fill"
              className="size-4 shrink-0 text-muted-foreground"
            />
          )}
          <span className="text-sm font-medium">{label}</span>
          <span className="ml-auto text-sm text-muted-foreground tabular-nums">
            inner {formatRadius(inner)}
          </span>
        </div>
        {note && (
          <p className="text-xs text-pretty text-muted-foreground">{note}</p>
        )}
      </div>
      <Loupe inner={inner} {...field} />
    </div>
  )
}

function ControlRow({
  label,
  value,
  range,
  disabled,
  onChange,
  children,
}: {
  label: string
  value: number
  range: { min: number; max: number; step: number }
  disabled?: boolean
  onChange: (value: number) => void
  children?: React.ReactNode
}) {
  return (
    <>
      <span
        className={cn(
          "text-sm text-muted-foreground",
          disabled && "opacity-50"
        )}
      >
        {label}
      </span>
      <Slider
        aria-label={label}
        {...range}
        value={[value]}
        disabled={disabled}
        onValueChange={(next) => onChange(sliderValue(next))}
        thumbLabel={
          <span className="text-[10px] font-medium tracking-wide uppercase tabular-nums">
            {disabled ? "full" : `${Number(value.toFixed(1))}px`}
          </span>
        }
      />
      {/* Every row fills the third column, so the tracks end together. */}
      <div className="flex justify-end">{children}</div>
    </>
  )
}

/**
 * The same field twice, one inner radius from the textbook rule and one from
 * `visualConcentricRadius`. Everything else — the field, the padding, the
 * button — is shared, so the corner is the only thing that differs.
 */
export function ConcentricRadiiDemo({
  className,
  ...props
}: ComponentProps<"div">) {
  const [outer, setOuter] = useState(DEFAULT_OUTER)
  const [padding, setPadding] = useState(DEFAULT_PADDING)
  const size = SIZE

  const naive = naiveConcentricRadius(outer, padding)
  // Without an `own` radius the helper falls back to the floor once the
  // padding passes the outer radius; the panel says so.
  const visual = visualConcentricRadius({ outer, padding, size })
  const unpaired = padding > outer

  // Both report what is drawn: a radius past half the button is a circle.
  const naiveShown = Math.min(naive, size / 2)
  const visualShown = Math.min(visual, size / 2)
  const field = { outer, padding, size }

  return (
    <div
      className={cn("flex w-content max-w-full flex-col gap-6", className)}
      {...props}
    >
      <DemoFrame className="max-sm:w-full max-sm:min-w-0">
        <div className="flex flex-col gap-4 self-stretch sm:flex-row sm:items-center sm:justify-between">
          <Panel
            label="Naive"
            good={naiveShown >= visualShown - 0.05}
            inner={naiveShown}
            {...field}
          />
          <Panel
            label="Visual"
            good
            note={
              unpaired
                ? "Too far from the edge to pair, so it keeps its own radius."
                : undefined
            }
            inner={visualShown}
            {...field}
          />
        </div>
      </DemoFrame>

      <div className="grid auto-rows-8 grid-cols-[4.5rem_1fr_auto] items-center gap-x-4 gap-y-2">
        <ControlRow
          label="Outer"
          value={outer}
          range={OUTER_RANGE}
          onChange={setOuter}
        />
        <ControlRow
          label="Padding"
          value={padding}
          range={PADDING_RANGE}
          onChange={setPadding}
        />
      </div>
    </div>
  )
}
