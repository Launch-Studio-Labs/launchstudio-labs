import { BOLDER_ON_PRESS_PROMPT } from "@/components/bolder-on-press-prompt"
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
  "Setting the selected label **bolder** is a clear way to mark it. The catch is that heavier letters are wider. Change only `font-weight` and the label grows, the tab next to it shifts, and the underline jumps to a new width.",
  "Here it is on the tabs from the Launch Studio homepage, with the fix in place. Press or switch tabs: the label thickens, and nothing around it moves.",
]

const PROBLEM = [
  "Both rows below are the same pair of tabs. The top row changes only the weight. The bottom row **reserves the bold width** up front. Switch tabs and watch the widths: on top, the active tab grows by 4 to 5px and pushes Often asked along with it. Underneath, nothing moves.",
]

const FIX = [
  "The fix is to make each label as wide as its bold self **before** it turns bold. A copy of the text, set in the bold weight, sits in `::after`. It is invisible and has no height, but it still counts toward the width, so the bold text grows into room that is already there. Screen readers skip it, and it can't be selected or copied.",
  "It rarely shows up in just one place. Tabs, nav links, filters and segmented controls all tend to do it. Paste the prompt below into your coding assistant: it **finds every instance, lists them for you**, and fixes only the ones you approve.",
]

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
          <CardTitle>Prompt</CardTitle>
          <CardDescription className="text-pretty">
            For Claude Code, Cursor, Copilot or any coding assistant.
          </CardDescription>
          <CardAction>
            <CopyButton
              text={BOLDER_ON_PRESS_PROMPT}
              aria-label="Copy the prompt"
            />
          </CardAction>
        </CardHeader>
        <CardContent>
          {/* Wrapped, not scrolled sideways: it is prose with code in it,
              and on a phone a horizontal scroller hides half of every line. */}
          <pre className="-mx-2 rounded-lg bg-muted p-3.5 font-mono text-xs leading-relaxed break-words whitespace-pre-wrap text-foreground/80 sm:mx-0 sm:p-5">
            <code>{BOLDER_ON_PRESS_PROMPT}</code>
          </pre>
        </CardContent>
      </Card>
    </>
  )
}
