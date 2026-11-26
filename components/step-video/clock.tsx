"use client"

import { createContext, useContext, useEffect, useState } from "react"

/**
 * The step clock: when the current step was entered, and whether it should
 * show its finished frame right away (going back, jumping, or a key pressed
 * mid-animation). Timed things inside a step read it through the hooks below,
 * so "skip to the end" is one switch for all of them.
 */
type StepClock = { enteredAt: number; instant: boolean }

const StepClockContext = createContext<StepClock>({
  enteredAt: 0,
  instant: true,
})

export const StepClockProvider = StepClockContext.Provider

export function useStepClock() {
  return useContext(StepClockContext)
}

/**
 * Milliseconds since the step began, ticking each frame until `until`, then
 * holding. Finished steps read `until` straight away.
 */
export function useStepTime(until: number) {
  const { enteredAt, instant } = useStepClock()
  const [now, setNow] = useState(() => performance.now())

  useEffect(() => {
    if (instant) return
    let raf = 0
    const tick = () => {
      const t = performance.now()
      setNow(t)
      if (t - enteredAt < until) raf = requestAnimationFrame(tick)
    }
    raf = requestAnimationFrame(tick)
    return () => cancelAnimationFrame(raf)
  }, [enteredAt, instant, until])

  if (instant) return until
  return Math.min(until, Math.max(0, now - enteredAt))
}

/** 0 → 1 over `duration` ms, starting `delay` ms into the step. */
export function useStepProgress(delay: number, duration: number) {
  const t = useStepTime(delay + duration)
  if (duration <= 0) return t >= delay ? 1 : 0
  return Math.min(1, Math.max(0, (t - delay) / duration))
}
