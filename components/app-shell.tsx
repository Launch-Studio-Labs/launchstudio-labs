"use client"

import { useRef, type CSSProperties, type ReactNode } from "react"

import { AppSidebar } from "@/components/app-sidebar"
import { DocsToc } from "@/components/docs-toc"
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar"

export function AppShell({ children }: { children: ReactNode }) {
  const contentRef = useRef<HTMLDivElement>(null)
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
        {/*
          From xl, on a page that has a contents list, the list takes the right
          edge (w-44 at right-6), so the right padding grows by its width plus
          its offset: the column centres between the sidebar and the list, with
          the same 48px edge on both sides. Pages without one stay centred
          between the sidebar and the screen.

          Decided in CSS, not by the list itself: the list appears after
          hydration, and waiting for it would slide the column sideways on
          load. "Two sections, a later one headed" is the list's own rule
          (two or more headings) as the stylesheet can see it.
        */}
        <div className="relative px-5 pt-24 pb-8 sm:px-8 lg:px-12 lg:pb-12 xl:has-[section~section_h2]:pr-[15.5rem]">
          {/*
            Every page reads at the same measure: children land in the centre
            column. A child marked data-breakout spans the full width instead,
            for the rare piece that cannot live inside a text column.

            The shell also owns the vertical rhythm: one gap between every
            top-level block on every page, so pages compose blocks and never
            set their own margins. Grouping inside a block is the page's own
            business — gap-6 for parts of one idea, gap-3 inside a panel.
          */}
          <div
            ref={contentRef}
            className="grid w-full grid-cols-[minmax(0,1fr)_min(var(--container-content),100%)_minmax(0,1fr)] gap-y-12 *:col-start-2 [&_:is(h2,h3)]:scroll-mt-12 [&>[data-breakout]]:col-span-3 [&>[data-breakout]]:col-start-1"
          >
            {children}
          </div>
          {/* The page's contents, against the right edge of the screen, on
              screens wide enough to hold it clear of the column. It sticks
              while the page scrolls. */}
          <div className="absolute top-24 right-6 bottom-0 hidden w-44 xl:block">
            <DocsToc contentRef={contentRef} className="sticky top-24" />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}
