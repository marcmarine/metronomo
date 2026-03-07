import { useEffect, useMemo, useRef } from 'react'

export type KeyboardControlsOptions = {
  /**
   * If true, Space/Arrow keys won't scroll the page when handled.
   * Default: true
   */
  preventDefault?: boolean

  /**
   * If true, ignore key events when the user is typing in an input/textarea/select
   * or any element marked contenteditable.
   * Default: true
   */
  ignoreWhenTyping?: boolean

  /**
   * If true, only handle shortcuts when the event target is within this element.
   * If omitted, shortcuts are global (window).
   */
  scopeElement?: HTMLElement | null
}

export type KeyboardControlsActions = {
  /** Increase tempo (e.g., ArrowUp/ArrowRight) */
  increaseTempo: () => void
  /** Decrease tempo (e.g., ArrowDown/ArrowLeft) */
  decreaseTempo: () => void
  /** Toggle play/stop (Space) */
  togglePlay: () => void
  /** Toggle fullscreen (F) */
  toggleFullScreen: () => void
}

/**
 * Global keyboard controls hook:
 * - Arrows: tempo up/down
 * - Space: play/stop
 * - F: fullscreen
 *
 * Notes:
 * - Uses `keydown` (not keyup) to reduce perceived latency.
 * - Ignores repeats (holding a key) by default behavior (we check `event.repeat`).
 * - Avoids interfering with typing in form fields/contenteditable by default.
 */
export function useKeyboardControls(
  actions: KeyboardControlsActions,
  options?: KeyboardControlsOptions
) {
  const opts = useMemo(
    () => ({
      preventDefault: options?.preventDefault ?? true,
      ignoreWhenTyping: options?.ignoreWhenTyping ?? true,
      scopeElement: options?.scopeElement ?? null,
    }),
    [options?.preventDefault, options?.ignoreWhenTyping, options?.scopeElement]
  )

  // Keep latest actions without re-registering the listener on every render.
  const actionsRef = useRef(actions)
  actionsRef.current = actions

  useEffect(() => {
    const shouldIgnoreTarget = (target: EventTarget | null) => {
      if (!opts.ignoreWhenTyping) return false
      const el = target as HTMLElement | null
      if (!el) return false

      const tag = el.tagName?.toLowerCase()
      if (tag === 'input' || tag === 'textarea' || tag === 'select') return true

      // contenteditable (either on the node or inherited)
      if (el.isContentEditable) return true

      return false
    }

    const isInScope = (target: EventTarget | null) => {
      if (!opts.scopeElement) return true
      const el = target as Node | null
      return !!el && opts.scopeElement.contains(el)
    }

    const handler = (event: KeyboardEvent) => {
      // Don’t trigger while user is typing
      if (shouldIgnoreTarget(event.target)) return
      if (!isInScope(event.target)) return

      // Avoid OS/browser autorepeat for toggles and prevent runaway tempo changes.
      if (event.repeat) return

      const key = event.key

      // Tempo controls
      if (key === 'ArrowUp' || key === 'ArrowRight') {
        if (opts.preventDefault) event.preventDefault()
        actionsRef.current.increaseTempo()
        return
      }
      if (key === 'ArrowDown' || key === 'ArrowLeft') {
        if (opts.preventDefault) event.preventDefault()
        actionsRef.current.decreaseTempo()
        return
      }

      // Play/stop (Space)
      if (key === ' ' || key === 'Spacebar' || event.code === 'Space') {
        if (opts.preventDefault) event.preventDefault()
        actionsRef.current.togglePlay()
        return
      }

      // Fullscreen (F)
      if (key === 'f' || key === 'F') {
        if (opts.preventDefault) event.preventDefault()
        actionsRef.current.toggleFullScreen()
        return
      }
    }

    window.addEventListener('keydown', handler, { passive: false })

    return () => {
      window.removeEventListener('keydown', handler as EventListener)
    }
  }, [opts.ignoreWhenTyping, opts.preventDefault, opts.scopeElement])
}
