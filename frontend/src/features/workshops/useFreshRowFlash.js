import { useEffect, useState } from 'react'

export const FRESH_HOLD_MS = 3000
export const FRESH_FADE_MS = 2000
export const FRESH_COLOR = '#ede9fe'
export const FRESH_ACCENT = '#c4b5fd'

export function useFreshRowFlash() {
  const [flashGen, setFlashGen] = useState(0)
  const [highlightFading, setHighlightFading] = useState(false)

  useEffect(() => {
    if (!flashGen) return

    setHighlightFading(false)
    const fadeTimer = window.setTimeout(() => setHighlightFading(true), FRESH_HOLD_MS)
    const clearTimer = window.setTimeout(() => {
      setFlashGen(0)
      setHighlightFading(false)
    }, FRESH_HOLD_MS + FRESH_FADE_MS)

    return () => {
      window.clearTimeout(fadeTimer)
      window.clearTimeout(clearTimer)
    }
  }, [flashGen])

  function triggerFlash() {
    setFlashGen((current) => current + 1)
  }

  function freshStyle(isFresh, isFirstCell = false) {
    if (!isFresh) return undefined
    return {
      backgroundColor: highlightFading ? '#ffffff' : FRESH_COLOR,
      boxShadow: isFirstCell && !highlightFading ? `inset 3px 0 0 ${FRESH_ACCENT}` : 'none',
      transition: highlightFading
        ? `background-color ${FRESH_FADE_MS}ms ease-out, box-shadow ${FRESH_FADE_MS}ms ease-out`
        : 'none',
    }
  }

  return {
    isFlashing: flashGen > 0,
    triggerFlash,
    freshStyle,
  }
}
