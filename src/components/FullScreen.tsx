import { useEffect, useRef } from 'react'
import type { ReactNode } from 'react'

type FullScreenProps = {
  enabled: boolean
  onChange?: (enabled: boolean) => void
  children?: ReactNode
}

/**
 * Fullscreen wrapper built directly on the native Fullscreen API.
 *
 * Drop-in replacement for the discontinued `react-full-screen` package:
 * keeps the same `enabled` / `onChange` props and the `fullscreen` /
 * `fullscreen-enabled` wrapper classes.
 */
function FullScreen({ enabled, onChange, children }: FullScreenProps) {
  const nodeRef = useRef<HTMLDivElement>(null)
  const onChangeRef = useRef(onChange)
  onChangeRef.current = onChange

  // Keep the DOM in sync with the `enabled` prop.
  useEffect(() => {
    const node = nodeRef.current
    if (!node) return

    const isNodeFullscreen = document.fullscreenElement === node
    if (enabled && !isNodeFullscreen) {
      node
        .requestFullscreen()
        .catch(() => {
          // Request rejected (e.g. without user gesture): report back so the
          // state stays consistent with the real fullscreen status.
          onChangeRef.current?.(false)
        })
    } else if (!enabled && isNodeFullscreen) {
      document.exitFullscreen().catch(() => undefined)
    }
  }, [enabled])

  // Track exits triggered outside the component (e.g. pressing Escape).
  useEffect(() => {
    const detect = () => {
      onChangeRef.current?.(document.fullscreenElement === nodeRef.current)
    }
    document.addEventListener('fullscreenchange', detect)
    return () => document.removeEventListener('fullscreenchange', detect)
  }, [])

  return (
    <div
      ref={nodeRef}
      className={enabled ? 'fullscreen fullscreen-enabled' : 'fullscreen'}
      style={enabled ? { height: '100%', width: '100%' } : undefined}
    >
      {children}
    </div>
  )
}

export default FullScreen
