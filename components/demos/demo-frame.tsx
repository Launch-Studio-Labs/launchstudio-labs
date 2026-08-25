"use client"

import { createContext, useContext, type ComponentProps } from "react"

import { cn } from "@/lib/utils"

/**
 * Whether demos draw their frame. On by default, so a demo dropped anywhere —
 * a docs page, a new route — is framed without being told. The playground
 * turns it off to capture a component on the bare canvas.
 */
const DemoFrameContext = createContext(true)

export function DemoFrameProvider({
  framed,
  children,
}: {
  framed: boolean
  children: React.ReactNode
}) {
  return <DemoFrameContext value={framed}>{children}</DemoFrameContext>
}

export function useDemoFrame() {
  return useContext(DemoFrameContext)
}

/**
 * The box a demo is shown in: the page's measure at its narrowest, no
 * maximum, growing to whatever the widest thing inside it turns out to be —
 * the way a layout holds the component it carries.
 *
 * Only the skin is switched off when the frame is disabled. The layout stays,
 * so the contents hold their places and just lose the ground under them.
 */
export function DemoFrame({ className, ...props }: ComponentProps<"div">) {
  const framed = useDemoFrame()

  return (
    <div
      data-slot="demo-frame"
      className={cn(
        "flex w-fit min-w-content flex-col items-center gap-4",
        framed && "rounded-[12px] border border-border bg-muted p-4",
        className
      )}
      {...props}
    />
  )
}
