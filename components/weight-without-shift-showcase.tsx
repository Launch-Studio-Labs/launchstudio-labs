import { WeightCompareDemo } from "@/components/demos/weight-compare-demo"
import { PageHeader } from "@/components/page-header"
import { PromptBox } from "@/components/prompt-box"
import { Prose } from "@/components/prose"
import { Separator } from "@/components/ui/separator"
import { WEIGHT_WITHOUT_SHIFT_PROMPT } from "@/components/weight-without-shift-prompt"

const INTRO = [
  "A heavier weight is a common way to mark state: the selected tab, the current page, the filter that is on. But heavier weights draw **wider letters**. Change `font-weight` on its own and the box around the label grows, everything after it moves along, and anything measured from it, like an underline, jumps too.",
  "Below are the same two tabs, twice. The top row changes only the weight. The bottom row **reserves the heavier width** first. Switch tabs and watch the widths: on top, the selected tab grows by 4 to 5px and pushes the next one along. Underneath, both stay put.",
]

const HOW = [
  "Each label carries a **hidden copy of its own text**, set at the heavier weight, in `::after`. The copy is invisible and has no height, but it still takes up width, so the label is as wide as its heavier self from the start. When the weight changes, the letters grow into room that is already there. Screen readers skip the copy and it can't be selected, so the label reads and copies once.",
  "Use it wherever weight marks state and the label shares a row with something: tabs, nav links, filter chips, segmented controls. You don't need it when the box has a fixed width wider than the heavier text.",
]

export function WeightWithoutShiftShowcase() {
  return (
    <>
      <PageHeader href="/weight-without-shift" />

      <Prose className="labs-enter labs-enter-delay-2" paragraphs={INTRO} />

      <WeightCompareDemo className="labs-enter labs-enter-delay-3" />

      <Separator className="labs-enter labs-enter-delay-3" />

      <Prose className="labs-enter labs-enter-delay-3" paragraphs={HOW} />

      <PromptBox
        className="labs-enter labs-enter-delay-3"
        title="Fix it in your codebase"
        description="Paste this into Claude Code, Cursor or Copilot. It finds every place a font-weight change shifts the layout, lists them, and fixes only the ones you approve."
        prompt={WEIGHT_WITHOUT_SHIFT_PROMPT}
      />
    </>
  )
}
