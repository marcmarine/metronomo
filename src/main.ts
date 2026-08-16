import { loadClickBuffer } from "./lib/audio";
import { WeightDragController } from "./lib/drag";
import { PendulumAnimator } from "./lib/pendulum";
import { MetronomeScheduler } from "./lib/scheduler";
import { renderScaleMarks } from "./lib/svg-marks";
import {
	clampTempoIndex,
	PIVOT_X,
	PIVOT_Y,
	TEMPOS,
	weightYForIndex,
} from "./lib/tempo";
import "./style.css";

// ---------- DOM refs ----------
const svg = document.getElementById(
	"metronome-svg",
) as unknown as SVGSVGElement;
const pendulumGroup = document.getElementById(
	"pendulum-group",
) as unknown as SVGGElement;
const weightSvg = document.getElementById(
	"weight-svg",
) as unknown as SVGSVGElement;
const dragTrack = document.getElementById(
	"drag-track",
) as unknown as SVGRectElement;
const tempoLabel = document.getElementById(
	"tempo-label",
) as HTMLParagraphElement;
const marksGroup = document.getElementById(
	"scale-marks",
) as unknown as SVGGElement;
const stage = document.getElementById("stage") as HTMLDivElement;

renderScaleMarks(marksGroup);

// ---------- State ----------
let tempoIndex = 8; // 60 ppm
let isPlaying = false;

function currentTempo(): number {
	return TEMPOS[tempoIndex];
}

// ---------- Rendering ----------
function renderWeightPosition(): void {
	const y = weightYForIndex(tempoIndex).toFixed(2);
	weightSvg.setAttribute("y", y);
	dragTrack.setAttribute("y", y);
}

function renderTempoLabel(): void {
	tempoLabel.textContent = `${currentTempo()} ppm`;
}

function renderPendulumAngle(angleDeg: number): void {
	pendulumGroup.setAttribute(
		"transform",
		`rotate(${angleDeg} ${PIVOT_X} ${PIVOT_Y})`,
	);
}

let hideTempoLabelTimeout: ReturnType<typeof setTimeout> | null = null;

function flashTempoLabel(): void {
	tempoLabel.classList.add("visible");

	if (hideTempoLabelTimeout != null) clearTimeout(hideTempoLabelTimeout);
	hideTempoLabelTimeout = setTimeout(() => {
		tempoLabel.classList.remove("visible");
		hideTempoLabelTimeout = null;
	}, 1800);
}

function setTempoIndex(
	index: number,
	{ stop = true }: { stop?: boolean } = {},
): void {
	tempoIndex = clampTempoIndex(index);
	if (stop && isPlaying) stopPlaying();
	renderWeightPosition();
	renderTempoLabel();
	dragController.setTempoIndex(tempoIndex);
	flashTempoLabel();
}

// ---------- Audio (created lazily on first user gesture) ----------
let audioCtx: AudioContext | null = null;
let scheduler: MetronomeScheduler | null = null;
let pendulum: PendulumAnimator | null = null;
let clickBufferPromise: Promise<AudioBuffer> | null = null;

function getClickBuffer(ctx: AudioContext): Promise<AudioBuffer> {
	if (!clickBufferPromise) {
		// BASE_URL respects the GH Pages subpath configured in vite.config.ts
		clickBufferPromise = loadClickBuffer(
			ctx,
			`${import.meta.env.BASE_URL}audio/tap.wav`,
		);
	}
	return clickBufferPromise;
}

async function ensureAudio() {
	if (!audioCtx) audioCtx = new AudioContext();
	if (audioCtx.state === "suspended") await audioCtx.resume();

	const buffer = await getClickBuffer(audioCtx);
	if (!scheduler) scheduler = new MetronomeScheduler(audioCtx, buffer);
	if (!pendulum) {
		pendulum = new PendulumAnimator(audioCtx, {
			getTempoBpm: currentTempo,
			onFrame: renderPendulumAngle,
		});
	}
	return { ctx: audioCtx, scheduler, pendulum };
}

async function startPlaying(initialAngleDeg = 0): Promise<void> {
	if (isPlaying) return;
	const { scheduler, pendulum } = await ensureAudio();
	if (isPlaying) return;
	isPlaying = true;

	const secondsPerBeat = 60 / currentTempo();
	const firstCrossingTime = pendulum.start(initialAngleDeg);

	// If it starts at rest (tap/space), the click starts on the second pass
	// through the center. If it comes from releasing the pendulum after winding it,
	// it's already in real motion, so it sounds from the first pass.
	const isRestingStart = initialAngleDeg === 0;
	const t0 = isRestingStart
		? firstCrossingTime + secondsPerBeat
		: firstCrossingTime;

	scheduler.start({ tempoBpm: currentTempo(), t0 });
}

function stopPlaying(): void {
	if (!isPlaying) return;
	isPlaying = false;
	scheduler?.stop();
	pendulum?.stop();
}

function togglePlay(): void {
	if (isPlaying) stopPlaying();
	else void startPlaying(0); // "void" because the listener does not await the promise
}

// Starts loading the wav as soon as the page loads, without waiting for user interaction.
audioCtx = new AudioContext();
void getClickBuffer(audioCtx);

// ---------- Drag: vertical = tempo, horizontal = wind-up, tap = play/pause ----------
const dragController = new WeightDragController(svg, dragTrack, {
	isLocked: () => isPlaying,
	onTempoDrag: (index) => setTempoIndex(index, { stop: false }),
	onAngleDrag: (angleDeg) => renderPendulumAngle(angleDeg),
	onTap: () => togglePlay(),
	onRelease: (angleDeg) => {
		void startPlaying(angleDeg);
	},
	onCancel: () => {
		if (!isPlaying) renderPendulumAngle(0);
	},
});
dragController.setTempoIndex(tempoIndex);

// ---------- Keyboard shortcuts ----------
window.addEventListener(
	"keydown",
	(e) => {
		const tag = (e.target as HTMLElement)?.tagName?.toLowerCase();
		if (
			tag === "input" ||
			tag === "textarea" ||
			(e.target as HTMLElement)?.isContentEditable
		)
			return;
		if (e.repeat) return;

		if (e.key === "ArrowUp" || e.key === "ArrowRight") {
			e.preventDefault();
			setTempoIndex(tempoIndex + 1);
		} else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
			e.preventDefault();
			setTempoIndex(tempoIndex - 1);
		} else if (e.key === " " || e.key === "p" || e.key === "P") {
			e.preventDefault();
			togglePlay();
		} else if (e.key === "f" || e.key === "F") {
			e.preventDefault();
			toggleFullscreen();
		}
	},
	{ passive: false },
);

// ---------- Wheel to change tempo ----------
let wheelAccumulator = 0;
window.addEventListener(
	"wheel",
	(e) => {
		if (e.deltaY === 0) return;
		e.preventDefault();
		const direction = e.deltaY < 0 ? 1 : -1;
		wheelAccumulator += Math.abs(e.deltaY) / 100;
		const steps = Math.floor(wheelAccumulator);
		if (steps <= 0) return;
		wheelAccumulator -= steps;
		for (let i = 0; i < steps; i++) setTempoIndex(tempoIndex + direction);
	},
	{ passive: false },
);

// ---------- Fullscreen ----------
function toggleFullscreen(): void {
	if (!document.fullscreenElement)
		void stage.requestFullscreen?.().catch(() => {});
	else void document.exitFullscreen?.().catch(() => {});
}

// ---------- Initial render ----------
renderWeightPosition();
renderTempoLabel();
renderPendulumAngle(0);
