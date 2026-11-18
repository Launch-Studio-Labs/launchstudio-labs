import { CopyButton } from "@/components/copy-button"
import { BolderCompareDemo } from "@/components/demos/bolder-compare-demo"
import { BolderOnPressDemo } from "@/components/demos/bolder-on-press-demo"
import { PageHeader } from "@/components/page-header"
import { Prose } from "@/components/prose"
import {
  Card,
  CardAction,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Separator } from "@/components/ui/separator"

const INTRO = [
  "A tab that gets **bolder when you press it** confirms the press before anything else has changed. The catch is that heavier letters are wider. Change only `font-weight` and the label grows, the tab next to it shifts, and the underline jumps to a new width.",
  "Here it is on the tabs from the Launch Studio homepage. Press and hold one: the label thickens at once, and nothing around it moves.",
]

const PROBLEM = [
  "Both rows below are the same pair of tabs. The top row changes only the weight. The bottom row **reserves the bold width** up front. Switch tabs and watch the widths: on top, the active tab grows by 4 to 5px and pushes Often asked along with it. Underneath, nothing moves.",
]

const FIX = [
  "Make the label as wide as its bold self **before** it turns bold. A copy of the text, set in the bold weight, goes in `::after`. It is invisible and has no height, but it still counts toward the width. When the real text thickens, it grows into room that was already there.",
]

const NOTES = [
  "Keep `data-text` in step with the label: the copy reserves the width of whatever text it is given. `visibility: hidden` also keeps it out of the accessibility tree, so screen readers announce the tab once.",
  "The other common fix stacks a regular and a bold copy in one grid cell and cross-fades them. It works with any font, but every label is in the page twice, and halfway through the fade you can see both. With a variable font like Manrope, **reserve the width and transition the weight**. It is less markup, and the weight moves smoothly instead of swapping.",
]

const SNIPPET = `<button class="tab" role="tab">
  <span class="label" data-text="Often asked">Often asked</span>
</button>

.label {
  display: inline-flex;
  flex-direction: column;
  align-items: center;
}

/* The bold width, reserved: invisible, no height. */
.label::after {
  content: attr(data-text);
  font-weight: 700;
  height: 0;
  overflow: hidden;
  visibility: hidden;
}

.tab {
  font-weight: 500;
  transition: font-weight 100ms ease-out;
}

.tab:active,
.tab[aria-selected="true"] {
  font-weight: 700;
}

@media (prefers-reduced-motion: reduce) {
  .tab {
    transition: none;
  }
}`

export function BolderOnPressShowcase() {
  return (
    <>
      <PageHeader href="/bolder-on-press" />

      <Prose className="labs-enter labs-enter-delay-2" paragraphs={INTRO} />

      <BolderOnPressDemo className="labs-enter labs-enter-delay-3" />

      <Separator className="labs-enter labs-enter-delay-3" />

      <Prose className="labs-enter labs-enter-delay-3" paragraphs={PROBLEM} />

      <BolderCompareDemo className="labs-enter labs-enter-delay-3" />

      <Separator className="labs-enter labs-enter-delay-3" />

      <Prose className="labs-enter labs-enter-delay-3" paragraphs={FIX} />

      <Card className="labs-enter labs-enter-delay-3">
        <CardHeader>
          <CardTitle>The fix</CardTitle>
          <CardDescription className="text-pretty">
            One tab, markup and CSS.
          </CardDescription>
          <CardAction>
            <CopyButton text={SNIPPET} aria-label="Copy the code" />
          </CardAction>
        </CardHeader>
        <CardContent>
          <pre className="overflow-x-auto rounded-lg bg-muted p-5 font-mono text-xs leading-normal">
            <code>{SNIPPET}</code>
          </pre>
        </CardContent>
      </Card>

      <Prose className="labs-enter labs-enter-delay-3" paragraphs={NOTES} />
    </>
  )
}
