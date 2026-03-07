import React, { useEffect, useMemo, useRef } from 'react'
import { useTempoContext } from '../contexts/TempoContext'
import { getAudioContext, loadSample } from '../lib/audioSample'
import { MetronomeScheduler } from '../lib/metronomeScheduler'
import { usePendulumFromAudioTime } from '../lib/usePendulumFromAudioTime'

import './Metronomo.css'


const TICK_SAMPLE_URL = 'audio/tap.wav'

const Metronomo: React.FC = () => {
  const { tempo, isPlaying, tempos } = useTempoContext()

  /**
   * Keep a stable AudioContext instance for the lifetime of this component.
   * (Do not recreate it per render.)
   */
  const audioCtxRef = useRef<AudioContext | null>(null)
  if (!audioCtxRef.current) {
    audioCtxRef.current = getAudioContext()
  }
  const audioCtx = audioCtxRef.current

  /**
   * Preload & decode the tick sample once per AudioContext.
   * NOTE: This is async; we store the decoded buffer in a ref once resolved.
   */
  const tickBufferRef = useRef<AudioBuffer | null>(null)
  useEffect(() => {
    if (!audioCtx) return

    let cancelled = false

    loadSample(audioCtx, TICK_SAMPLE_URL)
      .then((buf) => {
        if (cancelled) return
        tickBufferRef.current = buf
      })
      .catch(() => {
        // keep silent; scheduling will just no-op until buffer is available
        // (you can add UI feedback if desired)
      })

    return () => {
      cancelled = true
    }
  }, [audioCtx])

  /**
   * Visual pendulum driven from the AudioContext clock.
   * This returns:
   * - `pendulumStyle` to apply directly to the `.pendulo` element
   * - `zeroCrossingTime` which is an AudioContext absolute time where the pendulum is at 0°
   *   (we use it to align the first tick)
   */
  const { pendulumStyle, zeroCrossingTime } = usePendulumFromAudioTime({
    audioCtx,
    isPlaying,
    tempoBpm: tempo,
    maxDegrees: 15,
    periodBeats: 2,
    // Schedule the first 0° crossing half a beat after starting.
    // We will align the first tick to this same instant.
    zeroCrossingOffsetBeats: 0.45,
    autoResumeAudioContext: true,
  })

  /**
   * Audio scheduler instance, isolated from React rendering.
   * We keep it in a ref and only start/stop/update it via effects.
   */
  const schedulerRef = useRef<MetronomeScheduler | null>(null)

  // Create the scheduler once we have an AudioContext.
  useEffect(() => {
    if (!audioCtx) return

    if (!schedulerRef.current) {
      schedulerRef.current = new MetronomeScheduler(audioCtx, tickBufferRef.current, {
        lookaheadMs: 25,
        scheduleAheadTimeSec: 0.2,
        gain: 1,
      })
    }

    return () => {
      // Stop on unmount
      schedulerRef.current?.stop()
      schedulerRef.current = null
    }
  }, [audioCtx])

  // Keep scheduler buffer up to date when the sample finishes loading.
  useEffect(() => {
    const s = schedulerRef.current
    if (!s) return
    s.setBuffer(tickBufferRef.current)
  })

  // Start/stop and tempo updates.
  useEffect(() => {
    const s = schedulerRef.current
    if (!audioCtx || !s) return

    if (!isPlaying) {
      s.stop()
      return
    }

    // Ensure the scheduler tempo is up to date.
    s.setTempo(tempo)

    // Align the first tick to the pendulum's 0° reference time if available.
    // If not available yet (first render), fall back to a computed half-beat offset.
    const secondsPerBeat = 60 / Math.max(1, tempo)
    const fallbackT0 = audioCtx.currentTime + 0.5 * secondsPerBeat

    const t0 = zeroCrossingTime ?? fallbackT0

    // Start (no-op if already running). If already running, we don't want to reset t0,
    // otherwise you’ll hear a phase jump. So only start if not running.
    if (!s.getState().running) {
      void s.start({ tempoBpm: tempo, t0 })
    }

    return () => {
      // On dependency changes, don't stop here; stop is handled when isPlaying becomes false.
      // This avoids cutting off playback on tempo adjustments.
    }
  }, [audioCtx, isPlaying, tempo, zeroCrossingTime])

  const weightPosition = useMemo(() => {
    return `${((tempos.indexOf(tempo)) / 36) * 100}%`
  }, [tempos, tempo])

  return (
    <>
    <div className="metronome">
      <div className="metronome__pendulum-clip">
        <div className="metronome__pendulum" style={pendulumStyle}>
          <label className="metronome__pendulum-inner" >
            <svg viewBox="0 0 104 94"  className="metronome__weight" style={{ top: weightPosition }}>
              <g id="metronome-pendulum-assembly">
                <g id="metronome-weight">
                  <g id="metronome-weight-body">
                      <path
                      fill="#666"
                      d="M86 79a13 13 0 01-12 10H30a13 13 0 01-12-10L5 15a8 8 0 018-10h78a8 8 0 018 10z"
                    />
                    <path
                      className="metronome__stroke"
                      d="M86 79a13 13 0 01-12 10H30a13 13 0 01-12-10L5 15a8 8 0 018-10h78a8 8 0 018 10z"
                    />
                  </g>
                  <g id="metronome-weight-circles">
                    <circle id="metronome-weight-circle-right" cx="72.6" cy="28.3" r="12.5" fill="#313131" />
                    <circle id="metronome-weight-circle-left" cx="31.6" cy="28.3" r="12.5" fill="#313131" />
                  </g>
                </g>
              </g>
            </svg>
          </label>
        </div>
      </div>

      <svg id="metronome-illustration" viewBox="795 350.9 410 792.2">
        <line id="metronome-ground-line" className="metronome__stroke" x1="800" y1="1138.1" x2="1200" y2="1138.1" />
        <g id="metronome-feet">
          <g id="metronome-foot-right">
            <circle className="metronome__base-bottom" cx="1145.5" cy="1111.4" r="22.7" />
          </g>
          <g id="metronome-foot-left">
            <circle className="metronome__base-bottom" cx="853.3" cy="1111.4" r="22.7" />
          </g>
        </g>
        <path
          id="base-superior"
          className="metronome__base-top"
          d="M1155.6,856.4H843.4L923,380.1c2.4-14,14.5-24.2,28.7-24.2h95.3c14.2,0,26.3,10.2,28.7,24.2
            L1155.6,856.4z"
        />
        <path
          id="base-inferior"
          className="metronome__base-bottom"
          d="M1155.6,856.4l33.8,201.2c3,17.7-10.7,33.9-28.7,33.9H838.4c-18,0-31.7-16.2-28.7-33.9
            l33.8-201"
        />
        <g id="metronome-scale-marks">
          <line className="metronome__mark" x1="950.5" y1="382.2" x2="999.4" y2="382.2" />
          <line className="metronome__mark" x1="999.4" y1="393.9" x2="1048.2" y2="393.9" />
          <line className="metronome__mark" x1="950.5" y1="405.6" x2="999.4" y2="405.6" />
          <line className="metronome__mark" x1="999.4" y1="417.2" x2="1048.2" y2="417.2" />
          <line className="metronome__mark" x1="950.5" y1="428.9" x2="999.4" y2="428.9" />
          <line className="metronome__mark" x1="999.4" y1="440.6" x2="1048.2" y2="440.6" />
          <line className="metronome__mark" x1="950.5" y1="452.3" x2="999.4" y2="452.3" />
          <line className="metronome__mark" x1="999.4" y1="464" x2="1048.2" y2="464" />
          <line className="metronome__mark" x1="950.5" y1="475.7" x2="999.4" y2="475.7" />
          <line className="metronome__mark" x1="999.4" y1="487.4" x2="1048.2" y2="487.4" />
          <line className="metronome__mark" x1="950.5" y1="499.1" x2="999.4" y2="499.1" />
          <line className="metronome__mark" x1="999.4" y1="510.8" x2="1048.2" y2="510.8" />
          <line className="metronome__mark" x1="950.5" y1="522.5" x2="999.4" y2="522.5" />
          <line className="metronome__mark" x1="999.4" y1="534.2" x2="1048.2" y2="534.2" />
          <line className="metronome__mark" x1="950.5" y1="545.8" x2="999.4" y2="545.8" />
          <line className="metronome__mark" x1="999.4" y1="557.5" x2="1048.2" y2="557.5" />
          <line className="metronome__mark" x1="950.5" y1="569.2" x2="999.4" y2="569.2" />
          <line className="metronome__mark" x1="999.4" y1="580.9" x2="1048.2" y2="580.9" />
          <line className="metronome__mark" x1="950.5" y1="592.6" x2="999.4" y2="592.6" />
          <line className="metronome__mark" x1="999.4" y1="604.3" x2="1048.2" y2="604.3" />
          <line className="metronome__mark" x1="950.5" y1="616" x2="999.4" y2="616" />
          <line className="metronome__mark" x1="999.4" y1="627.7" x2="1048.2" y2="627.7" />
          <line className="metronome__mark" x1="950.5" y1="639.4" x2="999.4" y2="639.4" />
          <line className="metronome__mark" x1="999.4" y1="651.1" x2="1048.2" y2="651.1" />
          <line className="metronome__mark" x1="950.5" y1="662.7" x2="999.4" y2="662.7" />
          <line className="metronome__mark" x1="999.4" y1="674.4" x2="1048.2" y2="674.4" />
          <line className="metronome__mark" x1="950.5" y1="686.1" x2="999.4" y2="686.1" />
          <line className="metronome__mark" x1="999.4" y1="697.8" x2="1048.2" y2="697.8" />
          <line className="metronome__mark" x1="950.5" y1="709.5" x2="999.4" y2="709.5" />
          <line className="metronome__mark" x1="999.4" y1="721.2" x2="1048.2" y2="721.2" />
          <line className="metronome__mark" x1="950.5" y1="732.9" x2="999.4" y2="732.9" />
          <line className="metronome__mark" x1="999.4" y1="744.6" x2="1048.2" y2="744.6" />
          <line className="metronome__mark" x1="950.5" y1="756.3" x2="999.4" y2="756.3" />
          <line className="metronome__mark" x1="999.4" y1="768" x2="1048.2" y2="768" />
          <line className="metronome__mark" x1="950.5" y1="779.6" x2="999.4" y2="779.6" />
          <line className="metronome__mark" x1="999.4" y1="791.3" x2="1048.2" y2="791.3" />
          <line className="metronome__mark" x1="950.5" y1="803" x2="999.4" y2="803" />
          <line className="metronome__mark" x1="999.4" y1="380.4" x2="999.4" y2="854.4" />
        </g>
        <path id="metronome-body-divider-stroke" className="metronome__stroke" d="M843.4,856.6h312.2H843.4z" />
        <path
          id="metronome-body-outline-stroke"
          className="metronome__stroke"
          d="M864.4,1091.6c6.9,3.9,11.6,11.3,11.6,19.8c0,12.5-10.2,22.7-22.7,22.7s-22.7-10.2-22.7-22.7
            c0-8.5,4.7-15.9,11.6-19.8l0,0h-3.8c-18,0-31.7-16.2-28.7-33.9l33.8-201v-0.2L923,380.1c2.4-14,14.5-24.2,28.7-24.2h95.3
            c14.2,0,26.3,10.2,28.7,24.2l79.9,476.3l33.8,201.2c3,17.7-10.7,33.9-28.7,33.9h-4.1l0,0c6.9,3.9,11.6,11.3,11.6,19.8
            c0,12.5-10.2,22.7-22.7,22.7s-22.7-10.2-22.7-22.7c0-8.5,4.7-15.9,11.6-19.8L864.4,1091.6z"
        />
      </svg>

    </div>
      <p className="tempo">{tempo} ppm</p>
    </>
  )
}

export default Metronomo
