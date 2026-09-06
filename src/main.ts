import { createClickBuffer, loadClickBuffer } from "./lib/audio";
import { select } from "./lib/dom";
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
import { TempoLabel } from "./lib/tempo-label";
import "./style.css";

// ---------- Welcome screen (iOS only) ----------
const $welcome = select<HTMLDivElement>(".welcome");
const $welcomeEnter = select<HTMLButtonElement>(".welcome__enter");

function isIOS(): boolean {
	const ua = navigator.userAgent;
	if (/iPad|iPhone|iPod/.test(ua)) return true;
	// iPadOS 13+ reports as Macintosh but supports touch
	return /Mac/.test(ua) && navigator.maxTouchPoints > 1;
}

if ($welcome && $welcomeEnter && isIOS()) {
	$welcome.hidden = false;
	$welcomeEnter.addEventListener(
		"click",
		() => {
			$welcome.hidden = true;
		},
		{ once: true },
	);
}

// ---------- DOM refs ----------
const $svg = select<SVGSVGElement>(".metronome");
const $pendulumGroup = select<SVGGElement>(".metronome__pendulum-group");
const $weightSvg = select<SVGSVGElement>(".metronome__weight");
const $dragTrack = select<SVGRectElement>(".metronome__drag-track");
const $rodDragTrack = select<SVGRectElement>(".metronome__rod-drag-track");
const $tempoWrapper = select<HTMLParagraphElement>(".tempo-wrapper");
const $tempoLabel = select<HTMLParagraphElement>(".tempo-wrapper__bpm");
const $tempoGroup = select<HTMLParagraphElement>(".tempo-wrapper__name");
const $marksGroup = select<SVGGElement>(".metronome__marks");
const $stage = select<HTMLDivElement>(".stage");
const $gestureLayer = select<HTMLDivElement>(".stage__gesture-layer");

renderScaleMarks($marksGroup);

const tempoLabel = new TempoLabel($tempoWrapper, $tempoLabel, $tempoGroup);

// ---------- State ----------
let tempoIndex = 8; // 60 ppm
let isPlaying = false;

function currentTempo(): number {
	return TEMPOS[tempoIndex];
}

// ---------- Rendering ----------
function renderWeightPosition(): void {
	const y = weightYForIndex(tempoIndex).toFixed(2);
	$weightSvg.setAttribute("y", y);
	$dragTrack.setAttribute("y", y);
}

function renderPendulumAngle(angleDeg: number): void {
	$pendulumGroup.setAttribute(
		"transform",
		`rotate(${angleDeg} ${PIVOT_X} ${PIVOT_Y})`,
	);
}

function setTempoIndex(
	index: number,
	{ stop = true }: { stop?: boolean } = {},
): void {
	tempoIndex = clampTempoIndex(index);
	if (stop && isPlaying) stopPlaying();
	renderWeightPosition();
	tempoLabel.render(tempoIndex);
	dragController.setTempoIndex(tempoIndex);
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
		).catch(() => createClickBuffer(ctx));
	}
	return clickBufferPromise;
}

async function ensureAudio() {
	if (!audioCtx) audioCtx = new AudioContext();
	if (audioCtx.state === "suspended") {
		await audioCtx.resume();
	}

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
	tempoLabel.flash();
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
	else
		void startPlaying(0).catch((err) =>
			console.error("Could not start audio:", err),
		); // "void" because the listener does not await the promise
}

// ---------- Drag: vertical = tempo, horizontal = wind-up, tap = play/pause ----------
// The gesture layer sits above the whole stage, so it receives every gesture.
// Since it covers the metronome's own tracks, it reproduces their behavior by
// hit-testing where the gesture starts: horizontal wind-up only works when
// pressing on the weight or the rod, and the rod strip ignores vertical drags
// (the weight takes priority where both overlap, as it did when it was on top).
function isOverElement(el: Element, clientX: number, clientY: number): boolean {
	const r = el.getBoundingClientRect();
	return (
		clientX >= r.left &&
		clientX <= r.right &&
		clientY >= r.top &&
		clientY <= r.bottom
	);
}

const dragController = new WeightDragController(
	$svg,
	[
		{
			element: $gestureLayer,
			allowVerticalDrag: (x, y) =>
				isOverElement($dragTrack, x, y) || !isOverElement($rodDragTrack, x, y),
			allowHorizontalDrag: (x, y) =>
				isOverElement($dragTrack, x, y) || isOverElement($rodDragTrack, x, y),
		},
		{
			element: $rodDragTrack,
			allowVerticalDrag: false,
			allowHorizontalDrag: true,
		},
		{ element: $dragTrack, allowVerticalDrag: true, allowHorizontalDrag: true },
	],
	{
		isLocked: () => isPlaying,
		onTempoDrag: (index) => setTempoIndex(index, { stop: false }),
		onAngleDrag: (angleDeg) => renderPendulumAngle(angleDeg),
		onTap: () => togglePlay(),
		onRelease: (angleDeg) => {
			void startPlaying(angleDeg).catch((err) =>
				console.error("Could not start audio:", err),
			);
		},
		onCancel: () => {
			if (!isPlaying) renderPendulumAngle(0);
		},
		onDragStart: () => {
			tempoLabel.show();
			void ensureAudio();
		},
		onDragEnd: () => {
			tempoLabel.flash();
		},
	},
);
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
			tempoLabel.flash();
		} else if (e.key === "ArrowDown" || e.key === "ArrowLeft") {
			e.preventDefault();
			setTempoIndex(tempoIndex - 1);
			tempoLabel.flash();
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
		tempoLabel.flash();
	},
	{ passive: false },
);

// ---------- Fullscreen ----------
function toggleFullscreen(): void {
	if (!document.fullscreenElement)
		void $stage.requestFullscreen?.().catch(() => {});
	else void document.exitFullscreen?.().catch(() => {});
}

// ---------- Initial render ----------
renderWeightPosition();
tempoLabel.render(tempoIndex);
renderPendulumAngle(0);
