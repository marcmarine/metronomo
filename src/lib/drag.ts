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

/** Whether a drag axis is allowed — fixed, or decided by where the gesture starts. */
type DragPermission = boolean | ((clientX: number, clientY: number) => boolean);

/** A pointer-interactive element, and the drag axes it allows. */
export interface DragTarget {
	element: Element;
	/** Vertical dragging changes the tempo (moves the weight). */
	allowVerticalDrag: DragPermission;
	/** Horizontal dragging winds the pendulum up. */
	allowHorizontalDrag: DragPermission;
}

/**
 * Wires pointer events on the drag targets to tempo changes, the wind-up
 * gesture, and tap-to-toggle — converting client coordinates into the SVG's
 * viewBox space so it works at any render size.
 */
export class WeightDragController {
	private readonly svg: SVGSVGElement;
	private readonly targets: DragTarget[];
	private readonly callbacks: DragCallbacks;

	private activePointerId: number | null = null;
	private activeElement: Element | null = null;
	private activeAllowsVertical = true;
	private activeAllowsHorizontal = true;
	private dragStartClient: { x: number; y: number } | null = null;
	private dragStartSvgY = 0;
	private dragStartWeightY = 0;
	private hasHorizontalDrag = false;
	private hasVerticalDrag = false;
	private hasBlockedHorizontalDrag = false;
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
				this.onPointerDown(e as PointerEvent, target),
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
		if (this.activePointerId !== null) return; // ignore secondary touches
		e.preventDefault();
		this.activePointerId = e.pointerId;
		this.activeElement = target.element;
		this.activeAllowsVertical = this.resolvePermission(
			target.allowVerticalDrag,
			e.clientX,
			e.clientY,
		);
		this.activeAllowsHorizontal = this.resolvePermission(
			target.allowHorizontalDrag,
			e.clientX,
			e.clientY,
		);
		this.dragStartClient = { x: e.clientX, y: e.clientY };
		this.dragStartSvgY = this.clientToSvgPoint(e.clientX, e.clientY).y;
		this.dragStartWeightY = weightYForIndex(this.currentTempoIndex);
		this.hasHorizontalDrag = false;
		this.hasVerticalDrag = false;
		this.hasBlockedHorizontalDrag = false;
		this.manualAngle = null;
		this.setCapture(target.element, e.pointerId);
		this.callbacks.onDragStart?.();
	};

	private onPointerMove = (e: Event): void => {
		const pe = e as PointerEvent;
		if (this.activePointerId !== pe.pointerId || !this.dragStartClient) return;
		if (this.callbacks.isLocked()) return; // e.g. pendulum already swinging: only a tap can stop it

		pe.preventDefault();
		const dx = pe.clientX - this.dragStartClient.x;
		const dy = pe.clientY - this.dragStartClient.y;

		if (Math.abs(dx) > CLICK_THRESHOLD) {
			if (this.activeAllowsHorizontal) this.hasHorizontalDrag = true;
			// Remember blocked horizontal movement so it doesn't count as a tap.
			else this.hasBlockedHorizontalDrag = true;
		}
		if (this.activeAllowsVertical && Math.abs(dy) > CLICK_THRESHOLD) {
			this.hasVerticalDrag = true;
		}

		if (this.hasVerticalDrag) {
			const svgY = this.clientToSvgPoint(pe.clientX, pe.clientY).y;
			const adjustedY = this.dragStartWeightY + (svgY - this.dragStartSvgY);
			this.callbacks.onTempoDrag(tempoIndexForSvgY(adjustedY));
		}

		if (this.hasHorizontalDrag) {
			this.manualAngle = this.angleFromPointer(pe.clientX, pe.clientY);
			this.callbacks.onAngleDrag(this.manualAngle);
		}
	};

	private onPointerUp = (e: Event): void => {
		const pe = e as PointerEvent;
		if (this.activePointerId !== pe.pointerId) return;

		const wasTap =
			!this.hasHorizontalDrag &&
			!this.hasVerticalDrag &&
			!this.hasBlockedHorizontalDrag;
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

		if (this.activeElement) {
			this.releaseCapture(this.activeElement, pe.pointerId);
		}
		this.activePointerId = null;
		this.activeElement = null;
		this.dragStartClient = null;
		this.hasHorizontalDrag = false;
		this.hasVerticalDrag = false;
		this.hasBlockedHorizontalDrag = false;
		this.manualAngle = null;
	};

	private resolvePermission(
		permission: DragPermission,
		clientX: number,
		clientY: number,
	): boolean {
		return typeof permission === "function"
			? permission(clientX, clientY)
			: permission;
	}

	private setCapture(element: Element, pointerId: number): void {
		try {
			element.setPointerCapture?.(pointerId);
		} catch {
			// capture is best-effort; drag still works without it
		}
	}

	private releaseCapture(element: Element, pointerId: number): void {
		try {
			element.releasePointerCapture?.(pointerId);
		} catch {
			// already released
		}
	}
}
