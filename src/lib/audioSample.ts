/// <reference lib="dom" />

/**
 * A tiny utility for loading + decoding an audio sample once and reusing it.
 *
 * Goals:
 * - Preload/decode to avoid the first-tick delay.
 * - Share the decoded AudioBuffer across schedulers/components when the same AudioContext is used.
 * - Keep WebAudio details out of React components.
 *
 * Notes:
 * - AudioBuffers are tied to the AudioContext that decoded them, so we cache per-context.
 * - If the context is closed, its cache entry is dropped automatically on next access.
 */

export type WebkitAudioContextWindow = Window &
  typeof globalThis & {
    webkitAudioContext?: typeof AudioContext
  }

export function getAudioContext(): AudioContext | null {
  const w = window as unknown as WebkitAudioContextWindow
  const Ctx = w.AudioContext ?? w.webkitAudioContext
  return Ctx ? new Ctx() : null
}

type CacheKey = string

// WeakMap so contexts can be GC’d when the app no longer references them.
const bufferCache = new WeakMap<AudioContext, Map<CacheKey, Promise<AudioBuffer>>>()

async function fetchArrayBuffer(url: string): Promise<ArrayBuffer> {
  const res = await fetch(url)
  if (!res.ok) {
    throw new Error(`Failed to fetch audio sample: ${url} (${res.status} ${res.statusText})`)
  }
  return await res.arrayBuffer()
}

async function decodeAudioBuffer(ctx: AudioContext, data: ArrayBuffer): Promise<AudioBuffer> {
  // decodeAudioData has both callback and promise forms depending on browser;
  // modern browsers support the promise form.
  return await ctx.decodeAudioData(data)
}

/**
 * Load + decode an audio sample, memoized per AudioContext + url.
 */
export function loadSample(ctx: AudioContext, url: string): Promise<AudioBuffer> {
  if (ctx.state === 'closed') {
    throw new Error('AudioContext is closed; cannot load sample')
  }

  let ctxMap = bufferCache.get(ctx)
  if (!ctxMap) {
    ctxMap = new Map()
    bufferCache.set(ctx, ctxMap)
  }

  const key: CacheKey = url
  const cached = ctxMap.get(key)
  if (cached) return cached

  const promise = (async () => {
    const data = await fetchArrayBuffer(url)
    return await decodeAudioBuffer(ctx, data)
  })()

  ctxMap.set(key, promise)
  return promise
}

/**
 * Schedule a one-shot playback of a decoded AudioBuffer at an absolute AudioContext time.
 *
 * Returns the created source node so callers can stop/disconnect if needed.
 */
export function playSampleAt(
  ctx: AudioContext,
  buffer: AudioBuffer,
  when: number,
  opts?: { gain?: number }
): AudioBufferSourceNode {
  const source = ctx.createBufferSource()
  source.buffer = buffer

  if (opts?.gain != null && opts.gain !== 1) {
    const gain = ctx.createGain()
    gain.gain.value = opts.gain
    source.connect(gain)
    gain.connect(ctx.destination)
  } else {
    source.connect(ctx.destination)
  }

  source.start(when)
  return source
}

/**
 * Best-effort resume helper for autoplay policies.
 */
export async function ensureAudioRunning(ctx: AudioContext): Promise<void> {
  if (ctx.state === 'suspended') {
    await ctx.resume()
  }
}
