import { cn } from "@/lib/utils"

/**
 * Lifts the marked phrases in a paragraph. `**like this**` is the phrase a
 * reader skimming the page should catch: full foreground at medium weight,
 * against body copy set a step back. Weight and colour together are what
 * makes it catch at a glance; either one alone reads as an accident.
 * `` `like this` `` is code. Keeping the markers inside the string leaves the
 * copy legible as prose rather than cut into fragments of JSX.
 */
function emphasise(paragraph: string) {
  // The capture group lands on every odd index; the rest is plain text.
  return paragraph.split(/(\*\*.+?\*\*|`.+?`)/g).map((part, index) => {
    if (index % 2 === 0) return part
    if (part.startsWith("`")) {
      return (
        <code key={index} className="font-mono text-[0.857em] text-foreground">
          {part.slice(1, -1)}
        </code>
      )
    }
    return (
      <strong key={index} className="font-medium text-foreground">
        {part.slice(2, -2)}
      </strong>
    )
  })
}

/**
 * A run of body copy. Paragraphs are parted by a blank line rather than a
 * spacing step: `1lh` is one line of the text's own leading, so the gap tracks
 * the type instead of drifting from it when the size changes.
 */
export function Prose({
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
