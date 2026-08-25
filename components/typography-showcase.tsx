import { BodyCopyDemo } from "@/components/demos/body-copy-demo"
import { MeasureDemo } from "@/components/demos/measure-demo"
import { PageHeader } from "@/components/page-header"
import { Separator } from "@/components/ui/separator"
import { cn } from "@/lib/utils"

/**
 * The two settings, one run of copy each, in the order the demo takes them.
 * `**like this**` marks the phrase a reader skimming the page should catch;
 * keeping the marker inside the string leaves the copy legible as prose rather
 * than cutting every sentence into fragments of JSX.
 */
const LINE_HEIGHT_NOTES = [
  "**Line height** (leading in the old print terms) controls how tall a line box is. A larger line height can make the text easier to read, while going for numbers too large can make the lines feel disasociated from each other.",
  "For **body text** you usually want to use **relaxed values between 1.5 and 2.0**. While for headings a tighter fit - such as 1.2 - tends to be a good option.",
  "Every font and usecase is different tho so make sure adjust to what works best for you.",
]

const WIDTH_NOTES = [
  "With **width** you want to avoid making your containers too large. A human eye has a **tough time following long lines of text**, so keeping them shorter, makes reading much easier.",
  "The WCAG specifies 80 chars per line as a recommended maximum and for the bottom thershould, 40 seems to be the agreed upon standard.",
  "Best range to aim for is **45 to 75 characters per line** (including spaces).",
]

const CARD_INTRO =
  "Here is how those settings look applied to a real component."

/**
 * Splits a paragraph on its `**` markers and lifts what they hold: full
 * foreground at medium weight, against body copy set a step back. Weight and
 * colour together are what makes a phrase catch at a glance — either one on
 * its own reads as an accident.
 */
function emphasise(paragraph: string) {
  // The capture group lands on every odd index; the rest is plain text.
  return paragraph.split(/\*\*(.+?)\*\*/g).map((part, index) =>
    index % 2 === 0 ? (
      part
    ) : (
      <strong key={index} className="font-medium text-foreground">
        {part}
      </strong>
    )
  )
}

/**
 * A run of body copy. Paragraphs are parted by a blank line rather than a
 * spacing step: `1lh` is one line of the text's own leading, so the gap tracks
 * the type instead of drifting from it when the size changes.
 */
function Prose({
  className,
  paragraphs,
}: {
  className?: string
  paragraphs: readonly string[]
}) {
  return (
    <div
      className={cn(
        "flex flex-col gap-[1lh] text-sm leading-normal text-body",
        className
      )}
    >
      {paragraphs.map((paragraph) => (
        <p key={paragraph}>{emphasise(paragraph)}</p>
      ))}
    </div>
  )
}

/**
 * The page is prose plus two demos. The demos themselves live in
 * `components/demos` and are shared with the playground, so what is written
 * here is only what the page says about them.
 */
export function TypographyShowcase() {
  return (
    <>
      <PageHeader href="/typography" />

      <Prose
        className="labs-enter labs-enter-delay-2"
        paragraphs={LINE_HEIGHT_NOTES}
      />

      <Prose
        className="labs-enter labs-enter-delay-2"
        paragraphs={WIDTH_NOTES}
      />

      <MeasureDemo data-breakout className="labs-enter labs-enter-delay-3" />

      <Separator className="labs-enter labs-enter-delay-3" />

      <p className="labs-enter labs-enter-delay-3 text-sm text-body">
        {CARD_INTRO}
      </p>

      <BodyCopyDemo className="labs-enter labs-enter-delay-3" />
    </>
  )
}
