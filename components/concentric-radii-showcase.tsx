import { CodeBlock, Command } from "@/components/code-block"
import { ConcentricRadiiDemo } from "@/components/demos/concentric-radii-demo"
import {
  HandFormula,
  HandFormulaLine,
  HandTerm,
} from "@/components/docs/hand-formula"
import { PageHeader } from "@/components/page-header"
import { Prose } from "@/components/prose"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const INTRO = [
  "Put a rounded thing inside another rounded thing and the usual advice is to **subtract the padding from the outer radius**. Both corners then share a centre, so the gap between them stays even all the way round.",
]

const BREAK = [
  "That works while the radii are big but on small ones the visuals starts to break, and you get sharp corners inside round ones.",
  "The math is right. It just looks wrong. Your eye doesn't find centres, it compares corners. The easiest fix is to keep the math and just **never let the inner corner go sharp while the outer one is curved**.",
]

const RULE_LEAD = [
  "To achieve this we keep the concentric value and **put a floor under it**:",
]

const RULE = [
  "There are two floors. **Half the outer radius** keeps the inner corner in the same family as the outer one. **5px** is roughly where a corner starts to read as round: the arc sits about 2px in from where the corner would be. Big radii clear both, so they stay truly concentric.",
  "Then cap it. Never rounder than the parent, so a square parent keeps a square child. And never more than **half the inner element's short side**, which is already a circle; the browser draws it that way anyway, but the number should say what's on screen.",
  "A pill inside a pill needs none of this. Half the outer height minus the padding is exactly half the inner height, so the textbook rule is right there: **pill in, pill out**.",
  "One aside: `corner-shape: squircle` (Chromium only for now) eases the curve into the straight edge, so the same radius looks smaller. If you use it, nudge the radii up. The floor still applies.",
]

const USE = [
  "Grab the helper from the registry, or take the CSS if a stylesheet is all you have. Both apply the same rule; the CSS leaves the size cap to the browser.",
]

const INSTALL =
  "pnpm dlx shadcn@latest add https://labs.launchstudio.space/r/visual-concentric-radius.json"

const SNIPPETS = {
  ts: `import { visualConcentricRadius } from "@/lib/visual-concentric-radius"

visualConcentricRadius({ outer: 7.2, padding: 4, size: 28 }) // 5
visualConcentricRadius({ outer: 8, padding: 8, size: 28 }) // 5
visualConcentricRadius({ outer: 24, padding: 8 }) // 16
visualConcentricRadius({ outer: "full", padding: 4, size: 28 }) // 14`,
  css: `/* Set --outer and --padding on the parent; 9999px for a pill. */
.nested {
  border-radius: min(
    var(--outer),
    max(var(--outer) - var(--padding), var(--outer) * 0.5, 5px)
  );
}`,
  tailwind: `/* globals.css */
@utility rounded-concentric {
  border-radius: min(
    var(--outer),
    max(var(--outer) - var(--padding), var(--outer) * 0.5, 5px)
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
        <HandFormula>
          <HandFormulaLine>
            base = max(<HandTerm term="outer">outer</HandTerm> −{" "}
            <HandTerm term="padding">padding</HandTerm>,{" "}
            <HandTerm term="outer">outer</HandTerm> / 2, 5)
          </HandFormulaLine>
          <HandFormulaLine>
            <HandTerm term="inner">inner</HandTerm> = min(base,{" "}
            <HandTerm term="outer">outer</HandTerm>, size / 2)
          </HandFormulaLine>
        </HandFormula>
        <Prose paragraphs={RULE} />
      </div>

      <Separator className="labs-enter labs-enter-delay-3" />

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
