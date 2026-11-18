"use client"

import {
  useEffect,
  useRef,
  useState,
  type ComponentProps,
  type PointerEvent,
} from "react"

import { DemoFrame } from "@/components/demos/demo-frame"
import {
  Tabs,
  TabsContent,
  TabsIndicator,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs"
import { Switch } from "@/components/ui/switch"
import { cn } from "@/lib/utils"

/**
 * The pair on the studio homepage, in the same order: work, then questions.
 * The bar under them slides the same way it does there.
 */
const TABS = [
  {
    value: "work",
    label: "Our Work",
    panel: "Selected work, from the latest engagement back.",
  },
  {
    value: "questions",
    label: "Often asked",
    panel: "The questions that come up before a project starts.",
  },
] as const

type TabValue = (typeof TABS)[number]["value"]

/** How long a replay holds a tab down, then how long the new tab sits. */
const REPLAY_HOLD_MS = 520
const REPLAY_REST_MS = 980

/**
 * The heavier drawing is wider than the resting one. Both copies share one
 * grid cell, so the cell is born at the heavier width and the tab never
 * reflows — the underline, which is measured off the tab, stays put too.
 *
 * Weight is `font-weight`, which drives the `wght` axis on a variable font
 * and still resolves when a static face is what renders.
 */
const overlayClassName = cn(
  "pointer-events-none col-start-1 row-start-1 [font-weight:650] [clip-path:inset(0)]",
  "scale-[0.98] opacity-0",
  "transition-[opacity,scale] duration-200 ease-out",
  "group-active/press:scale-100 group-active/press:opacity-100",
  "group-data-[pressed=true]/press:scale-100 group-data-[pressed=true]/press:opacity-100",
  "motion-reduce:transition-none"
)

function PressLabel({ children }: { children: string }) {
  return (
    <span className="inline-grid place-items-center whitespace-nowrap">
      <span
        className={cn(
          "col-start-1 row-start-1",
          "transition-opacity duration-200 ease-out",
          "group-active/press:opacity-0 group-data-[pressed=true]/press:opacity-0",
          "motion-reduce:transition-none"
        )}
      >
        {children}
      </span>
      <span aria-hidden="true" className={overlayClassName}>
        {children}
      </span>
    </span>
  )
}

export function BolderOnPressDemo({
  className,
  ...props
}: ComponentProps<"div">) {
  const [tab, setTab] = useState<TabValue>("work")
  const [replay, setReplay] = useState(false)
  const [simulated, setSimulated] = useState<TabValue | null>(null)
  const [held, setHeld] = useState<TabValue | null>(null)
  const tabRef = useRef(tab)
  useEffect(() => {
    tabRef.current = tab
  }, [tab])

  useEffect(() => {
    if (!replay) return

    let timeout = 0
    let index = TABS.findIndex((item) => item.value === tabRef.current)
    const step = () => {
      index = (index + 1) % TABS.length
      const next = TABS[index].value
      setSimulated(next)
      timeout = window.setTimeout(() => {
        setSimulated(null)
        setTab(next)
        timeout = window.setTimeout(step, REPLAY_REST_MS)
      }, REPLAY_HOLD_MS)
    }

    // Rest on whatever is showing, then press the next tab.
    timeout = window.setTimeout(step, REPLAY_REST_MS)
    return () => window.clearTimeout(timeout)
  }, [replay])

  const pressed = held ?? (replay ? simulated : null)

  function hold(value: TabValue) {
    return (event: PointerEvent<HTMLButtonElement>) => {
      if (event.button !== 0) return
      event.currentTarget.setPointerCapture(event.pointerId)
      setHeld(value)
    }
  }

  function release(event: PointerEvent<HTMLButtonElement>) {
    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId)
    }
    setHeld(null)
  }

  return (
    <div
      className={cn(
        "flex w-content max-w-full flex-col items-center gap-6",
        className
      )}
      {...props}
    >
      <div className="flex w-full items-center">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none">
          <Switch
            size="sm"
            checked={replay}
            onCheckedChange={(checked) => {
              setReplay(checked)
              if (!checked) setSimulated(null)
            }}
          />
          Replay
        </label>
      </div>

      <DemoFrame className="w-full items-stretch px-5 py-8 sm:px-6 sm:py-10">
        <Tabs
          value={tab}
          onValueChange={(next) => {
            if (next === "work" || next === "questions") setTab(next)
          }}
          className="w-full gap-6"
        >
          <TabsList
            variant="line"
            className="h-auto w-full justify-start rounded-none border-b bg-transparent p-0 pb-2"
          >
            {TABS.map((item) => (
              <TabsTrigger
                key={item.value}
                value={item.value}
                data-pressed={pressed === item.value ? "true" : undefined}
                onPointerDown={hold(item.value)}
                onPointerUp={release}
                onPointerCancel={release}
                className="group/press touch-manipulation font-medium select-none active:scale-[0.97] data-[pressed=true]:scale-[0.97] motion-reduce:active:scale-100 motion-reduce:data-[pressed=true]:scale-100"
              >
                <PressLabel>{item.label}</PressLabel>
              </TabsTrigger>
            ))}
            <TabsIndicator />
          </TabsList>

          {TABS.map((item) => (
            <TabsContent key={item.value} value={item.value}>
              <p className="text-sm text-body">{item.panel}</p>
            </TabsContent>
          ))}
        </Tabs>
      </DemoFrame>
    </div>
  )
}
