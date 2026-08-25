"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

import { demos } from "@/components/demos/registry"
import { Switch } from "@/components/ui/switch"
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { cn } from "@/lib/utils"

/**
 * The only chrome the playground has: a list of demos, and one switch at the
 * foot of it for the frame demos draw around themselves. No header, no
 * labels, no titles — anything up here would end up in a screen capture of
 * the canvas beside it.
 */
export function PlaygroundSidebar({
  framed,
  onFramedChange,
}: {
  framed: boolean
  onFramedChange: (framed: boolean) => void
}) {
  const pathname = usePathname()

  return (
    <Sidebar className="group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0">
      <SidebarContent>
        <SidebarGroup className="px-4 pt-8">
          <SidebarGroupContent>
            <SidebarMenu>
              {demos.map((demo) => {
                const href = `/playground/${demo.id}`
                const isActive = pathname === href

                return (
                  <SidebarMenuItem key={demo.id}>
                    <SidebarMenuButton
                      isActive={isActive}
                      className="h-8 rounded-none px-2 hover:bg-transparent active:bg-transparent data-active:bg-transparent"
                      render={<Link href={href} />}
                    >
                      <span
                        className={cn(
                          isActive &&
                            "bg-gradient-to-r from-neutral-950 to-neutral-600 bg-clip-text font-medium text-transparent"
                        )}
                      >
                        {demo.title}
                      </span>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <SidebarFooter className="px-6 pb-8">
        <label className="flex cursor-pointer items-center gap-2.5 text-sm text-muted-foreground select-none">
          <Switch size="sm" checked={framed} onCheckedChange={onFramedChange} />
          Frame
        </label>
      </SidebarFooter>
    </Sidebar>
  )
}
