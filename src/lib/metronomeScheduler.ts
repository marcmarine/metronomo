/// <reference lib="dom" />

import { ensureAudioRunning, playSampleAt } from './audioSample'

/**
 * A lightweight metronome scheduler driven by the AudioContext clock.
 *
 * Why:
 * - Scheduling via `AudioContext.currentTime` + `AudioBufferSourceNode.start(when)`
 *   provides much tighter timing than "play immediately" in JS.
 * - This module keeps scheduling logic out of React components.
 *
 * Concepts:
 * - "Beat" is the time between ticks: secondsPerBeat = 60 / tempoBpm
 * - We schedule ticks ahead in a rolling window to tolerate JS jitter.
 * - `t0` is the absolute AudioContext time of the *first* tick (typically aligned to some visual phase).
 */

export type MetronomeSchedulerOptions = {
  /** How frequently to run the scheduler loop (ms). Lower = more CPU, higher = more jitter. */
  lookaheadMs?: number
  /** How far ahead to schedule audio (sec). Higher = more stable, but less responsive to tempo changes. */
  scheduleAheadTimeSec?: number
  /** Optional gain for the tick sound. 1.0 is default. */
  gain?: number
}

export type MetronomeSchedulerState = {
  /** Next tick time in AudioContext time. */
  nextTickTime: number
  /** Current tempo at the time scheduling ran (BPM). */
  tempoBpm: number
  /** Seconds per beat derived from tempo. */
  secondsPerBeat: number
  /** Whether the scheduler is currently running. */
  running: boolean
}

export type MetronomeSchedulerCallbacks = {
  /**
   * Called when a tick is scheduled.
   *
   * Note: this is called when we *schedule* the tick, not when it *plays*.
   * If you want visuals aligned to audio, drive them from the same `t0` and `audioCtx.currentTime`.
   */
  onTickScheduled?: (info: { when: number; index: number }) => void
  /** Called when the scheduler starts. */
  onStart?: (info: { t0: number }) => void
  /** Called when the scheduler stops. */
  onStop?: () => void
}

/**
 * Scheduler instance.
 *
 * Usage (typical):
 * - Construct with an AudioContext and a decoded AudioBuffer tick sample.
 * - Call `start({ tempoBpm, t0 })`.
 * - Call `setTempo(bpm)` as the UI changes tempo.
 * - Call `stop()` to stop scheduling further ticks.
 */
export class MetronomeScheduler {
  private readonly ctx: AudioContext
  private buffer: AudioBuffer | null

  private readonly lookaheadMs: number
  private readonly scheduleAheadTimeSec: number
  private readonly gain?: number

  private readonly cb: MetronomeSchedulerCallbacks

  private timerId: number | null = null
  private running = false

  private tempoBpm = 60
  private nextTickTime = 0
  private tickIndex = 0

  constructor(
    ctx: AudioContext,
    tickBuffer: AudioBuffer | null,
    opts?: MetronomeSchedulerOptions,
    callbacks?: MetronomeSchedulerCallbacks
  ) {
    this.ctx = ctx
    this.buffer = tickBuffer

    this.lookaheadMs = opts?.lookaheadMs ?? 25
    this.scheduleAheadTimeSec = opts?.scheduleAheadTimeSec ?? 0.2
    this.gain = opts?.gain

    this.cb = callbacks ?? {}
  }

  /**
   * Replace the tick buffer (e.g. after preload finishes).
   */
  setBuffer(buffer: AudioBuffer | null) {
    this.buffer = buffer
  }

  /**
   * Update tempo. Takes effect immediately for ticks not yet scheduled.
   *
   * Note: Already-scheduled ticks cannot be "unscheduled" (that’s how WebAudio works).
   * If you need instant tempo response, keep scheduleAheadTimeSec smaller (e.g. 0.1).
   */
  setTempo(tempoBpm: number) {
    this.tempoBpm = Math.max(1, tempoBpm)
  }

  /**
   * Start scheduling ticks.
   *
   * - `tempoBpm`: tempo to run at.
   * - `t0` (optional): absolute AudioContext time for the first tick.
   *   If omitted, starts at `ctx.currentTime` (soon).
   */
  async start(params: { tempoBpm: number; t0?: number }) {
    if (this.running) return
    if (this.ctx.state === 'closed') return

    this.running = true
    this.setTempo(params.tempoBpm)

    await ensureAudioRunning(this.ctx)

    const now = this.ctx.currentTime
    const t0 = params.t0 ?? now

    // Ensure we don't schedule in the past; if caller passed a stale t0, clamp to now.
    this.nextTickTime = Math.max(t0, now)
    this.tickIndex = 0

    this.cb.onStart?.({ t0: this.nextTickTime })

    this.loop()
  }

  /**
   * Stop scheduling future ticks. Already scheduled ticks (within the audio graph)
   * may still play if they are very close; keep scheduleAheadTimeSec small for responsiveness.
   */
  stop() {
    if (!this.running) return
    this.running = false

    if (this.timerId != null) {
      window.clearTimeout(this.timerId)
      this.timerId = null
    }

    this.cb.onStop?.()
  }

  getState(): MetronomeSchedulerState {
    const secondsPerBeat = 60 / this.tempoBpm
    return {
      nextTickTime: this.nextTickTime,
      tempoBpm: this.tempoBpm,
      secondsPerBeat,
      running: this.running,
    }
  }

  /**
   * Compute seconds-per-beat from current tempo.
   */
  private secondsPerBeat(): number {
    return 60.0 / this.tempoBpm
  }

  /**
   * Main scheduling loop.
   */
  private loop() {
    if (!this.running) return

    const now = this.ctx.currentTime
    const spb = this.secondsPerBeat()

    // Schedule ticks until we are sufficiently far ahead of "now".
    while (this.nextTickTime < now + this.scheduleAheadTimeSec) {
      const when = this.nextTickTime

      if (this.buffer) {
        playSampleAt(this.ctx, this.buffer, when, { gain: this.gain })
      }

      this.cb.onTickScheduled?.({ when, index: this.tickIndex })

      this.tickIndex += 1
      this.nextTickTime += spb
    }

    this.timerId = window.setTimeout(() => this.loop(), this.lookaheadMs)
  }
}
