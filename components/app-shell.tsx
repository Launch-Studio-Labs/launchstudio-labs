"use client"

import type { CSSProperties, ReactNode } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export function AppShell({ children }: { children: ReactNode }) {
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
      <AppSidebar />
      <SidebarInset className="h-svh min-h-0 scroll-fade [scrollbar-gutter:stable] overflow-y-auto">
        <SidebarTrigger className="absolute top-6 left-5 z-10 size-10 md:hidden" />
        <div className="px-5 pt-24 pb-8 sm:px-8 lg:px-12 lg:pb-12">
          {/*
            Every page reads at the same measure: children land in the centre
            column. A child marked data-breakout spans the full width instead,
            for the rare piece that cannot live inside a text column.

            The shell also owns the vertical rhythm: one gap between every
            top-level block on every page, so pages compose blocks and never
            set their own margins. Grouping inside a block is the page's own
            business — gap-6 for parts of one idea, gap-3 inside a panel.
          */}
          <div className="grid w-full grid-cols-[minmax(0,1fr)_min(var(--container-content),100%)_minmax(0,1fr)] gap-y-12 *:col-start-2 [&>[data-breakout]]:col-span-3 [&>[data-breakout]]:col-start-1">
            {children}
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
