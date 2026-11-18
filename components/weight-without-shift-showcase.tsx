import { WeightCompareDemo } from "@/components/demos/weight-compare-demo"
import { WeightFiltersDemo } from "@/components/demos/weight-filters-demo"
import { PageHeader } from "@/components/page-header"
import {
  PromptClickToCopy,
  PromptOutline,
  PromptPeek,
} from "@/components/prompt-concepts"
import { Prose } from "@/components/prose"
import { Separator } from "@/components/ui/separator"
import { WEIGHT_WITHOUT_SHIFT_PROMPT } from "@/components/weight-without-shift-prompt"

const INTRO = [
  "A heavier weight is a common way to mark state: the filter that is on, the current page, the selected tab. But heavier weights draw **wider letters**. Change `font-weight` on its own and the box around the label grows, everything after it moves along, and anything measured from it (an underline, a pill, a wrapping row) jumps.",
  "These filters go from 500 to 600 when they are on. Each one already holds its 600 width, so turning them on and off changes the weight and nothing else.",
]

const COMPARE = [
  "Here is the difference in one place: the same two tabs, twice. The top row changes only the weight. The bottom row **reserves the heavier width** first. Switch tabs and watch the widths: on top, the selected tab grows by 4 to 5px and pushes the next one along. Underneath, both stay put.",
]

const HOW = [
  "Each label carries a **hidden copy of its own text**, set at the heavier weight, in `::after`. The copy is invisible and has no height, but it still takes up width, so the label is as wide as its heavier self from the start. When the weight changes, the letters grow into room that is already there. Screen readers skip the copy and it can't be selected, so the label reads and copies once.",
  "Use it wherever weight marks state and the label shares a row with something: tabs, filter chips, nav links, segmented controls. You don't need it when the box has a fixed width wider than the heavier text.",
]

const PROMPT_INTRO = [
  "To find and fix this across a codebase, paste this prompt into your coding assistant. It lists every case first, then fixes only the ones you pick.",
]

const CONCEPTS = [
  {
    name: "Concept A",
    summary:
      "Peek and expand. Six lines, then “Show full prompt” opens it in place. Copy sits alongside.",
    Box: PromptPeek,
  },
  {
    name: "Concept B",
    summary:
      "Click to copy. The preview itself copies the prompt; “Read full prompt” opens it in a side sheet.",
    Box: PromptClickToCopy,
  },
  {
    name: "Concept C",
    summary:
      "Outline. The opening lines, then one row per step to open on its own. Copy lives in the header.",
    Box: PromptOutline,
  },
]

export function WeightWithoutShiftShowcase() {
  return (
    <>
      <PageHeader href="/weight-without-shift" />

      <Prose className="labs-enter labs-enter-delay-2" paragraphs={INTRO} />

      <WeightFiltersDemo className="labs-enter labs-enter-delay-3" />

      <Separator className="labs-enter labs-enter-delay-3" />

      <Prose className="labs-enter labs-enter-delay-3" paragraphs={COMPARE} />

      <WeightCompareDemo className="labs-enter labs-enter-delay-3" />

      <Separator className="labs-enter labs-enter-delay-3" />

      <Prose className="labs-enter labs-enter-delay-3" paragraphs={HOW} />

      <Separator className="labs-enter labs-enter-delay-3" />

      <Prose
        className="labs-enter labs-enter-delay-3"
        paragraphs={PROMPT_INTRO}
      />

      {CONCEPTS.map(({ name, summary, Box }) => (
        <section
          key={name}
          aria-label={name}
          data-concept={name.slice(-1)}
          className="labs-enter labs-enter-delay-3 flex flex-col gap-3"
        >
          <div className="flex flex-col gap-1">
            <h2 className="text-sm font-medium text-foreground">{name}</h2>
            <p className="text-sm text-pretty text-body">{summary}</p>
          </div>
          <Box prompt={WEIGHT_WITHOUT_SHIFT_PROMPT} />
        </section>
      ))}
    </>
  )
}
