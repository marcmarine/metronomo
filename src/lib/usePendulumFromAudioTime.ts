import { useEffect, useMemo, useRef, useState } from 'react'

export type PendulumWaveform = 'cosine'

export type UsePendulumFromAudioTimeParams = {
  /**
   * AudioContext used as the single source of truth for time.
   * Must be stable (same instance) while playing.
   */
  audioCtx: AudioContext | null

  /** Whether the pendulum should animate. */
  isPlaying: boolean

  /** Tempo in BPM (beats per minute). */
  tempoBpm: number

  /** Maximum swing angle in degrees (default: 15). */
  maxDegrees?: number

  /**
   * Full swing period in beats.
   * A value of 2 means one full left-right-left cycle spans 2 beats.
   * (This matches your original CSS where the full cycle was 2 * (60/tempo).)
   *
   * Default: 2
   */
  periodBeats?: number

  /**
   * Phase offset in beats for when you want the pendulum to be at 0°.
   *
   * Example: if you want the first 0° crossing to occur half a beat after pressing play,
   * pass `zeroCrossingOffsetBeats: 0.5`.
   *
   * Default: 0.5
   */
  zeroCrossingOffsetBeats?: number

  /**
   * Waveform used for the pendulum.
   * Cosine is smooth and recommended.
   *
   * Default: 'cosine'
   */
  waveform?: PendulumWaveform

  /**
   * If true, calls `audioCtx.resume()` when starting (best-effort).
   * Default: true
   */
  autoResumeAudioContext?: boolean
}

export type UsePendulumFromAudioTimeResult = {
  /**
   * Inline style you can apply to the pendulum element.
   * Includes `transform: rotate(...)` and also sets a CSS variable `--pendulum-angle`.
   */
  pendulumStyle: React.CSSProperties

  /**
   * Absolute AudioContext time when the pendulum is defined to be at 0°.
   * Useful to align the audio scheduler: schedule the first tick at this time and then every beat.
   */
  zeroCrossingTime: number | null
}

/**
 * Drive pendulum animation from AudioContext time.
 *
 * Design goals:
 * - Single clock for audio + visuals => minimal drift.
 * - No DOM querying; returns a React style object.
 * - Exposes a `zeroCrossingTime` so you can lock your audio scheduler to the same phase.
 *
 * Recommended usage:
 * - Call this hook from your `Metronomo` component.
 * - Apply `pendulumStyle` to the `.pendulo` element.
 * - Use `zeroCrossingTime` as `t0` for your metronome scheduler ticks.
 */
export function usePendulumFromAudioTime(
  params: UsePendulumFromAudioTimeParams
): UsePendulumFromAudioTimeResult {
  const {
    audioCtx,
    isPlaying,
    tempoBpm,
    maxDegrees = 15,
    periodBeats = 2,
    zeroCrossingOffsetBeats = 0.5,
    waveform = 'cosine',
    autoResumeAudioContext = true,
  } = params

  const rafRef = useRef<number | null>(null)
  const zeroCrossingRef = useRef<number | null>(null)

  const [angleDeg, setAngleDeg] = useState<number>(0)

  const periodSeconds = useMemo(() => {
    const bpm = Math.max(1, tempoBpm)
    const secondsPerBeat = 60 / bpm
    return secondsPerBeat * periodBeats
  }, [tempoBpm, periodBeats])

  useEffect(() => {
    // stop path
    if (!isPlaying || !audioCtx) {
      zeroCrossingRef.current = null
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
      setAngleDeg(0)
      return
    }

    let cancelled = false

    if (autoResumeAudioContext && audioCtx.state === 'suspended') {
      // best-effort; ignore errors (user gesture requirements etc.)
      audioCtx.resume().catch(() => undefined)
    }

    const bpm = Math.max(1, tempoBpm)
    const secondsPerBeat = 60 / bpm

    // Define a reference AudioContext time at which the pendulum is exactly at 0°.
    // This is the shared phase anchor for visuals and for scheduling ticks.
    const t0 = audioCtx.currentTime + zeroCrossingOffsetBeats * secondsPerBeat
    zeroCrossingRef.current = t0

    const render = () => {
      if (cancelled) return
      const zt = zeroCrossingRef.current
      if (zt == null) return

      const t = audioCtx.currentTime - zt
      const T = periodSeconds || 0.000001

      // Smooth cosine wave.
      // Want angle(t=0) = 0 and increasing initially (towards +maxDegrees).
      // Use sine: sin(0)=0 and derivative cos(0)=+1.
      const normalized = Math.sin((2 * Math.PI * t) / T)

      const angle = normalized * maxDegrees
      setAngleDeg(angle)

      rafRef.current = requestAnimationFrame(render)
    }

    rafRef.current = requestAnimationFrame(render)

    return () => {
      cancelled = true
      if (rafRef.current !== null) {
        cancelAnimationFrame(rafRef.current)
        rafRef.current = null
      }
    }
  }, [
    audioCtx,
    isPlaying,
    tempoBpm,
    maxDegrees,
    periodSeconds,
    waveform,
    zeroCrossingOffsetBeats,
    autoResumeAudioContext,
  ])

  const pendulumStyle = useMemo<React.CSSProperties>(() => {
    const angle = Number.isFinite(angleDeg) ? angleDeg : 0
    return {
      // Ensure CSS animation is not fighting our transforms.
      animation: 'none',
      transform: `rotate(${angle}deg)`,
      // Expose for CSS consumers if desired.
      ['--pendulum-angle' as any]: `${angle}deg`,
      willChange: 'transform',
    }
  }, [angleDeg])

  return {
    pendulumStyle,
    zeroCrossingTime: zeroCrossingRef.current,
  }
}
