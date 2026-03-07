import { useCallback, useMemo, useRef } from 'react'
import type React from 'react'

type UsePendulumWeightDragParams = {
  tempos: number[]
  setTempo: (tempo: number) => void
  disabled?: boolean
}

type DragProps = {
  onPointerDown: (event: React.PointerEvent<HTMLElement>) => void
  onPointerMove: (event: React.PointerEvent<HTMLElement>) => void
  onPointerUp: (event: React.PointerEvent<HTMLElement>) => void
  onPointerCancel: (event: React.PointerEvent<HTMLElement>) => void
}

type UsePendulumWeightDragResult = {
  trackRef: React.RefObject<HTMLLabelElement>
  dragProps: DragProps
}

export function usePendulumWeightDrag({
  tempos,
  setTempo,
  disabled = false,
}: UsePendulumWeightDragParams): UsePendulumWeightDragResult {
  const trackRef = useRef<HTMLLabelElement | null>(null)
  const activePointerIdRef = useRef<number | null>(null)

  const getTempoFromClientY = useCallback(
    (clientY: number) => {
      const track = trackRef.current
      if (!track || tempos.length === 0) return null

      const rect = track.getBoundingClientRect()
      const clampedY = Math.min(Math.max(clientY, rect.top), rect.bottom)
      const ratio = rect.height <= 0 ? 0 : (clampedY - rect.top) / rect.height

      const maxIndex = tempos.length - 1
      const index = Math.min(maxIndex, Math.max(0, Math.round(ratio * maxIndex)))

      return tempos[index] ?? null
    },
    [tempos]
  )

  const updateTempoFromPointer = useCallback(
    (clientY: number) => {
      const nextTempo = getTempoFromClientY(clientY)
      if (nextTempo == null) return
      setTempo(nextTempo)
    },
    [getTempoFromClientY, setTempo]
  )

  const onPointerDown = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled) return

      activePointerIdRef.current = event.pointerId
      event.currentTarget.setPointerCapture?.(event.pointerId)
    },
    [disabled, updateTempoFromPointer]
  )

  const onPointerMove = useCallback(
    (event: React.PointerEvent<HTMLElement>) => {
      if (disabled) return
      if (activePointerIdRef.current !== event.pointerId) return

      updateTempoFromPointer(event.clientY)
    },
    [disabled, updateTempoFromPointer]
  )

  const clearPointer = useCallback((event: React.PointerEvent<HTMLElement>) => {
    if (activePointerIdRef.current !== event.pointerId) return

    activePointerIdRef.current = null
    event.currentTarget.releasePointerCapture?.(event.pointerId)
  }, [])

  const dragProps = useMemo<DragProps>(
    () => ({
      onPointerDown,
      onPointerMove,
      onPointerUp: clearPointer,
      onPointerCancel: clearPointer,
    }),
    [clearPointer, onPointerDown, onPointerMove]
  )

  return {
    trackRef,
    dragProps,
  }
}

export default usePendulumWeightDrag
