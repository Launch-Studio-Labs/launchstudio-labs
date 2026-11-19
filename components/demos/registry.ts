import type { ComponentType } from "react"

import { BodyCopyDemo } from "@/components/demos/body-copy-demo"
import { ConcentricRadiiDemo } from "@/components/demos/concentric-radii-demo"
import { EmptyStateDemo } from "@/components/demos/empty-state-demo"
import { MeasureDemo } from "@/components/demos/measure-demo"
import { VoiceInputDemo } from "@/components/demos/voice-input-demo"

export type Demo = {
  /** Also the playground's URL segment: /playground/<id>. */
  id: string
  /** Shown in the playground sidebar, and nowhere else. */
  title: string
  component: ComponentType<{ className?: string }>
}

/**
 * Every interactive piece in the labs, in one list. The docs pages import the
 * same components directly, so a demo is written once and the playground picks
 * it up by being added here — there is no second copy to keep in step.
 */
export const demos: Demo[] = [
  {
    id: "empty-state",
    title: "Empty state",
    component: EmptyStateDemo,
  },
  {
    id: "voice-input",
    title: "Voice Input",
    component: VoiceInputDemo,
  },
  {
    id: "width-and-leading",
    title: "Width & leading",
    component: MeasureDemo,
  },
  {
    id: "body-copy-card",
    title: "Body copy card",
    component: BodyCopyDemo,
  },
  {
    id: "concentric-radii",
    title: "Concentric radii",
    component: ConcentricRadiiDemo,
  },
]

export function getDemo(id: string) {
  return demos.find((demo) => demo.id === id)
}
