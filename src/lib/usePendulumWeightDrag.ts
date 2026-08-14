import type React from "react";
import { useCallback, useMemo, useRef } from "react";

type UsePendulumWeightDragParams = {
	tempos: number[];
	setTempo: (tempo: number) => void;
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
};

export function usePendulumWeightDrag({
	tempos,
	setTempo,
	disabled = false,
}: UsePendulumWeightDragParams): UsePendulumWeightDragResult {
	const trackRef = useRef<SVGRectElement | null>(null);
	const activePointerIdRef = useRef<number | null>(null);

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

	const onPointerDown = useCallback(
		(event: React.PointerEvent<SVGElement>) => {
			if (disabled) return;

			activePointerIdRef.current = event.pointerId;
			event.currentTarget.setPointerCapture?.(event.pointerId);
		},
		[disabled],
	);

	const onPointerMove = useCallback(
		(event: React.PointerEvent<SVGElement>) => {
			if (disabled) return;
			if (activePointerIdRef.current !== event.pointerId) return;

			updateTempoFromPointer(event.clientY);
		},
		[disabled, updateTempoFromPointer],
	);

	const clearPointer = useCallback((event: React.PointerEvent<SVGElement>) => {
		if (activePointerIdRef.current !== event.pointerId) return;

		activePointerIdRef.current = null;
		event.currentTarget.releasePointerCapture?.(event.pointerId);
	}, []);

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
	};
}

export default usePendulumWeightDrag;
