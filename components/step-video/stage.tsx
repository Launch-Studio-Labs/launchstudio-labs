"use client"

import {
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
  type CSSProperties,
  type PointerEvent as ReactPointerEvent,
} from "react"

import { cn } from "@/lib/utils"

import { StepClockProvider } from "./clock"
import { resolveLabel } from "./tweaks"
import {
  STAGE_HEIGHT,
  STAGE_WIDTH,
  type Camera,
  type Deck,
  type LabelColor,
  type LabelDef,
  type Step,
  type Tweaks,
} from "./types"

/** The camera's move: quick to leave, soft to land, like the composer video. */
const CAMERA_MS = 650
const CAMERA_EASE = "cubic-bezier(0.65, 0, 0.35, 1)"

export function labelColor(color: LabelColor | undefined) {
  switch (color ?? "foreground") {
    case "foreground":
      return "var(--foreground)"
    case "muted":
      return "var(--muted-foreground)"
    case "primary":
      return "var(--primary)"
    default:
      return color
  }
}

function cameraTransform(camera: Camera | undefined, baseScale: number) {
  const { x = 0, y = 0, scale = baseScale, rotate = 0, tilt = 0 } = camera ?? {}
  return `scale(${scale}) rotateX(${tilt}deg) rotate(${rotate}deg) translate(${-x}px, ${-y}px)`
}

/** Fits the fixed 1920×1080 stage into its parent, letterboxed. */
function useFit() {
  const ref = useRef<HTMLDivElement>(null)
  const [fit, setFit] = useState(0)
  useLayoutEffect(() => {
    const element = ref.current
    if (!element) return
    const measure = () => {
      const { width, height } = element.getBoundingClientRect()
      setFit(Math.min(width / STAGE_WIDTH, height / STAGE_HEIGHT))
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(element)
    return () => observer.disconnect()
  }, [])
  return [ref, fit] as const
}

export type LabelEditing = {
  selected: string | null
  onSelect: (id: string | null) => void
  onChange: (
    id: string,
    patch: Partial<Pick<LabelDef, "x" | "y" | "text">>
  ) => void
}

export function Stage<S>({
  deck,
  step,
  tweaks,
  clock,
  editing,
  className,
}: {
  deck: Deck<S>
  step: Step<S>
  tweaks: Tweaks
  clock: { enteredAt: number; instant: boolean }
  /** Present in editing mode: labels can be picked, dragged and retyped. */
  editing?: LabelEditing
  className?: string
}) {
  const [ref, fit] = useFit()
  const World = deck.World
  const baseScale = deck.baseScale ?? 1

  return (
    <div
      ref={ref}
      className={cn("relative size-full overflow-hidden", className)}
      onPointerDown={(event) => {
        if (event.target === event.currentTarget) editing?.onSelect(null)
      }}
    >
      <div
        data-step-stage=""
        // Going back, jumping, or a key mid-animation: land on the finished
        // frame. Transitions stop; idle loops (keyframe animations) don't.
        data-instant={clock.instant ? "" : undefined}
        className="absolute top-1/2 left-1/2 origin-center overflow-hidden transition-[background-color] duration-300"
        style={{
          width: STAGE_WIDTH,
          height: STAGE_HEIGHT,
          transform: `translate(-50%, -50%) scale(${fit})`,
          backgroundColor: step.background ?? "#ffffff",
          visibility: fit ? "visible" : "hidden",
        }}
        onPointerDown={(event) => {
          if (!(event.target as HTMLElement).closest("[data-step-label]")) {
            editing?.onSelect(null)
          }
        }}
      >
        <StepClockProvider value={clock}>
          <div
            className="absolute inset-0"
            style={{ perspective: 2400, perspectiveOrigin: "50% 50%" }}
          >
            <div
              data-step-world=""
              className="absolute"
              style={{
                left: STAGE_WIDTH / 2,
                top: STAGE_HEIGHT / 2,
                transformOrigin: "0 0",
                transform: cameraTransform(step.camera, baseScale),
                transition: `transform ${CAMERA_MS}ms ${CAMERA_EASE}`,
              }}
            >
              <World scene={step.scene} stepId={step.id} />
            </div>
          </div>
          <Labels
            deck={deck as Deck<unknown>}
            step={step as Step<unknown>}
            tweaks={tweaks}
            fit={fit}
            editing={editing}
          />
        </StepClockProvider>
      </div>
    </div>
  )
}

/**
 * Every label the deck has, always mounted, faded in when the step uses it
 * and out when it doesn't — so a line leaving and the next one arriving
 * overlap the way speech does.
 */
function Labels({
  deck,
  step,
  tweaks,
  fit,
  editing,
}: {
  deck: Deck<unknown>
  step: Step<unknown>
  tweaks: Tweaks
  fit: number
  editing?: LabelEditing
}) {
  const onStep = new Map((step.labels ?? []).map((label) => [label.id, label]))

  return (
    <div className="pointer-events-none absolute inset-0">
      {Object.keys(deck.labels).map((id) => {
        const label = resolveLabel(deck, tweaks, id)
        if (!label) return null
        const current = onStep.get(id)
        return (
          <Label
            key={id}
            id={id}
            label={label}
            visible={Boolean(current)}
            lit={current?.lit}
            fit={fit}
            editing={editing}
          />
        )
      })}
    </div>
  )
}

function Label({
  id,
  label,
  visible,
  lit,
  fit,
  editing,
}: {
  id: string
  label: LabelDef
  visible: boolean
  lit?: number
  fit: number
  editing?: LabelEditing
}) {
  const phrases = label.text.split("|")
  const litCount = lit ?? phrases.length
  const selected = editing?.selected === id && visible
  const [typingState, setTyping] = useState(false)
  // Leaving the step or losing the selection ends a text edit.
  const typing = typingState && selected
  const textRef = useRef<HTMLSpanElement>(null)
  const drag = useRef<{
    x: number
    y: number
    fromX: number
    fromY: number
    moved: boolean
  } | null>(null)

  useEffect(() => {
    if (!typing) return
    const element = textRef.current
    if (!element) return
    element.textContent = label.text
    element.focus()
    const range = document.createRange()
    range.selectNodeContents(element)
    const selection = window.getSelection()
    selection?.removeAllRanges()
    selection?.addRange(range)
    // Only on entering the edit: the text is the user's while they type.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [typing])

  function commitText() {
    const text = textRef.current?.textContent?.replace(/\s+/g, " ").trim()
    setTyping(false)
    if (text && text !== label.text) editing?.onChange(id, { text })
  }

  function onPointerDown(event: ReactPointerEvent<HTMLDivElement>) {
    if (!editing || !visible || typing || event.button !== 0) return
    event.stopPropagation()
    event.preventDefault()
    editing.onSelect(id)
    event.currentTarget.setPointerCapture(event.pointerId)
    drag.current = {
      x: event.clientX,
      y: event.clientY,
      fromX: label.x,
      fromY: label.y,
      moved: false,
    }
  }

  function onPointerMove(event: ReactPointerEvent<HTMLDivElement>) {
    const start = drag.current
    if (!start || !editing || !fit) return
    const dx = (event.clientX - start.x) / fit
    const dy = (event.clientY - start.y) / fit
    if (!start.moved && Math.hypot(dx, dy) < 3 / fit) return
    start.moved = true
    editing.onChange(id, {
      x: Math.round(start.fromX + dx),
      y: Math.round(start.fromY + dy),
    })
  }

  function onPointerUp() {
    drag.current = null
  }

  const style: CSSProperties = {
    left: label.x,
    top: label.y,
    width: label.width ?? 1200,
    fontSize: label.size ?? 44,
    color: labelColor(label.color),
    transform: `translate(-50%, -50%) rotate(${label.rotate ?? 0}deg)`,
    opacity: visible ? 1 : 0,
  }

  return (
    <div
      data-step-label={id}
      data-visible={visible ? "" : undefined}
      className={cn(
        "absolute text-center font-serif leading-[1.25] italic transition-opacity duration-300 ease-out",
        visible &&
          editing &&
          "pointer-events-auto cursor-grab select-none active:cursor-grabbing",
        typing && "cursor-text"
      )}
      style={style}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerUp}
      onDoubleClick={() => editing && visible && setTyping(true)}
    >
      <span
        className={cn(
          "inline-block rounded-[6px] px-3 py-1 outline-offset-4 transition-[outline-color] duration-150",
          editing &&
            visible &&
            "outline-2 outline-transparent outline-dashed hover:outline-foreground/15",
          selected && "outline-foreground/40 hover:outline-foreground/40"
        )}
      >
        {typing ? (
          <span
            ref={textRef}
            contentEditable
            suppressContentEditableWarning
            spellCheck={false}
            data-step-label-input=""
            className="outline-none"
            onBlur={commitText}
            onKeyDown={(event) => {
              event.stopPropagation()
              if (event.key === "Enter") {
                event.preventDefault()
                commitText()
              } else if (event.key === "Escape") {
                event.preventDefault()
                setTyping(false)
              }
            }}
          />
        ) : (
          phrases.map((phrase, index) => (
            <span
              key={index}
              className="transition-opacity duration-200 ease-out"
              style={{ opacity: index < litCount ? 1 : 0.25 }}
            >
              {phrase}
            </span>
          ))
        )}
      </span>
    </div>
  )
}
