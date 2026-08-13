import { useEffect, useMemo, useRef, useState } from 'react'
import type React from 'react'
import { getAudioContext, loadSample } from './audioSample'
import { MetronomeScheduler } from './metronomeScheduler'
import type { MetronomeSchedulerOptions } from './metronomeScheduler'
import { usePendulumFromAudioTime } from './usePendulumFromAudioTime'
import type { UsePendulumFromAudioTimeParams } from './usePendulumFromAudioTime'

const DEFAULT_TICK_SAMPLE_URL = 'audio/tap.wav'

export type UseMetronomeEngineParams = {
  /** Current tempo in BPM. */
  tempo: number
  /** All available tempos; used to derive the weight position. */
  tempos: number[]
  /** Whether the metronome should play. */
  isPlaying: boolean
  /** URL of the tick sample (default: 'audio/tap.wav'). */
  tickSampleUrl?: string
  /** Overrides for the pendulum animation parameters. */
  pendulumOptions?: Partial<UsePendulumFromAudioTimeParams>
  /** Overrides for the scheduler timing options. */
  schedulerOptions?: MetronomeSchedulerOptions
}

export type UseMetronomeEngineResult = {
  /** Inline style to apply to the pendulum element. */
  pendulumStyle: React.CSSProperties
  /** CSS `top` value for the weight (e.g. "72%"). */
  weightPosition: string
  /** True once the tick sample is loaded & decoded. */
  audioReady: boolean
}

/**
 * Audio + animation engine for the metronome.
 *
 * Owns everything time-related so the component only renders:
 * - A stable AudioContext for the lifetime of the hook.
 * - Preloading & decoding of the tick sample.
 * - The pendulum animation (driven from the AudioContext clock).
 * - A `MetronomeScheduler` instance: creation, start/stop, tempo and buffer updates.
 *
 * The pendulum and the scheduler are phase-locked through the same
 * `zeroCrossingTime` anchor.
 */
export function useMetronomeEngine({
  tempo,
  tempos,
  isPlaying,
  tickSampleUrl = DEFAULT_TICK_SAMPLE_URL,
  pendulumOptions = {},
  schedulerOptions = {},
}: UseMetronomeEngineParams): UseMetronomeEngineResult {
  /**
   * Keep a stable AudioContext instance for the lifetime of this hook.
   * (Do not recreate it per render.)
   */
  const audioCtxRef = useRef<AudioContext | null>(null)
  if (!audioCtxRef.current) {
    audioCtxRef.current = getAudioContext()
  }
  const audioCtx = audioCtxRef.current

  /**
   * Preload & decode the tick sample once per AudioContext.
   * NOTE: This is async; the decoded buffer is stored in state once resolved.
   */
  const [tickBuffer, setTickBuffer] = useState<AudioBuffer | null>(null)
  useEffect(() => {
    if (!audioCtx) return

    let cancelled = false

    loadSample(audioCtx, tickSampleUrl)
      .then((buf) => {
        if (cancelled) return
        setTickBuffer(buf)
      })
      .catch(() => {
        // keep silent; scheduling will just no-op until buffer is available
        // (you can add UI feedback if desired)
      })

    return () => {
      cancelled = true
    }
  }, [audioCtx, tickSampleUrl])

  /**
   * Visual pendulum driven from the AudioContext clock.
   * Zero crossing is the shared phase anchor between visuals and ticks.
   */
  const { pendulumStyle, zeroCrossingTime } = usePendulumFromAudioTime({
    audioCtx,
    isPlaying,
    tempoBpm: tempo,
    maxDegrees: 15,
    periodBeats: 2,
    // Schedule the first 0° crossing half a beat after starting.
    // We will align the first tick to this same instant.
    zeroCrossingOffsetBeats: 0.45,
    autoResumeAudioContext: true,
    ...pendulumOptions,
  })

  /**
   * Audio scheduler instance, isolated from React rendering.
   * We keep it in a ref and only start/stop/update it via effects.
   */
  const schedulerRef = useRef<MetronomeScheduler | null>(null)

  /**
   * Read scheduler options through a ref: callers often pass inline objects
   * (literals are new on every render), and putting them in the effect deps
   * would destroy & recreate the scheduler on each render (silencing it,
   * since the start/stop effect would not re-fire).
   * Options are only consumed at scheduler creation time.
   */
  const schedulerOptionsRef = useRef(schedulerOptions)
  schedulerOptionsRef.current = schedulerOptions

  // Create the scheduler once we have an AudioContext.
  // The tick buffer is pushed later via the effect below, once loaded.
  useEffect(() => {
    if (!audioCtx) return

    if (!schedulerRef.current) {
      schedulerRef.current = new MetronomeScheduler(audioCtx, null, {
        lookaheadMs: 25,
        scheduleAheadTimeSec: 0.2,
        gain: 1,
        ...schedulerOptionsRef.current,
      })
    }

    return () => {
      // Stop on unmount
      schedulerRef.current?.stop()
      schedulerRef.current = null
    }
  }, [audioCtx])

  // Keep scheduler buffer up to date when the sample finishes loading.
  useEffect(() => {
    schedulerRef.current?.setBuffer(tickBuffer)
  }, [tickBuffer])

  // Start/stop and tempo updates.
  useEffect(() => {
    const s = schedulerRef.current
    if (!audioCtx || !s) return

    if (!isPlaying) {
      s.stop()
      return
    }

    // Ensure the scheduler tempo is up to date.
    s.setTempo(tempo)

    // Align the first tick to the pendulum's 0° reference time if available.
    // If not available yet (first render), fall back to a computed half-beat offset.
    const secondsPerBeat = 60 / Math.max(1, tempo)
    const fallbackT0 = audioCtx.currentTime + 0.5 * secondsPerBeat

    const t0 = zeroCrossingTime ?? fallbackT0

    // Start (no-op if already running). If already running, we don't want to reset t0,
    // otherwise you’ll hear a phase jump. So only start if not running.
    if (!s.getState().running) {
      void s.start({ tempoBpm: tempo, t0 })
    }

    // No cleanup here: stop is handled when isPlaying becomes false.
    // This avoids cutting off playback on tempo adjustments.
  }, [audioCtx, isPlaying, tempo, zeroCrossingTime])

  const weightPosition = useMemo(() => {
    return `${(tempos.indexOf(tempo) / (tempos.length - 1)) * 100}%`
  }, [tempos, tempo])

  return {
    pendulumStyle,
    weightPosition,
    audioReady: tickBuffer !== null,
  }
}
