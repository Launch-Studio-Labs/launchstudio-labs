"use client"

import { useState, type ComponentProps } from "react"

import {
  BolderLabel,
  bolderTriggerClassName,
} from "@/components/demos/bolder-label"
import { DemoFrame } from "@/components/demos/demo-frame"
import { studioFont } from "@/components/demos/studio-font"
import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { cn } from "@/lib/utils"

/** The questions the studio's "Often asked" tab opens with. */
const QUESTIONS = [
  "How do we work together?",
  "What services do you offer?",
  "What's your process?",
]

/**
 * The tab pair from the studio homepage, with the label getting bolder on
 * press. Same type, size, colours, press and sliding underline as the real
 * one; the panels are trimmed down to an outline of what sits under each tab.
 */
export function BolderOnPressDemo({
  className,
  ...props
}: ComponentProps<"div">) {
  const [tab, setTab] = useState("work")

  return (
    <div
      className={cn("flex w-content max-w-full flex-col", className)}
      {...props}
    >
      <DemoFrame className="w-full min-w-0! items-stretch px-5 pt-6 pb-8 sm:px-8 sm:pt-8 sm:pb-10">
        <Tabs
          value={tab}
          onValueChange={(next) => setTab(String(next))}
          className={cn(studioFont.className, "w-full gap-6")}
        >
          {/* pl-0 so the underline starts flush with the column, as on the
              studio site. */}
          <TabsList variant="line" className="w-full justify-start pl-0">
            <TabsTrigger value="work" className={bolderTriggerClassName}>
              <BolderLabel>Our Work</BolderLabel>
            </TabsTrigger>
            <TabsTrigger value="questions" className={bolderTriggerClassName}>
              <BolderLabel>Often asked</BolderLabel>
            </TabsTrigger>
            <TabsIndicator />
          </TabsList>

          {/* Both panels are the same height, so switching tabs never resizes
              the frame — the one thing this page is about avoiding. */}
          <TabsContent value="work" className="h-32">
            <p className="text-lg leading-snug font-medium tracking-tight text-balance">
              Shaping the design of a UK AI sales startup{" "}
              <span className="text-muted-foreground">
                backed by General Catalyst and LocalGlobe
              </span>
            </p>
          </TabsContent>

          <TabsContent value="questions" className="h-32">
            <ul className="flex flex-col">
              {QUESTIONS.map((question) => (
                <li
                  key={question}
                  className="border-b border-border py-3 text-[15px] font-medium tracking-tight first:pt-0"
                >
                  {question}
                </li>
              ))}
            </ul>
          </TabsContent>
        </Tabs>
      </DemoFrame>
    </div>
  )
}
