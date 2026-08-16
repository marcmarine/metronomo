import { MAX_DEGREES, PERIOD_BEATS } from "./tempo";

export interface ReleasePhase {
  /** Phase offset (radians) fed into sin(wt + phase). */
  phase: number;
  /** Seconds until the pendulum next crosses 0deg from this release. */
  zeroCrossingOffsetSec: number;
}

/**
 * Computes the phase to release the pendulum from `initialAngleDeg` so it
 * swings back toward the centre first — like a real pendulum under gravity
 * — rather than continuing further out before turning back.
 *
 * sin(x) = normalized has two solutions per period; we pick whichever one
 * has the slope pointing back toward 0 at t=0:
 *   - released left  (normalized < 0): asin(normalized) already has the
 *     right slope.
 *   - released right (normalized >= 0): use its mirror, pi - asin(normalized).
 */
export function computeReleasePhase(initialAngleDeg: number, periodSec: number): ReleasePhase {
  const clamped = Math.max(-MAX_DEGREES, Math.min(MAX_DEGREES, initialAngleDeg));
  const normalized = clamped / MAX_DEGREES;
  const asinVal = Math.asin(normalized);

  const phase = normalized >= 0 ? Math.PI - asinVal : asinVal;

  // With the corrected phase above, this is always the short way back to
  // centre — the time until the pendulum next reads 0deg.
  const zeroCrossingOffsetSec = (Math.abs(asinVal) * periodSec) / (2 * Math.PI);

  return { phase, zeroCrossingOffsetSec };
}

export interface PendulumAnimatorOptions {
  getTempoBpm: () => number;
  onFrame: (angleDeg: number) => void;
}

/**
 * Drives the pendulum's visual swing off the AudioContext clock (not
 * setInterval/rAF timing) so it never drifts out of sync with the audio
 * ticks, which are scheduled against that same clock.
 */
export class PendulumAnimator {
  private readonly audioCtx: AudioContext;
  private readonly getTempoBpm: () => number;
  private readonly onFrame: (angleDeg: number) => void;

  private rafId: number | null = null;
  private startTime = 0;
  private phase = 0;
  private running = false;

  constructor(audioCtx: AudioContext, options: PendulumAnimatorOptions) {
    this.audioCtx = audioCtx;
    this.getTempoBpm = options.getTempoBpm;
    this.onFrame = options.onFrame;
  }

  isRunning(): boolean {
    return this.running;
  }

  /**
   * Starts the swing from `initialAngleDeg` (0 = centre) and returns the
   * AudioContext time of the next 0deg crossing, so the caller can align
   * the first audio tick to it.
   */
  start(initialAngleDeg = 0): number {
    const secondsPerBeat = 60 / this.getTempoBpm();
    const periodSec = secondsPerBeat * PERIOD_BEATS;
    const { phase, zeroCrossingOffsetSec } = computeReleasePhase(initialAngleDeg, periodSec);

    this.startTime = this.audioCtx.currentTime;
    this.phase = phase;
    this.running = true;
    this.rafId = requestAnimationFrame(this.loop);

    return this.startTime + zeroCrossingOffsetSec;
  }

  stop(): void {
    this.running = false;
    if (this.rafId != null) {
      cancelAnimationFrame(this.rafId);
      this.rafId = null;
    }
    this.onFrame(0);
  }

  private loop = (): void => {
    if (!this.running) return;

    const secondsPerBeat = 60 / this.getTempoBpm();
    const periodSec = secondsPerBeat * PERIOD_BEATS;
    const t = this.audioCtx.currentTime - this.startTime;
    const angleDeg = Math.sin((2 * Math.PI * t) / periodSec + this.phase) * MAX_DEGREES;

    this.onFrame(angleDeg);
    this.rafId = requestAnimationFrame(this.loop);
  };
}
