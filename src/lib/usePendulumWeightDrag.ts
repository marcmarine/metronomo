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

	/** SVG viewBox y-coordinate of the top of the weight's vertical range. */
	weightTop?: number;

	/** SVG viewBox y-coordinate of the bottom of the weight's vertical range. */
	weightBottom?: number;

	/** SVG viewBox y-coordinate of the weight's current position. */
	weightY?: number;

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
	weightTop = 0,
	weightBottom = 100,
	weightY = 50,
	disabled = false,
}: UsePendulumWeightDragParams): UsePendulumWeightDragResult {
	const trackRef = useRef<SVGRectElement | null>(null);
	const activePointerIdRef = useRef<number | null>(null);
	const startRef = useRef<{ x: number; y: number } | null>(null);
	const manualAngleRef = useRef<number | null>(null);
	const startClientYRef = useRef<number>(0);
	const startWeightYRef = useRef<number>(weightY);
	const hasHorizontalDragRef = useRef(false);
	const hasVerticalDragRef = useRef(false);

	const [dragMode, setDragMode] = useState<DragMode>(null);
	const [isDragging, setIsDragging] = useState(false);
	const [manualAngle, setManualAngle] = useState<number | null>(null);

	const parseViewBox = useCallback((svg: SVGSVGElement): { x: number; y: number; width: number; height: number } | null => {
		const value = svg.getAttribute("viewBox");
		if (!value) return null;
		const parts = value.trim().split(/\s+/).map(Number);
		if (parts.length !== 4 || parts.some(Number.isNaN)) return null;
		const [x, y, width, height] = parts as [number, number, number, number];
		return { x, y, width, height };
	}, []);

	const clientToSvgPoint = useCallback(
		(clientX: number, clientY: number) => {
			const svg = trackRef.current?.ownerSVGElement;
			if (!svg) return null;

			const rect = svg.getBoundingClientRect();
			const vb = parseViewBox(svg);
			if (!vb) return null;
			const { x, y, width, height } = vb;
			if (width <= 0 || height <= 0) return null;

			// The SVG is rendered with preserveAspectRatio="xMidYMid meet" by default.
			const scale = Math.min(rect.width / width, rect.height / height);
			const actualWidth = width * scale;
			const actualHeight = height * scale;
			const offsetX = rect.left + (rect.width - actualWidth) / 2;
			const offsetY = rect.top + (rect.height - actualHeight) / 2;

			return {
				x: x + (clientX - offsetX) / scale,
				y: y + (clientY - offsetY) / scale,
			};
		},
		[parseViewBox],
	);

	const getTempoFromY = useCallback(
		(y: number) => {
			if (tempos.length === 0) return null;

			const clampedY = Math.min(Math.max(y, weightTop), weightBottom);
			const ratio =
				weightBottom - weightTop <= 0
					? 0
					: (clampedY - weightTop) / (weightBottom - weightTop);

			const maxIndex = tempos.length - 1;
			const index = Math.min(
				maxIndex,
				Math.max(0, Math.round(ratio * maxIndex)),
			);

			return tempos[index] ?? null;
		},
		[tempos, weightTop, weightBottom],
	);

	const updateTempoFromClientY = useCallback(
		(clientY: number) => {
			const svgPoint = clientToSvgPoint(0, clientY);
			if (!svgPoint) return;

			// Keep the same vertical offset relative to the pointer that existed
			// when the drag started, so the weight does not snap to the cursor.
			const deltaY = svgPoint.y - startClientYRef.current;
			const adjustedY = startWeightYRef.current + deltaY;
			const nextTempo = getTempoFromY(adjustedY);
			if (nextTempo == null) return;
			setTempo(nextTempo);
		},
		[clientToSvgPoint, getTempoFromY, setTempo],
	);

	const pointerToSvgAngle = useCallback(
		(clientX: number, clientY: number) => {
			const svgPoint = clientToSvgPoint(clientX, clientY);
			if (!svgPoint) return null;

			const dx = svgPoint.x - pivotX;
			const dy = svgPoint.y - pivotY;

			// The rod points upward from the pivot, so a negative dy means the
			// pointer is above the pivot. We want that to correspond to 0°.
			const angleRad = Math.atan2(dx, -dy);
			const angleDeg = angleRad * (180 / Math.PI);

			return Math.max(-maxDragAngle, Math.min(maxDragAngle, angleDeg));
		},
		[clientToSvgPoint, pivotX, pivotY, maxDragAngle],
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

			// Store the initial vertical position of the pointer and the weight
			// so dragging does not snap the weight to the cursor position.
			const pointerPoint = clientToSvgPoint(event.clientX, event.clientY);
			startClientYRef.current = pointerPoint?.y ?? 0;
			startWeightYRef.current = weightY;
			setIsDragging(!disabled);
			setManualAngle(null);
			if (!disabled) {
				event.currentTarget.setPointerCapture?.(event.pointerId);
			}
		},
		[disabled, weightY, clientToSvgPoint],
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

			updateTempoFromClientY(event.clientY);

			const angle = pointerToSvgAngle(event.clientX, event.clientY);
			if (angle != null) {
				manualAngleRef.current = angle;
				setManualAngle(angle);
			}
		},
		[disabled, dragMode, updateTempoFromClientY, pointerToSvgAngle],
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
			startWeightYRef.current = weightY;
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
