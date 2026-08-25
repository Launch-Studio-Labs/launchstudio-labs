"use client"

import {
  useRef,
  useState,
  type ComponentProps,
  type CSSProperties,
} from "react"
import { CheckCircleIcon, XCircleIcon } from "@phosphor-icons/react"

import { DemoFrame } from "@/components/demos/demo-frame"
import {
  PANEL_FONT_SIZE,
  SAMPLE_TEXT,
  clamp,
  useElementHeight,
  useElementWidth,
  useSampleCharWidth,
} from "@/components/demos/measuring"
import { Slider } from "@/components/ui/slider"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

/**
 * The rules, in characters per line — what the guidance actually means. Each
 * column also reports the same width in CSS `ch`, which is the width of a
 * zero and so runs about 25% wider: that is why `max-width: 66ch` does not
 * give you 66 characters.
 */
const MIN_MEASURE = 45
const MAX_MEASURE = 75

/** Leading is a pair with measure: the wider the line, the more room it wants. */
const MIN_LEADING = 1.4
const MAX_LEADING = 1.6

/** What a column that ignores the rules does: one fixed, cramped line height. */
const NEGLECTED_LEADING = 1.15

/** Rounds the top of the first band and the bottom of the last. */
const GUIDE_RADIUS = 4

/**
 * How far the bands run past the text on each side — 8px wider overall.
 * Applied as content-box padding so the line still breaks at the measured
 * width — padding the border box would narrow the column and change every
 * count on the page.
 */
const GUIDE_BLEED = 4

const GUIDE_COLORS = {
  applied: "var(--color-in-range)",
  neglected: "var(--color-red-500)",
}

/** Narrow end of the slider: a column too cramped to read comfortably. */
const MIN_TEXT_WIDTH = 240

/** The text may run wider than the layout column, but not past this. */
const MAX_TEXT_WIDTH = 1024

/** The lane the prose reads at, and the width the box opens at. */
const LAYOUT_WIDTH = 576

/**
 * Everything the widest column carries around its text: the guide bleed, then
 * the panel's padding and border, then the box's. Taken off the room available
 * so the box grows to the page's edge rather than through it.
 */
const COLUMN_CHROME = GUIDE_BLEED * 2 + (16 * 2 + 2) + (16 * 2 + 2)

/**
 * The demo opens with the box on the page's measure, so the column inside it
 * starts at whatever the box has left to give. Drag past that and the box is
 * the thing that grows.
 */
const DEFAULT_TEXT_WIDTH = LAYOUT_WIDTH - COLUMN_CHROME

function leadingFor(measure: number) {
  const t = (measure - MIN_MEASURE) / (MAX_MEASURE - MIN_MEASURE)
  return clamp(
    MIN_LEADING + t * (MAX_LEADING - MIN_LEADING),
    MIN_LEADING,
    MAX_LEADING
  )
}

/**
 * One band per line, exactly the height of its line box and touching the next
 * — the same way the lines of text themselves touch. Alternating opacity is
 * what separates one row from the next, so nothing is added to the spacing.
 */
function guideBackground(leading: number, color: string) {
  const lineHeight = PANEL_FONT_SIZE * leading
  const odd = `color-mix(in oklab, ${color} 24%, transparent)`
  const even = `color-mix(in oklab, ${color} 12%, transparent)`
  return `repeating-linear-gradient(to bottom, ${odd} 0 ${lineHeight}px, ${even} ${lineHeight}px ${lineHeight * 2}px)`
}

/**
 * The passage, set to a given width.
 *
 * The floor is what is eased, not the height. A box is never shorter than the
 * text in it, so a line gained appears at once and in full — the box has
 * already grown past the floor to hold it. A line lost leaves the floor where
 * it was, and the box closes down onto the shorter text. Easing the height
 * itself would mean hiding the new line until the box caught up, which is the
 * one thing a column of text must not do.
 */
function SampleColumn({
  width,
  leading,
  guideColor,
  showGuides,
}: {
  width: number
  leading: number
  guideColor: string
  showGuides: boolean
}) {
  const textRef = useRef<HTMLSpanElement>(null)
  const textHeight = useElementHeight(textRef)

  return (
    <p
      style={{
        width,
        minHeight: textHeight || undefined,
        boxSizing: "content-box",
        paddingInline: GUIDE_BLEED,
        fontSize: PANEL_FONT_SIZE,
        lineHeight: leading,
        backgroundImage: showGuides
          ? guideBackground(leading, guideColor)
          : undefined,
        borderRadius: showGuides ? GUIDE_RADIUS : undefined,
      }}
      className="transition-[min-height] duration-200 ease-settle motion-reduce:transition-none"
    >
      <span ref={textRef} className="block">
        {SAMPLE_TEXT}
      </span>
    </p>
  )
}

function Panel({
  applied,
  measure,
  leading,
  children,
}: {
  applied: boolean
  measure: number
  leading: number
  children: React.ReactNode
}) {
  return (
    <div className="flex w-fit flex-col items-start gap-3 rounded-lg border border-border bg-background p-4">
      <div className="flex w-full items-center gap-2 border-b border-black/10 pb-3">
        {/* size-4 pairs with text-sm: the icon matches the cap height. */}
        {applied ? (
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
        <span className="text-sm text-muted-foreground tabular-nums">
          {measure} chars, {leading.toFixed(2)} leading
        </span>
      </div>
      {children}
    </div>
  )
}

/**
 * The same paragraph twice: the second column takes whatever width the slider
 * gives it, the first holds its line between 45 and 75 characters and lets the
 * leading grow with it.
 *
 * The slider and the columns travel together as one block, and the demo takes
 * its own measurements, so it renders the same on the docs page as it does
 * alone on the playground canvas.
 */
export function MeasureDemo({ className, ...props }: ComponentProps<"div">) {
  // The slider works in pixels of text width, so the default is a width
  // rather than a position and the readouts need no conversion.
  const [requestedWidth, setRequestedWidth] = useState(DEFAULT_TEXT_WIDTH)
  const [showGuides, setShowGuides] = useState(false)
  const frameRef = useRef<HTMLDivElement>(null)

  const available = useElementWidth(frameRef)
  const { charWidth, ruler } = useSampleCharWidth()

  // Keep max above min even before the first measurement lands.
  const maxText = Math.max(
    Math.min(available - COLUMN_CHROME, MAX_TEXT_WIDTH),
    MIN_TEXT_WIDTH + 1
  )
  const minText = Math.min(MIN_TEXT_WIDTH, maxText)
  const textWidth = clamp(requestedWidth, minText, maxText)

  const neglectedMeasure = Math.round(textWidth / charWidth)

  // The best-practice column holds the whole rule, not just its upper half:
  // it refuses to run past 75 characters and refuses to fall under 45.
  const targetWidth = MAX_MEASURE * charWidth
  const appliedWidth = clamp(textWidth, MIN_MEASURE * charWidth, targetWidth)
  const appliedMeasure = Math.round(appliedWidth / charWidth)
  const inRange =
    neglectedMeasure >= MIN_MEASURE && neglectedMeasure <= MAX_MEASURE

  // The green zone on the track is the 45-75 band itself, so it agrees with
  // the number's colour: green shows where a good measure lives, and the
  // number is green exactly when the thumb sits inside it.
  const trackPosition = (value: number) =>
    maxText > minText
      ? clamp(((value - minText) / (maxText - minText)) * 100, 0, 100)
      : 0
  const bandStart = trackPosition(MIN_MEASURE * charWidth)
  const bandEnd = trackPosition(MAX_MEASURE * charWidth)

  return (
    // The columns may run wider than the page's measure; the text is the
    // point. The controls hold the measure themselves so they stay on the
    // lane the prose reads at.
    <div
      ref={frameRef}
      className={cn("flex w-full flex-col items-center gap-6", className)}
      {...props}
    >
      {/* h-8 gives the thumb's label its own room; the track centres in it
          rather than overflowing a row sized by the switch beside it. */}
      <div className="flex h-8 w-content max-w-full items-center gap-4">
        <Slider
          aria-label="Text width"
          min={minText}
          max={maxText}
          value={[textWidth]}
          onValueChange={(value) =>
            setRequestedWidth(Array.isArray(value) ? value[0] : value)
          }
          step={1}
          thumbAlignment="center"
          style={
            {
              "--slider-band": `linear-gradient(to right, transparent 0 ${bandStart}%, var(--color-in-range) ${bandStart}% ${bandEnd}%, transparent ${bandEnd}% 100%)`,
            } as CSSProperties
          }
          /* The thumb is centred on its value, so the track stops half a
             thumb short of the controls beside it — the left edge stays
             flush. */
          className="flex-1 pr-8 [&_[data-slot=slider-range]]:bg-transparent [&_[data-slot=slider-track]]:bg-(image:--slider-band)"
          thumbLabel={
            <span
              className={cn(
                "text-[10px] font-medium tracking-wide uppercase tabular-nums transition-colors",
                inRange ? "text-in-range" : "text-muted-foreground"
              )}
            >
              {Math.round(textWidth)}px
            </span>
          }
        />

        <label className="flex shrink-0 cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none">
          <Switch
            size="sm"
            checked={showGuides}
            onCheckedChange={setShowGuides}
          />
          Guides
        </label>
      </div>

      <DemoFrame>
        <Panel
          applied
          measure={appliedMeasure}
          leading={leadingFor(appliedMeasure)}
        >
          <SampleColumn
            width={appliedWidth}
            leading={leadingFor(appliedMeasure)}
            guideColor={GUIDE_COLORS.applied}
            showGuides={showGuides}
          />
        </Panel>

        <Panel
          applied={false}
          measure={neglectedMeasure}
          leading={NEGLECTED_LEADING}
        >
          <SampleColumn
            width={textWidth}
            leading={NEGLECTED_LEADING}
            guideColor={GUIDE_COLORS.neglected}
            showGuides={showGuides}
          />
        </Panel>
      </DemoFrame>

      {ruler}
    </div>
  )
}
