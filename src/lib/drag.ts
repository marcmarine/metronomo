import { PIVOT_X, PIVOT_Y, tempoIndexForSvgY, weightYForIndex } from "./tempo";

const CLICK_THRESHOLD = 5;
const MAX_DRAG_ANGLE = 15;
const MIN_RELEASE_ANGLE = 3; // degrees; below this, releasing just resets to 0

export interface DragCallbacks {
	/** Called while dragging vertically, with the new tempo index. */
	onTempoDrag: (index: number) => void;
	/** Called while dragging horizontally, with the live angle (degrees). */
	onAngleDrag: (angleDeg: number) => void;
	/** Called on a plain tap (no meaningful drag). */
	onTap: () => void;
	/** Called on release after a horizontal drag past the release threshold. */
	onRelease: (angleDeg: number) => void;
	/** Called on release when nothing should happen (drag too small / no wind-up). */
	onCancel: () => void;
	/** Whether dragging should currently be ignored (e.g. pendulum already running). */
	isLocked: () => boolean;
	/** Called when a drag starts (pointer down). */
	onDragStart?: () => void;
	/** Called when a drag ends (pointer up or cancel). */
	onDragEnd?: () => void;
}

interface SvgPoint {
	x: number;
	y: number;
}

/** A pointer-interactive element, and whether pressing it allows vertical (tempo) dragging. */
export interface DragTarget {
	element: SVGElement;
	allowVerticalDrag: boolean;
}

/**
 * Wires pointer events on the drag target to tempo changes, the wind-up
 * gesture, and tap-to-toggle — converting client coordinates into the SVG's
 * viewBox space so it works at any render size.
 */
export class WeightDragController {
	private readonly svg: SVGSVGElement;
	private readonly targets: DragTarget[];
	private readonly callbacks: DragCallbacks;

	private activePointerId: number | null = null;
	private activeElement: SVGElement | null = null;
	private activeAllowsVertical = true;
	private dragStartClient: { x: number; y: number } | null = null;
	private dragStartSvgY = 0;
	private dragStartWeightY = 0;
	private hasHorizontalDrag = false;
	private hasVerticalDrag = false;
	private currentTempoIndex = 0;
	private manualAngle: number | null = null;

	constructor(
		svg: SVGSVGElement,
		targets: DragTarget[],
		callbacks: DragCallbacks,
	) {
		this.svg = svg;
		this.targets = targets;
		this.callbacks = callbacks;

		for (const target of this.targets) {
			target.element.addEventListener("pointerdown", (e) =>
				this.onPointerDown(e, target),
			);
			target.element.addEventListener("pointermove", this.onPointerMove);
			target.element.addEventListener("pointerup", this.onPointerUp);
			target.element.addEventListener("pointercancel", this.onPointerUp);
		}
	}

	/** Sync the current tempo index (needed to compute vertical-drag offsets correctly). */
	setTempoIndex(index: number): void {
		this.currentTempoIndex = index;
	}

	private clientToSvgPoint(clientX: number, clientY: number): SvgPoint {
		const rect = this.svg.getBoundingClientRect();
		const vb = this.svg.viewBox.baseVal;
		const scale = Math.min(rect.width / vb.width, rect.height / vb.height);
		const actualWidth = vb.width * scale;
		const actualHeight = vb.height * scale;
		const offsetX = rect.left + (rect.width - actualWidth) / 2;
		const offsetY = rect.top + (rect.height - actualHeight) / 2;

		return {
			x: vb.x + (clientX - offsetX) / scale,
			y: vb.y + (clientY - offsetY) / scale,
		};
	}

	/** Angle (deg) of the pointer relative to the pivot; 0deg = straight up, matching the rod. */
	private angleFromPointer(clientX: number, clientY: number): number {
		const p = this.clientToSvgPoint(clientX, clientY);
		const dx = p.x - PIVOT_X;
		const dy = p.y - PIVOT_Y;
		const angleRad = Math.atan2(dx, -dy);
		const angleDeg = angleRad * (180 / Math.PI);
		return Math.max(-MAX_DRAG_ANGLE, Math.min(MAX_DRAG_ANGLE, angleDeg));
	}

	private onPointerDown = (e: PointerEvent, target: DragTarget): void => {
		e.preventDefault();
		this.activePointerId = e.pointerId;
		this.activeElement = target.element;
		this.activeAllowsVertical = target.allowVerticalDrag;
		this.dragStartClient = { x: e.clientX, y: e.clientY };
		this.dragStartSvgY = this.clientToSvgPoint(e.clientX, e.clientY).y;
		this.dragStartWeightY = weightYForIndex(this.currentTempoIndex);
		this.hasHorizontalDrag = false;
		this.hasVerticalDrag = false;
		this.manualAngle = null;
		target.element.setPointerCapture(e.pointerId);
		this.callbacks.onDragStart?.();
	};

	private onPointerMove = (e: PointerEvent): void => {
		if (this.activePointerId !== e.pointerId || !this.dragStartClient) return;
		if (this.callbacks.isLocked()) return; // e.g. pendulum already swinging: only a tap can stop it

		e.preventDefault();
		const dx = e.clientX - this.dragStartClient.x;
		const dy = e.clientY - this.dragStartClient.y;

		if (Math.abs(dx) > CLICK_THRESHOLD) this.hasHorizontalDrag = true;
		if (this.activeAllowsVertical && Math.abs(dy) > CLICK_THRESHOLD) {
			this.hasVerticalDrag = true;
		}

		if (this.hasVerticalDrag) {
			const svgY = this.clientToSvgPoint(e.clientX, e.clientY).y;
			const adjustedY = this.dragStartWeightY + (svgY - this.dragStartSvgY);
			this.callbacks.onTempoDrag(tempoIndexForSvgY(adjustedY));
		}

		if (this.hasHorizontalDrag) {
			this.manualAngle = this.angleFromPointer(e.clientX, e.clientY);
			this.callbacks.onAngleDrag(this.manualAngle);
		}
	};

	private onPointerUp = (e: PointerEvent): void => {
		if (this.activePointerId !== e.pointerId) return;

		const wasTap = !this.hasHorizontalDrag && !this.hasVerticalDrag;
		if (wasTap) {
			this.callbacks.onTap();
		} else if (
			this.hasHorizontalDrag &&
			this.manualAngle != null &&
			Math.abs(this.manualAngle) >= MIN_RELEASE_ANGLE
		) {
			this.callbacks.onRelease(this.manualAngle);
		} else {
			this.callbacks.onCancel();
		}

		this.callbacks.onDragEnd?.();

		this.activePointerId = null;
		this.activeElement?.releasePointerCapture?.(e.pointerId);
		this.activeElement = null;
		this.dragStartClient = null;
		this.hasHorizontalDrag = false;
		this.hasVerticalDrag = false;
		this.manualAngle = null;
	};
}
