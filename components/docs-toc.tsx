"use client"

import { useEffect, useState, type RefObject } from "react"
import { usePathname } from "next/navigation"

import { cn } from "@/lib/utils"

type TocItem = { id: string; title: string; depth: 2 | 3 }

/** Headings the contents list skips: inside demos, or opted out. */
const SKIP = "[data-slot=demo-frame], [data-toc-ignore]"

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-|-$/g, "") || "section"
  )
}

/**
 * Reads the page's own headings — every h2 and h3 in the content column —
 * and gives each one an id if it has none, so the list needs nothing from
 * the page itself.
 */
function collectHeadings(root: HTMLElement): TocItem[] {
  const used = new Set<string>()
  const items: TocItem[] = []
  for (const heading of root.querySelectorAll<HTMLHeadingElement>("h2, h3")) {
    if (heading.closest(SKIP)) continue
    const title = heading.textContent?.trim() ?? ""
    if (!title) continue
    if (!heading.id) {
      let id = slugify(title)
      for (let n = 2; used.has(id) || document.getElementById(id); n++) {
        id = `${slugify(title)}-${n}`
      }
      heading.id = id
    }
    used.add(heading.id)
    items.push({
      id: heading.id,
      title,
      depth: heading.tagName === "H3" ? 3 : 2,
    })
  }
  return items
}

/**
 * The section in view: the last heading that has scrolled past the top fifth
 * of the scrolling panel (the docs scroll inside the shell, not the window).
 * At the very bottom it's the last heading, so short closing sections still
 * get their turn.
 */
function useActiveHeading(items: TocItem[], root: HTMLElement | null) {
  const [active, setActive] = useState<string | null>(null)

  useEffect(() => {
    if (!root || items.length === 0) return
    let frame = 0
    const update = () => {
      frame = 0
      const top = root.getBoundingClientRect().top + root.clientHeight * 0.2
      const atEnd = root.scrollTop + root.clientHeight >= root.scrollHeight - 2
      let current: string | null = null
      for (const item of items) {
        const element = document.getElementById(item.id)
        if (element && element.getBoundingClientRect().top <= top) {
          current = item.id
        }
      }
      setActive(atEnd ? items[items.length - 1].id : current)
    }
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update)
    }
    update()
    root.addEventListener("scroll", onScroll, { passive: true })
    return () => {
      root.removeEventListener("scroll", onScroll)
      cancelAnimationFrame(frame)
    }
  }, [items, root])

  return [active, setActive] as const
}

/**
 * "On This Page", after shadcn's docs (`docs-toc.tsx`): the page's sections,
 * the one in view marked. Only for pages with two or more headings.
 */
export function DocsToc({
  contentRef,
  className,
}: {
  /** The content column to read headings from. */
  contentRef: RefObject<HTMLElement | null>
  className?: string
}) {
  const pathname = usePathname()
  const [items, setItems] = useState<TocItem[]>([])
  const [root, setRoot] = useState<HTMLElement | null>(null)
  const [active, setActive] = useActiveHeading(items, root)

  // Each page brings its own headings: read them once it has rendered.
  useEffect(() => {
    const content = contentRef.current
    if (!content) return
    const id = window.setTimeout(() => {
      setItems(collectHeadings(content))
      setRoot(content.closest<HTMLElement>("[data-slot=sidebar-inset]"))
    }, 0)
    return () => window.clearTimeout(id)
  }, [pathname, contentRef])

  if (items.length < 2) return null

  return (
    <nav
      aria-label="On this page"
      className={cn("flex flex-col gap-2 text-sm", className)}
    >
      <p className="h-6 text-xs font-medium text-muted-foreground">
        On This Page
      </p>
      {items.map((item) => (
        <a
          key={item.id}
          href={`#${item.id}`}
          onClick={() => setActive(item.id)}
          data-active={item.id === active}
          data-depth={item.depth}
          aria-current={item.id === active ? "location" : undefined}
          className="text-[0.8rem] text-muted-foreground transition-colors hover:text-foreground data-[active=true]:font-medium data-[active=true]:text-foreground data-[depth=3]:pl-4"
        >
          {item.title}
        </a>
      ))}
    </nav>
  )
}
