"use client"

import { useState, type CSSProperties, type ReactNode } from "react"

import { DemoFrameProvider } from "@/components/demos/demo-frame"
import { PlaygroundSidebar } from "@/components/playground-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

/**
 * A demo on a bare canvas, for screenshots and screen recordings: the
 * component is centred with nothing around it — no header, no title, no
 * caption — so a capture of the canvas holds the component and the background
 * and nothing else. ⌘B (Ctrl+B) hides the sidebar too when even that is one
 * thing too many in frame.
 *
 * The frame demos draw around themselves is switched from here, and the state
 * lives in the layout, so it holds while you move between demos.
 */
export function PlaygroundShell({ children }: { children: ReactNode }) {
  const [framed, setFramed] = useState(true)

  return (
    <SidebarProvider
      className="h-svh min-h-0 overflow-hidden"
      style={
        {
          "--sidebar-width": "200px",
          "--sidebar-width-icon": "200px",
        } as CSSProperties
      }
    >
      <PlaygroundSidebar framed={framed} onFramedChange={setFramed} />
      <SidebarInset className="h-svh min-h-0 overflow-y-auto">
        <SidebarTrigger className="absolute top-6 left-5 z-10 size-10 md:hidden" />
        <div className="flex min-h-full w-full items-center justify-center px-5 py-12 sm:px-8 lg:px-12">
          <DemoFrameProvider framed={framed}>{children}</DemoFrameProvider>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
