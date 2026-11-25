import type { ReactNode } from "react"

import { cn } from "@/lib/utils"

/**
 * One section of a docs page: a heading (with an optional line under it, 8px
 * away so they read as one) and its blocks 24px apart. Its h2 is what "On
 * This Page" lists.
 */
export function Section({
  id,
  title,
  description,
  className,
  children,
}: {
  id?: string
  title: string
  description?: string
  className?: string
  children: ReactNode
}) {
  const heading = (
    <h2 className="text-base leading-5 font-medium tracking-tight">{title}</h2>
  )
  return (
    <section
      id={id}
      // Lands with room above the heading, not flush to the top edge.
      className={cn("flex scroll-mt-12 flex-col gap-6", className)}
    >
      {description ? (
        <div className="flex flex-col gap-2">
          {heading}
          <p className="text-sm leading-normal text-pretty text-body">
            {description}
          </p>
        </div>
      ) : (
        heading
      )}
      {children}
    </section>
  )
}

/** A code-styled word in running text: a prop, a file, a value. */
export function Code({ children }: { children: ReactNode }) {
  return (
    <code className="rounded-[4px] bg-muted box-decoration-clone px-1 py-px font-mono text-[0.85em] text-foreground">
      {children}
    </code>
  )
}
