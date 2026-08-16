import { playSampleAt } from "./audio";

export interface SchedulerOptions {
  /** How often the scheduling loop wakes up, in ms. */
  lookaheadMs?: number;
  /** How far ahead of "now" ticks get queued, in seconds. */
  scheduleAheadTimeSec?: number;
}

export interface SchedulerStartOptions {
  tempoBpm: number;
  /** AudioContext time of the first tick. Defaults to "now". */
  t0?: number;
}

/**
 * Schedules audio ticks ahead of AudioContext time in a rolling window,
 * tolerant of setTimeout/rAF jitter — the classic Web Audio "lookahead
 * scheduler" pattern (see: Chris Wilkinson, "A Tale of Two Clocks").
 */
export class MetronomeScheduler {
  private readonly ctx: AudioContext;
  private readonly buffer: AudioBuffer;
  private readonly lookaheadMs: number;
  private readonly scheduleAheadTimeSec: number;

  private timerId: ReturnType<typeof setTimeout> | null = null;
  private running = false;
  private tempoBpm = 60;
  private nextTickTime = 0;

  constructor(ctx: AudioContext, buffer: AudioBuffer, opts: SchedulerOptions = {}) {
    this.ctx = ctx;
    this.buffer = buffer;
    this.lookaheadMs = opts.lookaheadMs ?? 25;
    this.scheduleAheadTimeSec = opts.scheduleAheadTimeSec ?? 0.2;
  }

  setTempo(bpm: number): void {
    this.tempoBpm = Math.max(1, bpm);
  }

  start({ tempoBpm, t0 }: SchedulerStartOptions): void {
    if (this.running) return;
    this.running = true;
    this.setTempo(tempoBpm);
    const now = this.ctx.currentTime;
    this.nextTickTime = Math.max(t0 ?? now, now);
    this.loop();
  }

  stop(): void {
    this.running = false;
    if (this.timerId != null) {
      clearTimeout(this.timerId);
      this.timerId = null;
    }
  }

  private loop(): void {
    if (!this.running) return;

    const now = this.ctx.currentTime;
    const secondsPerBeat = 60 / this.tempoBpm;

    while (this.nextTickTime < now + this.scheduleAheadTimeSec) {
      playSampleAt(this.ctx, this.buffer, this.nextTickTime);
      this.nextTickTime += secondsPerBeat;
    }

    this.timerId = setTimeout(() => this.loop(), this.lookaheadMs);
  }
}
