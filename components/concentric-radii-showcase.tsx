import { CodeBlock } from "@/components/code-block"
import { ConcentricRadiiDemo } from "@/components/demos/concentric-radii-demo"
import { PageHeader } from "@/components/page-header"
import { Prose } from "@/components/prose"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"

const INTRO = [
  "Put a rounded thing inside another rounded thing and the usual advice is to **subtract the padding from the outer radius**. Both corners then share a centre, so the gap between them stays even all the way round.",
]

const NAIVE_FORMULA = "inner = max(0, outer - padding)"

const BREAK = [
  "That holds while the radii are big. On small ones it runs out: a 7.2px field with a 4px inset leaves its button at 3.2px, and an 8px textarea with an 8px inset leaves it at **0px — a square corner inside a round one**.",
  "The math is right. It just looks wrong, because the eye doesn't find centres, it compares corners. So the fix is to keep the math and **never let the inner corner go sharp while the outer one is curved**.",
]

const RULE_FORMULA = `inner = outer === 0
  ? 0
  : min(outer, max(outer - padding, outer * 0.5, 5), size / 2)`

const RULE_LEAD = ["So keep the concentric value and **put a floor under it**:"]

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
        <CodeBlock code={NAIVE_FORMULA} />
        <Prose paragraphs={BREAK} />
      </div>

      <ConcentricRadiiDemo className="labs-enter labs-enter-delay-3" />

      <Separator className="labs-enter labs-enter-delay-3" />

      <div className="labs-enter labs-enter-delay-3 flex flex-col gap-6">
        <Prose paragraphs={RULE_LEAD} />
        <CodeBlock code={RULE_FORMULA} />
        <Prose paragraphs={RULE} />
      </div>

      <Separator className="labs-enter labs-enter-delay-3" />

      <div className="labs-enter labs-enter-delay-3 flex flex-col gap-6">
        <Prose paragraphs={USE} />
        <CodeBlock code={INSTALL} />
        <Tabs defaultValue="ts">
          <TabsList>
            <TabsTrigger value="ts">TypeScript</TabsTrigger>
            <TabsTrigger value="css">CSS</TabsTrigger>
            <TabsTrigger value="tailwind">Tailwind</TabsTrigger>
          </TabsList>
          {Object.entries(SNIPPETS).map(([value, code]) => (
            <TabsContent key={value} value={value}>
              <CodeBlock code={code} />
            </TabsContent>
          ))}
        </Tabs>
      </div>
    </>
  )
}
