/** Available tempos in beats per minute, 40–208 ppm — same scale as a real metronome. */
export const TEMPOS: readonly number[] = [
  40, 44, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 76, 80, 84, 88, 92, 96,
  100, 104, 108, 112, 116, 120, 126, 132, 138, 144, 152, 160, 168, 176, 184,
  192, 200, 208,
];

/** Pivot point the pendulum rotates around, in SVG viewBox coordinates. */
export const PIVOT_X = 999.4;
export const PIVOT_Y = 1091;

/** Vertical range the weight can slide along, in SVG viewBox coordinates. */
export const WEIGHT_TOP = 382.2;
export const WEIGHT_BOTTOM = 803;

export const MAX_DEGREES = 15;
export const PERIOD_BEATS = 2;

/** Weight's y position (viewBox units) for a given tempo index. */
export function weightYForIndex(index: number): number {
  const ratio = index / (TEMPOS.length - 1);
  return WEIGHT_TOP + ratio * (WEIGHT_BOTTOM - WEIGHT_TOP);
}

/** Nearest tempo index for a given weight y position (viewBox units). */
export function tempoIndexForSvgY(y: number): number {
  const clamped = Math.min(Math.max(y, WEIGHT_TOP), WEIGHT_BOTTOM);
  const ratio = (clamped - WEIGHT_TOP) / (WEIGHT_BOTTOM - WEIGHT_TOP);
  return Math.round(ratio * (TEMPOS.length - 1));
}

export function clampTempoIndex(index: number): number {
  return Math.max(0, Math.min(TEMPOS.length - 1, index));
}
