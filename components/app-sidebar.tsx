"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"

import { docsPages } from "@/app/(docs)/pages"
import { cn } from "@/lib/utils"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"

type NavSection = {
  label: string
  items: { title: string; href: string }[]
}

/**
 * The nav is the page list itself, grouped by section in the order the pages
 * are written. A page appears here under the title it prints at the top of
 * the page — there is no second name to keep in step.
 */
const sections = Object.entries(docsPages).reduce<NavSection[]>(
  (groups, [href, page]) => {
    const item = { title: page.title, href }
    const group = groups.find((candidate) => candidate.label === page.section)

    if (group) {
      group.items.push(item)
    } else {
      groups.push({ label: page.section, items: [item] })
    }

    return groups
  },
  []
)

export function AppSidebar() {
  const pathname = usePathname()

  return (
    <Sidebar className="group-data-[side=left]:border-r-0 group-data-[side=right]:border-l-0">
      <SidebarHeader className="h-20 p-0 pt-8 pl-6">
        <Link href="/">
          <Image
            src="/launch-studio-logo.svg"
            alt="Launch Studio"
            width={142}
            height={16}
            className="outline-none"
            priority
          />
        </Link>
      </SidebarHeader>

      {/* One rhythm down the nav: every row is 32px tall and rows sit flush,
          so a label is exactly one step from the first page under it and the
          pages are one step from each other. Sections are the only break —
          24px between them. */}
      <SidebarContent className="gap-6">
        {sections.map((section) => (
          <SidebarGroup key={section.label} className="px-4 py-0">
            <SidebarGroupLabel className="px-2 font-normal">
              {section.label}
            </SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu className="gap-0">
                {section.items.map((item) => {
                  const isActive = pathname === item.href

                  return (
                    <SidebarMenuItem key={item.href}>
                      <SidebarMenuButton
                        isActive={isActive}
                        /* Pages hang under their section label: 8px further
                           in than the label's own text. */
                        className="h-8 rounded-none pr-2 pl-4 hover:bg-transparent active:bg-transparent data-active:bg-transparent"
                        render={<Link href={item.href} />}
                      >
                        <span
                          className={cn(
                            isActive &&
                              "bg-gradient-to-r from-neutral-950 to-neutral-600 bg-clip-text font-medium text-transparent"
                          )}
                        >
                          {item.title}
                        </span>
                      </SidebarMenuButton>
                    </SidebarMenuItem>
                  )
                })}
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        ))}
      </SidebarContent>
    </Sidebar>
  )
}
