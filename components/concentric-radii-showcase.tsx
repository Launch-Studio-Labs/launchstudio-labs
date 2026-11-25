"use client"

import { CodeBlock } from "@/components/code-block"
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
import { CopyPromptButton } from "@/components/docs/copy-button"
import { PromptCard } from "@/components/docs/prompt-card"
import { Section } from "@/components/docs/section"
import { Steps } from "@/components/docs/steps"
import { PageHeader } from "@/components/page-header"
import { Prose } from "@/components/prose"
import { Separator } from "@/components/ui/separator"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { useRegistryOrigin } from "@/lib/use-registry-origin"

const INTRO = [
  "Put a rounded thing inside another rounded thing and the usual advice is to **subtract the padding from the outer radius**. Both corners then share a centre, so the gap between them stays even all the way round.",
]

const BREAK = [
  "That works while the radii are big but on small ones the visuals starts to break, and you get sharp corners inside round ones.",
  "The math is right. It just looks wrong. The easiest fix is to keep the math and just **never let the inner corner go sharp while the outer one is curved**.",
]

const RULE_LEAD = ["So we keep the concentric value and just **put a floor under it:**"]

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

/**
 * What the Copy prompt button puts on the clipboard. Short on purpose: the
 * skill carries the workflow — scan the styling, plan, wait for the OK, add
 * the utility. The origin is the host the page is served from, so a preview
 * copies a skill URL that exists on that preview.
 */
function buildPrompt(origin: string) {
  return `Add visually concentric radii from Launch Studio Labs to my project.

Skill (follow it): ${origin}/skills/visual-concentric-radii/SKILL.md`
}

const SKILL_STEPS = [
  {
    title: "Reads your project",
    body: "Works out how to add the utility the way your project writes styles, and finds the nested corners where it would replace a radius set by hand. Changes nothing.",
  },
  {
    title: "Asks for your OK",
    body: "Explains how it will add the utility, then lists the places it would use it in a short table for you to confirm. Then waits.",
  },
  {
    title: "Does what you confirmed",
    body: "Adds the utility and updates only the places you picked, then checks a nested corner comes out right.",
  },
]

const SNIPPETS = {
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
export function ConcentricRadiiShowcase({ skill }: { skill: string }) {
  const prompt = buildPrompt(useRegistryOrigin())

  return (
    <>
      <PageHeader
        href="/concentric-radii"
        action={
          <CopyPromptButton prompt={prompt} variant="secondary">
            Add with a prompt
          </CopyPromptButton>
        }
      />

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

      <Section title="Installation" className="labs-enter labs-enter-delay-3">
        {/* The skill first: the agent works out how the project styles and
            adds the utility there. The other two tabs are for doing it by
            hand. */}
        <Tabs defaultValue="skill" className="gap-6">
          <TabsList>
            <TabsTrigger value="skill">Skill</TabsTrigger>
            <TabsTrigger value="css">CSS</TabsTrigger>
            <TabsTrigger value="tailwind">Tailwind</TabsTrigger>
          </TabsList>
          <TabsContent value="skill" className="flex flex-col gap-8">
            <Prose>
              <p>
                Copy this into your coding agent. It points the agent at the
                skill, which recognises how your project writes styles and adds
                the rule the same way.
              </p>
            </Prose>
            <Steps steps={SKILL_STEPS} />
            <PromptCard
              prompt={prompt}
              skill={skill}
              skillTitle="Visually concentric radii skill"
            />
          </TabsContent>
          {Object.entries(SNIPPETS).map(([value, code]) => (
            <TabsContent key={value} value={value}>
              <CodeBlock code={code} language="css" />
            </TabsContent>
          ))}
        </Tabs>
      </Section>
    </>
  )
}
