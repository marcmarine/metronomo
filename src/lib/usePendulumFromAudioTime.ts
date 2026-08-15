import { useEffect, useMemo, useRef, useState } from "react";

export type UsePendulumFromAudioTimeParams = {
	/**
	 * AudioContext used as the single source of truth for time.
	 * Must be stable (same instance) while playing.
	 */
	audioCtx: AudioContext | null;

	/** Whether the pendulum should animate. */
	isPlaying: boolean;

	/** Tempo in BPM (beats per minute). */
	tempoBpm: number;

	/** Maximum swing angle in degrees (default: 15). */
	maxDegrees?: number;

	/**
	 * Full swing period in beats.
	 * A value of 2 means one full left-right-left cycle spans 2 beats.
	 * (This matches your original CSS where the full cycle was 2 * (60/tempo).)
	 *
	 * Default: 2
	 */
	periodBeats?: number;

	/**
	 * Phase offset in beats for when you want the pendulum to be at 0°.
	 *
	 * Example: if you want the first 0° crossing to occur half a beat after pressing play,
	 * pass `zeroCrossingOffsetBeats: 0.5`.
	 *
	 * Default: 0.5
	 */
	zeroCrossingOffsetBeats?: number;

	/**
	 * If true, calls `audioCtx.resume()` when starting (best-effort).
	 * Default: true
	 */
	autoResumeAudioContext?: boolean;

	/**
	 * Initial angle in degrees for the first swing after starting.
	 * Useful for a "wind-up" gesture where the pendulum is released from a
	 * dragged position. The animation will begin at this angle and keep the
	 * same phase. Default: 0.
	 */
	initialAngle?: number;
};

export type UsePendulumFromAudioTimeResult = {
	/**
	 * Inline style you can apply to the pendulum element.
	 * Includes `transform: rotate(...)` and also sets a CSS variable `--pendulum-angle`.
	 */
	pendulumStyle: React.CSSProperties;

	/**
	 * Current pendulum angle in degrees.
	 * Use this to build an SVG `transform="rotate(angle cx cy)"` when the pendulum
	 * lives inside an `<svg>` (where CSS `transform-origin` is less reliable).
	 */
	angleDeg: number;

	/**
	 * Absolute AudioContext time when the pendulum is defined to be at 0°.
	 * Useful to align your audio scheduler: schedule the first tick at this time and then every beat.
	 */
	zeroCrossingTime: number | null;
};

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
	params: UsePendulumFromAudioTimeParams,
): UsePendulumFromAudioTimeResult {
	const {
		audioCtx,
		isPlaying,
		tempoBpm,
		maxDegrees = 15,
		periodBeats = 2,
		zeroCrossingOffsetBeats = 0.5,
		autoResumeAudioContext = true,
		initialAngle = 0,
	} = params;

	const rafRef = useRef<number | null>(null);
	const startTimeRef = useRef<number | null>(null);
	const zeroCrossingRef = useRef<number | null>(null);

	const [angleDeg, setAngleDeg] = useState<number>(0);

	const periodSeconds = useMemo(() => {
		const bpm = Math.max(1, tempoBpm);
		const secondsPerBeat = 60 / bpm;
		return secondsPerBeat * periodBeats;
	}, [tempoBpm, periodBeats]);

	useEffect(() => {
		// stop path
		if (!isPlaying || !audioCtx) {
			zeroCrossingRef.current = null;
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
			setAngleDeg(0);
			return;
		}

		let cancelled = false;

		if (autoResumeAudioContext && audioCtx.state === "suspended") {
			// best-effort; ignore errors (user gesture requirements etc.)
			audioCtx.resume().catch(() => undefined);
		}

		const bpm = Math.max(1, tempoBpm);
		const secondsPerBeat = 60 / bpm;
		const T = periodSeconds || 0.000001;

		// Wind-up support: if the pendulum is released from a dragged angle,
		// start the visual animation immediately from that angle. The audio zero
		// crossing is aligned with the next time the pendulum naturally returns
		// to 0°.
		const clampedInitialAngle = Math.max(
			-maxDegrees,
			Math.min(maxDegrees, initialAngle),
		);
		const normalizedInitial = clampedInitialAngle / maxDegrees;
		const phase = Math.asin(normalizedInitial);

		// Time until the pendulum next crosses 0° (centre), used to align audio.
		// For a positive angle it goes right -> left, crossing at π.
		// For a negative angle it goes left -> right, crossing at 0.
		const zeroCrossingPhase = normalizedInitial >= 0 ? Math.PI : 0;
		const zeroCrossingOffsetSec =
			((zeroCrossingPhase - phase) * T) / (2 * Math.PI);

		// Start visual animation from the current audio time so the pendulum
		// begins exactly at the dragged angle without jumping to the opposite side.
		const startTime = audioCtx.currentTime;
		startTimeRef.current = startTime;

		// Audio zero-crossing reference is slightly later, so the first tick
		// lines up with the pendulum passing through the centre.
		zeroCrossingRef.current =
			startTime +
			zeroCrossingOffsetBeats * secondsPerBeat +
			zeroCrossingOffsetSec;

		const render = () => {
			if (cancelled) return;
			const st = startTimeRef.current;
			if (st == null) return;

			const t = audioCtx.currentTime - st;

			// Smooth sine wave starting at the wind-up angle.
			const normalized = Math.sin((2 * Math.PI * t) / T + phase);

			const angle = normalized * maxDegrees;
			setAngleDeg(angle);

			rafRef.current = requestAnimationFrame(render);
		};

		rafRef.current = requestAnimationFrame(render);

		return () => {
			cancelled = true;
			if (rafRef.current !== null) {
				cancelAnimationFrame(rafRef.current);
				rafRef.current = null;
			}
		};
	}, [
		audioCtx,
		isPlaying,
		tempoBpm,
		maxDegrees,
		periodSeconds,
		zeroCrossingOffsetBeats,
		autoResumeAudioContext,
		initialAngle,
	]);

	const pendulumStyle = useMemo<React.CSSProperties>(() => {
		const angle = Number.isFinite(angleDeg) ? angleDeg : 0;
		return {
			// Ensure CSS animation is not fighting our transforms.
			animation: "none",
			transform: `rotate(${angle}deg)`,
			// Expose for CSS consumers if desired.
			["--pendulum-angle" as any]: `${angle}deg`,
			willChange: "transform",
		};
	}, [angleDeg]);

	return {
		pendulumStyle,
		angleDeg,
		zeroCrossingTime: zeroCrossingRef.current,
	};
}
