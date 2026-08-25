"use client"

import { useCallback, useEffect, useRef, useState, type RefObject } from "react"

/**
 * The passage every typography demo sets, and the ruler that measures it.
 * Both demos report character counts, so both measure the same text at the
 * same size — a count only means something if it is taken the same way twice.
 */
export const SAMPLE_TEXT =
  "There are always plenty of rivals to our work. We are always falling in love or quarrelling, looking for jobs or fearing to lose them, getting ill and recovering, following public affairs. If we let ourselves, we shall always be waiting for some distraction or other to end before we can really get down to our work. The only people who achieve much are those who want knowledge so badly that they seek it while the conditions are still unfavourable. Favourable conditions never come."

/** Shared by the columns and the rulers that measure them. */
export const PANEL_FONT_SIZE = 15

/** Rough starting guess until the font has loaded and been measured. */
const FALLBACK_CHAR_WIDTH = 7.5

export function clamp(value: number, min: number, max: number) {
  return Math.min(Math.max(value, min), max)
}

export function useElementWidth(ref: RefObject<HTMLElement | null>) {
  const [width, setWidth] = useState(0)

  const read = useCallback(() => {
    const element = ref.current
    if (!element) return
    const next = element.getBoundingClientRect().width
    setWidth((current) => (Math.abs(current - next) > 0.5 ? next : current))
  }, [ref])

  // Read after every render: one column's width feeds the other's max-width,
  // so the pass that follows a state update has to re-measure to settle.
  useEffect(read)

  useEffect(() => {
    const element = ref.current
    if (!element) return
    const observer = new ResizeObserver(read)
    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, read])

  return width
}

/**
 * Measures a single glyph's width from an off-screen sample, so the numbers
 * under each column are real rather than approximated. The average character
 * in running text is about 25% narrower than the zero that CSS means by
 * `1ch` — which is why `max-width: 66ch` does not give you 66 characters.
 */
function useGlyphWidth(
  ref: RefObject<HTMLElement | null>,
  sampleLength: number,
  fallback: number
) {
  const [glyphWidth, setGlyphWidth] = useState(fallback)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const measure = () => {
      const width = element.getBoundingClientRect().width / sampleLength
      if (width > 0) setGlyphWidth(width)
    }

    measure()
    void document.fonts?.ready.then(measure)
  }, [ref, sampleLength])

  return glyphWidth
}

/**
 * The average character width of the sample, plus the hidden element that
 * produced it. Render `ruler` anywhere inside the demo: it is a single
 * unwrapped line, clipped by a zero-sized box so it stays out of the layout.
 */
export function useSampleCharWidth() {
  const rulerRef = useRef<HTMLSpanElement>(null)
  const charWidth = useGlyphWidth(
    rulerRef,
    SAMPLE_TEXT.length,
    FALLBACK_CHAR_WIDTH
  )

  const ruler = (
    <div
      aria-hidden
      className="pointer-events-none absolute h-0 w-0 overflow-hidden"
    >
      <span
        ref={rulerRef}
        style={{ fontSize: PANEL_FONT_SIZE }}
        className="absolute whitespace-pre"
      >
        {SAMPLE_TEXT}
      </span>
    </div>
  )

  return { charWidth, ruler }
}
