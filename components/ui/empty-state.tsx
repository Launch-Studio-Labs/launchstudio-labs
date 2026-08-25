"use client"

import type { ReactNode } from "react"
import {
  ArrowClockwiseIcon,
  ArrowRightIcon,
  CompassIcon,
  LockKeyIcon,
  MagnifyingGlassIcon,
  PlusIcon,
  TrayIcon,
  WarningCircleIcon,
} from "@phosphor-icons/react"

import { Button } from "@/components/ui/button"
import { Card } from "@/components/ui/card"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { cn } from "@/lib/utils"

const emptyStateContent = {
  "no-results": {
    eyebrow: "Search",
    title: "Nothing matched your search",
    description:
      "Try another phrase or remove a filter to see more of the catalog.",
    action: "Clear filters",
    icon: MagnifyingGlassIcon,
  },
  "empty-feed": {
    eyebrow: "Your feed",
    title: "A quiet feed, for now",
    description:
      "Follow a few people and their latest work will start showing up here.",
    action: "Find people",
    icon: TrayIcon,
  },
  "no-access": {
    eyebrow: "Private area",
    title: "You don’t have access",
    description:
      "This space is limited to invited members. Ask an admin to add you.",
    action: "Request access",
    icon: LockKeyIcon,
  },
  onboarding: {
    eyebrow: "Welcome",
    title: "Make this space yours",
    description:
      "Create your first project and turn an empty canvas into something useful.",
    action: "Create a project",
    icon: CompassIcon,
  },
  error: {
    eyebrow: "Connection lost",
    title: "We couldn’t load this page",
    description:
      "Something interrupted the request. Your work is safe—give it another try.",
    action: "Try again",
    icon: WarningCircleIcon,
  },
} as const

export type EmptyStateVariant = keyof typeof emptyStateContent

type EmptyStateProps = {
  variant?: EmptyStateVariant
  title?: string
  description?: string
  actionLabel?: string
  onAction?: () => void
  className?: string
  children?: ReactNode
}

function EmptyState({
  variant = "no-results",
  title,
  description,
  actionLabel,
  onAction,
  className,
  children,
}: EmptyStateProps) {
  const content = emptyStateContent[variant]
  const Icon = content.icon
  const isError = variant === "error"

  return (
    <Card
      data-slot="empty-state"
      data-variant={variant}
      className={cn(
        "relative min-h-[440px] w-full justify-center overflow-hidden py-0",
        className
      )}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_0%,oklch(0.97_0_0),transparent_42%)] dark:bg-[radial-gradient(circle_at_50%_0%,oklch(0.3_0_0/.55),transparent_42%)]" />
      <div className="pointer-events-none absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-foreground/15 to-transparent" />

      <Empty className="relative min-h-[440px] border-0 px-6 py-14">
        <EmptyHeader>
          <EmptyMedia
            variant="icon"
            className={cn(
              "relative mb-5 size-14 rounded-xl bg-background smooth-shadow-ring-xs",
              isError && "bg-destructive/5 text-destructive"
            )}
          >
            <span className="absolute inset-0 -z-10 scale-[1.75] rounded-full bg-foreground/[.035] ring-1 ring-foreground/[.04]" />
            <Icon className="size-6!" weight="duotone" />
            {variant === "onboarding" && (
              <span className="absolute -top-2 -right-2 flex size-5 items-center justify-center rounded-full bg-foreground text-background ring-4 ring-card">
                <PlusIcon className="size-3!" weight="bold" />
              </span>
            )}
          </EmptyMedia>
          <span className="text-xs font-medium tracking-wider text-muted-foreground uppercase">
            {content.eyebrow}
          </span>
          <EmptyTitle className="text-xl font-semibold">
            {title ?? content.title}
          </EmptyTitle>
          <EmptyDescription className="max-w-sm text-pretty">
            {description ?? content.description}
          </EmptyDescription>
        </EmptyHeader>

        <EmptyContent className="gap-3">
          <Button onClick={onAction}>
            {isError ? <ArrowClockwiseIcon data-icon="inline-start" /> : null}
            {actionLabel ?? content.action}
            {!isError ? <ArrowRightIcon data-icon="inline-end" /> : null}
          </Button>
          {children}
        </EmptyContent>
      </Empty>
    </Card>
  )
}

export { EmptyState, emptyStateContent }
