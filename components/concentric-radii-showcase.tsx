import { CodeBlock, Command } from "@/components/code-block"
import { ConcentricRadiiDemo } from "@/components/demos/concentric-radii-demo"
import {
  HandFormula,
  HandFormulaLine,
  HandTerm,
} from "@/components/docs/hand-formula"
import {
  ScribbleAnchor,
  ScribbledFormula,
  type Scribble,
} from "@/components/docs/scribbled-formula"
import { PageHeader } from "@/components/page-header"
import { Prose } from "@/components/prose"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const INTRO = [
  "Put a rounded thing inside another rounded thing and the usual advice is to **subtract the padding from the outer radius**. Both corners then share a centre, so the gap between them stays even all the way round.",
]

const BREAK = [
  "That works while the radii are big but on small ones the visuals starts to break, and you get sharp corners inside round ones.",
  "The math is right. It just looks wrong. The easiest fix is to keep the math and just **never let the inner corner go sharp while the outer one is curved**.",
]

const RULE_LEAD = ["So we keep the concentric value and just **put a floor under it:**"]

const USE = [
  "Grab the helper from the registry, or take the CSS if a stylesheet is all you have. Both apply the same rule. The helper also takes an optional `own` radius for when the padding passes the outer one, and an optional `size` that clamps the number it reports at half the element, which the browser does anyway.",
]

/**
 * The margin notes on the rule. Positions are px from the top-left of the term
 * each one is anchored on; see `ScribbleAnchor`.
 */
const SCRIBBLES = {
  ideal: {
    text: "what true concentric gives you",
    at: { left: 22, top: 44, width: 150, rotate: -2 },
    arrow: ["M30 52C24 43 42 37 64 33", "M56.5 31 64 33l-4.5 6"],
  },
  floor: {
    text: "a floor, so the corner is never sharp",
    at: { left: -4, top: -62, width: 170, rotate: -3 },
    arrow: ["M56 -15C48 -9 30 -11 24 0", "M21.5 -7.5 24 0l6.5 -4"],
  },
  minimum: {
    text: "2px minimum",
    at: { left: 124, top: -46, width: 138, rotate: 2 },
    arrow: ["M121 -24C107 -33 98 -20 103 -3", "M98 -8.5 103 -3l3 -7"],
  },
  cutoff: {
    text: "(only when padding ≤ outer, otherwise it keeps its own radius)",
    at: { left: 14, top: 4, width: 120, rotate: -1.5 },
  },
} satisfies Record<string, Scribble>

const INSTALL =
  "pnpm dlx shadcn@latest add https://labs.launchstudio.space/r/visual-concentric-radius.json"

const SNIPPETS = {
  ts: `import { visualConcentricRadius } from "@/lib/visual-concentric-radius"

visualConcentricRadius({ outer: 7.2, padding: 4, size: 28 }) // 3.6
visualConcentricRadius({ outer: 16, padding: 12 }) // 8
visualConcentricRadius({ outer: 24, padding: 8 }) // 16
visualConcentricRadius({ outer: 6, padding: 12, own: 8 }) // 8, its own
visualConcentricRadius({ outer: "full", padding: 4, size: 28 }) // 14`,
  css: `/* Set --outer and --padding on the parent; 9999px for a pill.
   Once --padding is bigger than --outer, give the child its own radius. */
.nested {
  border-radius: max(
    var(--outer) - var(--padding),
    var(--outer) * 0.5,
    min(2px, var(--outer))
  );
}`,
  tailwind: `/* globals.css */
/* Once --padding is bigger than --outer, use the child's own radius. */
@utility rounded-concentric {
  border-radius: max(
    var(--outer) - var(--padding),
    var(--outer) * 0.5,
    min(2px, var(--outer))
  );
}

/* component.tsx */
<div className="rounded-(--outer) p-(--padding) [--outer:8px] [--padding:4px]">
  <button className="rounded-concentric size-7" />
</div>`,
}

/**
 * Prose around one demo: the rule everyone uses, where it breaks, the rule
 * that fixes it, and the helper to copy. The demo lives in
 * `components/demos` and is shared with the playground.
 */
export function ConcentricRadiiShowcase() {
  return (
    <>
      <PageHeader href="/concentric-radii" />

      <div className="labs-enter labs-enter-delay-2 flex flex-col gap-6">
        <Prose paragraphs={INTRO} />
        <HandFormula className="px-2 [word-spacing:4px]">
          <HandFormulaLine>
            <HandTerm term="inner">inner</HandTerm> ={" "}
            <HandTerm term="outer">outer</HandTerm> −{" "}
            <HandTerm term="padding">padding</HandTerm>
          </HandFormulaLine>
        </HandFormula>
        <Prose paragraphs={BREAK} />
      </div>

      <ConcentricRadiiDemo className="labs-enter labs-enter-delay-3" />

      <Separator className="labs-enter labs-enter-delay-3" />

      <div className="labs-enter labs-enter-delay-3 flex flex-col gap-6">
        <Prose paragraphs={RULE_LEAD} />
        <ScribbledFormula
          scribbles={[
            SCRIBBLES.ideal,
            SCRIBBLES.floor,
            SCRIBBLES.minimum,
            SCRIBBLES.cutoff,
          ]}
          room={{ top: 72, bottom: 72 }}
          example="e.g. outer 16, padding 12 → 4 … too sharp, so the floor bumps it to 8"
        >
          <HandFormula className="sm:pl-2">
            <HandFormulaLine>
              <ScribbleAnchor scribble={SCRIBBLES.floor}>
                <HandTerm term="floor">floor</HandTerm>
              </ScribbleAnchor>{" "}
              = max( <HandTerm term="outer">outer</HandTerm> / 2,{" "}
              <ScribbleAnchor scribble={SCRIBBLES.minimum}>
                min(2, <HandTerm term="outer">outer</HandTerm>)
              </ScribbleAnchor>{" "}
              )
            </HandFormulaLine>
            <HandFormulaLine>
              <HandTerm term="inner">inner</HandTerm> = max({" "}
              <ScribbleAnchor scribble={SCRIBBLES.ideal}>
                <HandTerm term="outer">outer</HandTerm> −{" "}
                <HandTerm term="padding">padding</HandTerm>
              </ScribbleAnchor>
              , <HandTerm term="floor">floor</HandTerm>{" "}
              <ScribbleAnchor scribble={SCRIBBLES.cutoff}>)</ScribbleAnchor>
            </HandFormulaLine>
          </HandFormula>
        </ScribbledFormula>
      </div>

      <div className="labs-enter labs-enter-delay-3 flex flex-col gap-6">
        <Prose paragraphs={USE} />
        <Command text={INSTALL} />
        <Tabs defaultValue="ts">
          <TabsList>
            <TabsTrigger value="ts">TypeScript</TabsTrigger>
            <TabsTrigger value="css">CSS</TabsTrigger>
            <TabsTrigger value="tailwind">Tailwind</TabsTrigger>
          </TabsList>
          {Object.entries(SNIPPETS).map(([value, code]) => (
            <TabsContent key={value} value={value}>
              <CodeBlock
                code={code}
                language={value === "ts" ? "ts" : "css"}
              />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  )
}
