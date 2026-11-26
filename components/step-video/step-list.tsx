"use client"

import { useEffect, useRef, useState } from "react"
import { DotsSixVerticalIcon } from "@phosphor-icons/react"

import { cn } from "@/lib/utils"

import type { Step } from "./types"

/**
 * The steps in play order. Click one to jump there; drag one to move it. A
 * line shows where it will land.
 */
export function StepList<S>({
  steps,
  current,
  onGo,
  onReorder,
}: {
  steps: Step<S>[]
  current: number
  onGo: (index: number) => void
  onReorder: (order: string[]) => void
}) {
  const [dragging, setDragging] = useState<string | null>(null)
  /** The gap the dragged step would drop into: 0 is above the first. */
  const [gap, setGap] = useState<number | null>(null)
  const listRef = useRef<HTMLOListElement>(null)

  // Keep the current step in view as the deck moves.
  useEffect(() => {
    listRef.current
      ?.querySelector<HTMLElement>(`[data-index="${current}"]`)
      ?.scrollIntoView({ block: "nearest" })
  }, [current])

  function drop() {
    if (dragging === null || gap === null) return
    const ids = steps.map((step) => step.id)
    const from = ids.indexOf(dragging)
    ids.splice(from, 1)
    ids.splice(gap > from ? gap - 1 : gap, 0, dragging)
    onReorder(ids)
  }

  return (
    <ol
      ref={listRef}
      data-step-list=""
      className="min-h-0 flex-1 overflow-y-auto px-2 pb-3"
      onDragOver={(event) => {
        if (dragging === null) return
        event.preventDefault()
        event.dataTransfer.dropEffect = "move"
      }}
      onDrop={(event) => {
        event.preventDefault()
        drop()
        setDragging(null)
        setGap(null)
      }}
    >
      {steps.map((step, index) => (
        <li
          key={step.id}
          data-index={index}
          data-step-id={step.id}
          draggable
          onDragStart={(event) => {
            setDragging(step.id)
            event.dataTransfer.effectAllowed = "move"
            event.dataTransfer.setData("text/plain", step.id)
          }}
          onDragEnd={() => {
            setDragging(null)
            setGap(null)
          }}
          onDragOver={(event) => {
            if (dragging === null) return
            const rect = event.currentTarget.getBoundingClientRect()
            const below = event.clientY > rect.top + rect.height / 2
            setGap(below ? index + 1 : index)
          }}
          className="relative"
        >
          {gap === index && dragging !== null ? <DropLine edge="top" /> : null}
          <button
            type="button"
            onClick={() => onGo(index)}
            aria-current={index === current ? "step" : undefined}
            className={cn(
              "group flex h-8 w-full items-center gap-2 rounded-md pr-2 pl-1 text-left text-sm text-muted-foreground transition-colors hover:text-foreground",
              index === current && "bg-muted text-foreground",
              dragging === step.id && "opacity-40"
            )}
          >
            <DotsSixVerticalIcon className="size-3.5 shrink-0 cursor-grab text-muted-foreground/0 transition-colors group-hover:text-muted-foreground/70" />
            <span className="w-6 shrink-0 text-xs text-muted-foreground/70 tabular-nums">
              {index + 1}
            </span>
            <span className="truncate">{step.name}</span>
          </button>
          {gap === steps.length &&
          index === steps.length - 1 &&
          dragging !== null ? (
            <DropLine edge="bottom" />
          ) : null}
        </li>
      ))}
    </ol>
  )
}

function DropLine({ edge }: { edge: "top" | "bottom" }) {
  return (
    <span
      aria-hidden
      className={cn(
        "pointer-events-none absolute inset-x-1 z-10 h-0.5 rounded-full bg-foreground",
        edge === "top" ? "-top-px" : "-bottom-px"
      )}
    />
  )
}
