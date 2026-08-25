"use client"

import { useRef, useState, type ComponentProps } from "react"

import { DemoFrame } from "@/components/demos/demo-frame"
import {
  PANEL_FONT_SIZE,
  useElementHeight,
  useElementWidth,
  useSampleCharWidth,
} from "@/components/demos/measuring"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

const CARD_COPY = {
  title: "Perfect coffee gear",
  description:
    "There is always another piece of equipment. This scale responds fourteen milliseconds faster than the last one. None of it solves the real problem, which is that they drink the coffee too hot to taste. Next month, another grinder.",
  cta: "Read the guide",
}

/** Padding inside the card, so the good width can account for it. */
const CARD_PADDING = 24

/** Applying the width rule pulls the card back to a comfortable line. */
const CARD_APPLIED_WIDTH = 410

/** The card sets its body copy a step down from the samples above. */
const CARD_FONT_SIZE = 14

/**
 * Long enough to read the reflow as a change rather than a jump, short enough
 * to stay out of the way. Width and leading share it so flipping both reads
 * as one movement.
 */
const CARD_TRANSITION = "260ms"

/** Body copy set the way it usually ends up: cramped, and as wide as the box. */
const CARD_NEGLECTED_LEADING = 1.15
const CARD_APPLIED_LEADING = 1.5

function PracticeCard({
  width,
  leading,
}: {
  width: number | string
  leading: number
}) {
  const copyRef = useRef<HTMLSpanElement>(null)
  const copyHeight = useElementHeight(copyRef)

  return (
    <Card
      style={{ width, transitionDuration: CARD_TRANSITION }}
      /* Tailwind emits smooth-shadow-ring-xs after -sm, so the Card's own
             shadow wins on order alone; this has to be forced. */
      className="text-left smooth-shadow-ring-sm! transition-[width] ease-morph motion-reduce:transition-none"
    >
      <CardHeader>
        <CardTitle>{CARD_COPY.title}</CardTitle>
        {/* A floor under the copy, eased on the card's own curve: as the card
            narrows and the copy takes another line it appears at once and in
            full, and as the card widens again the card closes down onto the
            shorter copy rather than dropping to it. */}
        <CardDescription
          style={{
            fontSize: CARD_FONT_SIZE,
            lineHeight: leading,
            minHeight: copyHeight || undefined,
            transitionDuration: CARD_TRANSITION,
          }}
          className="transition-[line-height,min-height] ease-morph motion-reduce:transition-none"
        >
          <span ref={copyRef} className="block">
            {CARD_COPY.description}
          </span>
        </CardDescription>
      </CardHeader>
      <CardFooter>
        <Button>{CARD_COPY.cta}</Button>
      </CardFooter>
    </Card>
  )
}

/**
 * The two settings from the columns above, applied to a real component: a
 * card whose copy is either left to fill its box or held to a line the eye
 * can follow.
 *
 * The switches read the card below them, so the two travel together as one
 * block — and the block holds the measure itself, so the card fills the same
 * width on the playground canvas as it does in the page's content column.
 */
export function BodyCopyDemo({ className, ...props }: ComponentProps<"div">) {
  const [cardWidthRule, setCardWidthRule] = useState(false)
  const [cardLeading, setCardLeading] = useState(false)
  const cardAreaRef = useRef<HTMLDivElement>(null)

  // The card hugs its text, so the room available comes from the area around
  // it, not from the card itself — measuring the card would feed its width
  // back in.
  const cardAreaWidth = useElementWidth(cardAreaRef)
  const { charWidth, ruler } = useSampleCharWidth()

  // Off, the card just fills the column it sits in; the width rule pulls it
  // back to a comfortable line. The filled width is measured rather than
  // assumed, so the character count holds at any viewport.
  const cardWidth = cardWidthRule ? CARD_APPLIED_WIDTH : cardAreaWidth
  // Advance widths scale with font size, so the ruler measured at
  // PANEL_FONT_SIZE also gives the card's narrower copy.
  const cardCharacters = Math.round(
    Math.max(cardWidth - CARD_PADDING * 2, 0) /
      (charWidth * (CARD_FONT_SIZE / PANEL_FONT_SIZE))
  )

  return (
    <div
      className={cn("flex w-content max-w-full flex-col gap-6", className)}
      {...props}
    >
      <div className="flex items-center gap-6">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none">
          <Switch
            size="sm"
            checked={cardWidthRule}
            onCheckedChange={setCardWidthRule}
          />
          Fix width
        </label>
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none">
          <Switch
            size="sm"
            checked={cardLeading}
            onCheckedChange={setCardLeading}
          />
          Fix leading
        </label>
        <span className="ml-auto text-sm text-muted-foreground tabular-nums">
          {cardCharacters} chars,{" "}
          {(cardLeading
            ? CARD_APPLIED_LEADING
            : CARD_NEGLECTED_LEADING
          ).toFixed(2)}{" "}
          leading
        </span>
      </div>

      {/* The measured area is the frame's inside, so the character count is
          taken from the room the card actually has. */}
      <DemoFrame className="w-full">
        <div ref={cardAreaRef} className="flex w-full justify-center">
          <PracticeCard
            width={cardWidthRule ? CARD_APPLIED_WIDTH : "100%"}
            leading={
              cardLeading ? CARD_APPLIED_LEADING : CARD_NEGLECTED_LEADING
            }
          />
        </div>
      </DemoFrame>

      {ruler}
    </div>
  )
}
