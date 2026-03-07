import { useEffect, useMemo, useRef } from 'react'

export type UseWheelTempoOptions = {
  /**
   * Enable/disable wheel handling (useful when a modal is open, etc).
   * Default: true
   */
  enabled?: boolean

  /**
   * Attach the wheel listener to this element.
   * If omitted/null, attaches to window.
   */
  target?: HTMLElement | null

  /**
   * If true, call preventDefault() to stop page scrolling while adjusting tempo.
   * Default: true
   */
  preventScroll?: boolean

  /**
   * How many pixels of wheel movement roughly correspond to "one notch".
   * Lower = more sensitive; higher = less sensitive.
   * Default: 100
   */
  pixelsPerStep?: number

  /**
   * Optional: allow you to ignore wheel events coming from some elements
   * (e.g. if you have sliders/inputs inside the target and don't want wheel there).
   */
  shouldHandleEvent?: (e: WheelEvent) => boolean

  /**
   * Optional fine-control check. Default: Alt/Option OR Shift pressed.
   */
  isFineControl?: (e: WheelEvent) => boolean
}

/**
 * useWheelTempo
 *
 * Converts mouse-wheel / trackpad scroll gestures into tempo changes by calling
 * `increaseTempo` / `decreaseTempo` from your TempoContext.
 *
 * Notes:
 * - Scroll up => increase tempo; scroll down => decrease tempo
 * - Trackpads generate continuous deltas, so we accumulate movement and only
 *   fire whole "steps" once enough pixels have been scrolled.
 * - Holding Alt/Option or Shift triggers fine control (half sensitivity by default).
 */
export function useWheelTempo(params: {
  increaseTempo: () => void
  decreaseTempo: () => void
  options?: UseWheelTempoOptions
}) {
  const { increaseTempo, decreaseTempo, options } = params

  const {
    enabled = true,
    target = null,
    preventScroll = true,
    pixelsPerStep = 100,
    shouldHandleEvent,
    isFineControl = (e: WheelEvent) => e.altKey || e.shiftKey,
  } = options ?? {}

  // Accumulate wheel movement in "step units" so trackpad scrolling feels natural.
  const accumulatorRef = useRef(0)

  // Stable listener options (passive must be false if we call preventDefault()).
  const listenerOptions = useMemo<AddEventListenerOptions>(
    () => ({ passive: !preventScroll }),
    [preventScroll]
  )

  useEffect(() => {
    if (!enabled) return

    const el: HTMLElement | Window = target ?? window

    const onWheel: EventListener = (evt) => {
      // Use the standard EventListener signature, then narrow.
      const e = evt as WheelEvent

      if (shouldHandleEvent && !shouldHandleEvent(e)) return
      if (e.deltaY === 0) return

      if (preventScroll) e.preventDefault()

      // Normalize: scroll up (deltaY < 0) => +tempo; scroll down => -tempo
      const direction = e.deltaY < 0 ? 1 : -1

      // Fine control reduces sensitivity (requires more scrolling per step).
      const fine = isFineControl(e)
      const effectivePixelsPerStep = fine ? pixelsPerStep * 2 : pixelsPerStep

      const stepDelta = Math.abs(e.deltaY) / Math.max(1, effectivePixelsPerStep)
      accumulatorRef.current += stepDelta

      const wholeSteps = Math.floor(accumulatorRef.current)
      if (wholeSteps <= 0) return

      accumulatorRef.current -= wholeSteps

      for (let i = 0; i < wholeSteps; i += 1) {
        if (direction > 0) increaseTempo()
        else decreaseTempo()
      }
    }

    // Cast to EventTarget to satisfy the generic DOM typings for add/removeEventListener.
    ;(el as EventTarget).addEventListener('wheel', onWheel, listenerOptions)

    return () => {
      ;(el as EventTarget).removeEventListener('wheel', onWheel, listenerOptions)
    }
  }, [
    decreaseTempo,
    enabled,
    increaseTempo,
    isFineControl,
    listenerOptions,
    pixelsPerStep,
    preventScroll,
    shouldHandleEvent,
    target,
  ])
}
