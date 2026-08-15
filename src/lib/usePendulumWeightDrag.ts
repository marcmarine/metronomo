import type React from "react";
import { useCallback, useMemo, useRef, useState } from "react";

export type DragMode = "vertical" | "horizontal" | "both" | null;

type UsePendulumWeightDragParams = {
	tempos: number[];
	setTempo: (tempo: number) => void;

	/**
	 * Called when the user releases a horizontal drag and the metronome should
	 * start playing from the dragged angle.
	 */
	onReleaseToPlay?: (angle: number) => void;

	/**
	 * Called when the user simply clicks/taps the pendulum without dragging.
	 * Works even when `disabled` is true, so playback can be stopped by tapping.
	 */
	onClick?: () => void;

	/** SVG viewBox coordinates of the pendulum pivot. */
	pivotX?: number;
	pivotY?: number;

	/** Maximum angle (in degrees) reachable by dragging the weight sideways. */
	maxDragAngle?: number;

	/**
	 * Minimum absolute angle (in degrees) required to start playback when the
	 * user releases a horizontal drag. Releasing near the center simply resets
	 * the pendulum without starting.
	 */
	minReleaseAngle?: number;

	disabled?: boolean;
};

type DragProps = {
	onPointerDown: (event: React.PointerEvent<SVGElement>) => void;
	onPointerMove: (event: React.PointerEvent<SVGElement>) => void;
	onPointerUp: (event: React.PointerEvent<SVGElement>) => void;
	onPointerCancel: (event: React.PointerEvent<SVGElement>) => void;
};

type UsePendulumWeightDragResult = {
	trackRef: React.RefObject<SVGRectElement | null>;
	dragProps: DragProps;

	/** Whether the user is currently dragging the weight. */
	isDragging: boolean;

	/** Current drag mode: tempo adjustment (vertical) or wind-up (horizontal). */
	dragMode: DragMode;

	/**
	 * Manual pendulum angle in degrees during a horizontal drag.
	 * `null` when not dragging horizontally.
	 */
	manualAngle: number | null;
};

const CLICK_THRESHOLD = 5; // pixels

export function usePendulumWeightDrag({
	tempos,
	setTempo,
	onReleaseToPlay,
	onClick,
	pivotX = 0,
	pivotY = 0,
	maxDragAngle = 15,
	minReleaseAngle = 3,
	disabled = false,
}: UsePendulumWeightDragParams): UsePendulumWeightDragResult {
	const trackRef = useRef<SVGRectElement | null>(null);
	const activePointerIdRef = useRef<number | null>(null);
	const startRef = useRef<{ x: number; y: number } | null>(null);
	const manualAngleRef = useRef<number | null>(null);
	const hasHorizontalDragRef = useRef(false);
	const hasVerticalDragRef = useRef(false);

	const [dragMode, setDragMode] = useState<DragMode>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [manualAngle, setManualAngle] = useState<number | null>(null);

	const getTempoFromClientY = useCallback(
		(clientY: number) => {
			const track = trackRef.current;
			if (!track || tempos.length === 0) return null;

			const rect = track.getBoundingClientRect();
			const clampedY = Math.min(Math.max(clientY, rect.top), rect.bottom);
			const ratio = rect.height <= 0 ? 0 : (clampedY - rect.top) / rect.height;

			const maxIndex = tempos.length - 1;
			const index = Math.min(
				maxIndex,
				Math.max(0, Math.round(ratio * maxIndex)),
			);

			return tempos[index] ?? null;
		},
		[tempos],
	);

	const updateTempoFromPointer = useCallback(
		(clientY: number) => {
			const nextTempo = getTempoFromClientY(clientY);
			if (nextTempo == null) return;
			setTempo(nextTempo);
		},
		[getTempoFromClientY, setTempo],
	);

	const pointerToSvgAngle = useCallback(
		(clientX: number, clientY: number) => {
			const svg = trackRef.current?.ownerSVGElement;
			if (!svg) return null;

			const ctm = svg.getScreenCTM();
			if (!ctm) return null;

			const point = svg.createSVGPoint();
			point.x = clientX;
			point.y = clientY;
			const svgPoint = point.matrixTransform(ctm.inverse());

			const dx = svgPoint.x - pivotX;
			const dy = svgPoint.y - pivotY;

			// The rod points upward from the pivot, so a negative dy means the
			// pointer is above the pivot. We want that to correspond to 0°.
			const angleRad = Math.atan2(dx, -dy);
			const angleDeg = angleRad * (180 / Math.PI);

			return Math.max(-maxDragAngle, Math.min(maxDragAngle, angleDeg));
		},
		[pivotX, pivotY, maxDragAngle],
	);

	const onPointerDown = useCallback(
		(event: React.PointerEvent<SVGElement>) => {
			// Prevent the browser from treating the drag as a page scroll,
			// which on iOS hides the toolbar and shifts fixed/absolute elements.
			event.preventDefault();

			activePointerIdRef.current = event.pointerId;
			startRef.current = { x: event.clientX, y: event.clientY };
			manualAngleRef.current = null;
			hasHorizontalDragRef.current = false;
			hasVerticalDragRef.current = false;
			setDragMode(null);
			setIsDragging(!disabled);
			setManualAngle(null);
			if (!disabled) {
				event.currentTarget.setPointerCapture?.(event.pointerId);
			}
		},
		[disabled],
	);

	const onPointerMove = useCallback(
		(event: React.PointerEvent<SVGElement>) => {
			if (disabled) return;
			if (activePointerIdRef.current !== event.pointerId) return;

			event.preventDefault();

			const start = startRef.current;
			if (!start) return;

			const dx = event.clientX - start.x;
			const dy = event.clientY - start.y;

			// Track both directions so the user can change tempo and wind up
			// at the same time.
			if (Math.abs(dx) > CLICK_THRESHOLD) {
				hasHorizontalDragRef.current = true;
			}
			if (Math.abs(dy) > CLICK_THRESHOLD) {
				hasVerticalDragRef.current = true;
			}

			const nextMode =
				hasHorizontalDragRef.current && hasVerticalDragRef.current
					? "both"
					: hasHorizontalDragRef.current
						? "horizontal"
						: hasVerticalDragRef.current
							? "vertical"
							: null;
			if (nextMode !== dragMode) {
				setDragMode(nextMode);
			}

			updateTempoFromPointer(event.clientY);

			const angle = pointerToSvgAngle(event.clientX, event.clientY);
			if (angle != null) {
				manualAngleRef.current = angle;
				setManualAngle(angle);
			}
		},
		[disabled, dragMode, updateTempoFromPointer, pointerToSvgAngle],
	);

	const clearPointer = useCallback(
		(event: React.PointerEvent<SVGElement>) => {
			if (activePointerIdRef.current !== event.pointerId) return;

			const start = startRef.current;
			const isClick =
				dragMode === null &&
				start != null &&
				Math.abs(event.clientX - start.x) < CLICK_THRESHOLD &&
				Math.abs(event.clientY - start.y) < CLICK_THRESHOLD;

			if (isClick) {
				onClick?.();
			} else if (hasHorizontalDragRef.current) {
				const angle = manualAngleRef.current ?? 0;
				if (Math.abs(angle) >= minReleaseAngle) {
					onReleaseToPlay?.(angle);
				}
			}

			activePointerIdRef.current = null;
			startRef.current = null;
			manualAngleRef.current = null;
			hasHorizontalDragRef.current = false;
			hasVerticalDragRef.current = false;
			setDragMode(null);
			setIsDragging(false);
			setManualAngle(null);
			if (!disabled) {
				event.currentTarget.releasePointerCapture?.(event.pointerId);
			}
		},
		[dragMode, disabled, onClick, onReleaseToPlay],
	);

	const dragProps = useMemo<DragProps>(
		() => ({
			onPointerDown,
			onPointerMove,
			onPointerUp: clearPointer,
			onPointerCancel: clearPointer,
		}),
		[clearPointer, onPointerDown, onPointerMove],
	);

	return {
		trackRef,
		dragProps,
		isDragging,
		dragMode,
		manualAngle,
	};
}

export default usePendulumWeightDrag;
