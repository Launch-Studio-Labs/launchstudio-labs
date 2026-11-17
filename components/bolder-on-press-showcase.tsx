"use client"

import { useState } from "react"
import { CheckIcon, CopyIcon } from "@phosphor-icons/react"

import { BolderOnPressDemo } from "@/components/demos/bolder-on-press-demo"
import { PageHeader } from "@/components/page-header"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

/**
 * The treatment, in the form you paste into a stylesheet. The demo above is
 * this same stack: a fixed resting label, a heavier copy clipped to the cell,
 * and a press that only eases opacity and scale.
 */
const SNIPPET = `<button type="button" class="press" data-pressed="false">
  <span class="press-label">
    <span>Continue</span>
    <span class="press-face" aria-hidden="true">Continue</span>
  </span>
</button>

.press {
  font-weight: 400;
  touch-action: manipulation;
  -webkit-tap-highlight-color: transparent;
}

.press-label {
  display: inline-grid;
  place-items: center;
  white-space: nowrap;
}

.press-label > span {
  grid-area: 1 / 1;
}

.press-label > span:first-child {
  transition: opacity 200ms ease-out;
}

/* The heavier copy is already in the cell, so the press changes ink
   and not width. The resting face eases out, leaving one drawing. */
.press-face {
  font-weight: 650;
  clip-path: inset(0);
  opacity: 0;
  scale: 0.98;
  pointer-events: none;
  transition-property: opacity, scale;
  transition-duration: 200ms;
  transition-timing-function: ease-out;
}

.press:is(:active, [data-pressed="true"]) .press-label > span:first-child {
  opacity: 0;
}

.press:is(:active, [data-pressed="true"]) .press-face {
  opacity: 1;
  scale: 1;
}

@media (prefers-reduced-motion: reduce) {
  .press-label > span:first-child,
  .press-face {
    transition: none;
  }
}`

function CopyButtonIcon({ copied }: { copied: boolean }) {
  return (
    <span className="relative size-4 shrink-0">
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
          copied
            ? "scale-[0.25] opacity-0 blur-[4px]"
            : "blur-0 scale-100 opacity-100"
        )}
      >
        <CopyIcon className="size-4" />
      </span>
      <span
        className={cn(
          "absolute inset-0 flex items-center justify-center transition-[opacity,scale,filter] duration-300 ease-[cubic-bezier(0.2,0,0,1)]",
          copied
            ? "blur-0 scale-100 opacity-100"
            : "scale-[0.25] opacity-0 blur-[4px]"
        )}
      >
        <CheckIcon className="size-4" />
      </span>
    </span>
  )
}

export function BolderOnPressShowcase() {
  const [copied, setCopied] = useState(false)

  function copySnippet() {
    void navigator.clipboard.writeText(SNIPPET)
    setCopied(true)
    window.setTimeout(() => setCopied(false), 1600)
  }

  return (
    <>
      <PageHeader href="/bolder-on-press" />

      <div className="labs-enter labs-enter-delay-2 flex flex-col gap-[1lh] text-sm leading-normal text-body">
        <p>
          A label that thickens while it is held feels like the press landed.
          Animating the label&apos;s own{" "}
          <strong className="font-medium text-foreground">font-weight</strong>{" "}
          widens the glyphs, so the control reflows under the pointer. On a
          static font the weight also jumps between the files that were loaded.
        </p>
        <p>
          The resting label keeps its weight and holds the layout. A second copy
          of the same words sits in the same grid cell, drawn at{" "}
          <strong className="font-medium text-foreground">650</strong>, and{" "}
          <strong className="font-medium text-foreground">
            clip-path: inset(0)
          </strong>{" "}
          keeps that heavier ink inside the cell. While the control is pressed,
          the copy eases in with opacity and a small scale, and the resting face
          eases out, so the held word is one drawing.{" "}
          <strong className="font-medium text-foreground">
            font-weight: 650
          </strong>{" "}
          is what sets the axis: on a variable font it maps to{" "}
          <code className="font-mono text-xs">wght</code>, and on a static face
          it still resolves to a real weight.{" "}
          <code className="font-mono text-xs">
            font-variation-settings: &quot;wght&quot; 650
          </code>{" "}
          sets the same axis only when the face actually has one.
        </p>
        <p>
          Geist, the face this site is set in, carries{" "}
          <code className="font-mono text-xs">wght</code> from 100 to 900, so
          650 is a real intermediate weight.{" "}
          <strong className="font-medium text-foreground">:active</strong> is
          the press: a click, a key held on the button, and a finger on the
          glass. Inside a scrolling page Safari can release that highlight as
          soon as the gesture might scroll.{" "}
          <code className="font-mono text-xs">touch-action: manipulation</code>{" "}
          keeps the tap immediate, and the demo mirrors{" "}
          <code className="font-mono text-xs">:active</code> with pointer events
          so the heavier face stays up for the whole press.
        </p>
      </div>

      <BolderOnPressDemo className="labs-enter labs-enter-delay-3" />

      <Separator className="labs-enter labs-enter-delay-3" />

      <Card className="labs-enter labs-enter-delay-3">
        <CardHeader>
          <CardTitle>The treatment</CardTitle>
          <CardDescription className="text-pretty">
            The base label is fixed. The heavier face is the only thing that
            moves.
          </CardDescription>
          <CardAction>
            <Button
              aria-label="Copy the treatment"
              size="lg"
              onClick={copySnippet}
            >
              <CopyButtonIcon copied={copied} />
              {copied ? "Copied" : "Copy"}
            </Button>
          </CardAction>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted p-5 font-mono text-xs leading-normal">
            <code>{SNIPPET}</code>
          </pre>
        </CardContent>
      </Card>
    </>
  )
}
