/**
 * Procedurally builds a short percussive "tap" sample (noise burst + tone,
 * exponential decay) so the app has no external audio asset to fetch/host.
 */
export function createClickBuffer(ctx: AudioContext): AudioBuffer {
	const duration = 0.05;
	const length = Math.floor(ctx.sampleRate * duration);
	const buffer = ctx.createBuffer(1, length, ctx.sampleRate);
	const data = buffer.getChannelData(0);

	for (let i = 0; i < length; i++) {
		const t = i / ctx.sampleRate;
		const envelope = Math.exp(-t * 90);
		data[i] =
			((Math.random() * 2 - 1) * 0.55 +
				Math.sin(2 * Math.PI * 1500 * t) * 0.45) *
			envelope;
	}

	return buffer;
}

/** Loads and decodes an external .wav/.mp3 into an AudioBuffer. */
export async function loadClickBuffer(
	ctx: BaseAudioContext,
	url: string,
): Promise<AudioBuffer> {
	const response = await fetch(url);
	const arrayBuffer = await response.arrayBuffer();
	return ctx.decodeAudioData(arrayBuffer);
}

/** Schedules `buffer` to play at AudioContext time `when`, optionally at a given gain. */
export function playSampleAt(
	ctx: AudioContext,
	buffer: AudioBuffer,
	when: number,
	gain = 1,
): void {
	const source = ctx.createBufferSource();
	source.buffer = buffer;

	if (gain !== 1) {
		const gainNode = ctx.createGain();
		gainNode.gain.value = gain;
		source.connect(gainNode);
		gainNode.connect(ctx.destination);
	} else {
		source.connect(ctx.destination);
	}

	source.start(when);
}

/**
 * iOS Safari (and sometimes Android Chrome) may resolve `resume()` before
 * the audio clock is actually advancing: currentTime stays "stuck" for a
 * moment right after unlocking. Playing a silent buffer forces the audio
 * thread to actually start before we rely on currentTime for anything else.
 */
export function unlockAudioContext(ctx: AudioContext): void {
	const buffer = ctx.createBuffer(1, 1, ctx.sampleRate);
	const source = ctx.createBufferSource();
	source.buffer = buffer;
	source.connect(ctx.destination);
	source.start(0);
}
