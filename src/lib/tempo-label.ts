import { TEMPO_LABELS, TEMPOS } from "./tempo";

export class TempoLabel {
	private readonly wrapper: HTMLElement;
	private readonly bpmEl: HTMLElement;
	private readonly nameEl: HTMLElement;
	private hideTimeout: ReturnType<typeof setTimeout> | null = null;

	constructor(wrapper: HTMLElement, bpmEl: HTMLElement, nameEl: HTMLElement) {
		this.wrapper = wrapper;
		this.bpmEl = bpmEl;
		this.nameEl = nameEl;
	}

	render(index: number): void {
		this.bpmEl.textContent = `${TEMPOS[index]} ppm`;
		this.nameEl.textContent = TEMPO_LABELS[index];
	}

	show(): void {
		this.wrapper.classList.add("visible");

		if (this.hideTimeout != null) {
			clearTimeout(this.hideTimeout);
			this.hideTimeout = null;
		}
	}

	flash(): void {
		this.show();
		this.hideTimeout = setTimeout(() => {
			this.wrapper.classList.remove("visible");
			this.hideTimeout = null;
		}, 1800);
	}
}
