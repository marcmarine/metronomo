import React, { useContext, useEffect } from 'react'
import { TempoContext } from '../contexts/TempoContext'

import './Metronomo.css'

const startPendulo = function (tempo) {
  let duration = 60 / tempo;
  document.querySelector('.pendulo').style.animationDuration = duration * 2 + 's';
  // document.querySelector('.pendulo').style.animationName = 'tick';
}

const stopPendulo = function () {
  document.querySelector('.pendulo').style.animationDuration = '0s';
  // document.querySelector('.pendulo').style.animationName = 'none';
}

const Metronomo = () => {
  const { tempo, isPlaying, tempos } = useContext(TempoContext)
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  const audioCtx = new AudioContext();
  // Loading ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
  // fetch the audio file and decode the data
  async function getFile(audioContext, filepath) {
    const response = await fetch(filepath);
    const arrayBuffer = await response.arrayBuffer();
    const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);
    return audioBuffer;
  }
  // create a buffer, plop in data, connect and play -> modify graph here if required
  function playSample(audioContext, audioBuffer) {
    const sampleSource = audioContext.createBufferSource();
    sampleSource.buffer = audioBuffer;
    sampleSource.connect(audioContext.destination)
    sampleSource.start();
    return sampleSource;
  }
  async function setupSample() {
    const filePath = 'audio/tap.wav';
    // Here we're `await`ing the async/promise that is `getFile`.
    // To be able to use this keyword we need to be within an `async` function
    const sample = await getFile(audioCtx, filePath);
    return sample;
  }
  useEffect(()=> {
    // Scheduling ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~
    const lookahead = 25.0; // How frequently to call scheduling function (in milliseconds)
    const scheduleAheadTime = 0.1; // How far ahead to schedule audio (sec)
    let currentNote = 0;
    let nextNoteTime = 0.0; // when the next note is due.
    function nextNote() {
      const secondsPerBeat = 60.0 / tempo;
      nextNoteTime += secondsPerBeat; // Add beat length to last beat time
      currentNote++
    }
    // Create a queue for the notes that are to be played, with the current time that we want them to play:
    const notesInQueue = [];
    let dtmf;
    function scheduleNote(beatNumber, time) {
      // push the note on the queue, even if we're not playing.
      notesInQueue.push({note: beatNumber, time: time});
      if ( currentNote !== 0 ) {
        playSample(audioCtx, dtmf);
      }
    }
    let timerID
    function scheduler() {
      // while there are notes that will need to play before the next interval,
      // schedule them and advance the pointer.
      while (nextNoteTime < audioCtx.currentTime + scheduleAheadTime ) {
          scheduleNote(currentNote, nextNoteTime);
          nextNote();
      }
      timerID = window.setTimeout(scheduler, lookahead);
    }
    // when the sample has loaded allow play
    setupSample()
      .then((sample) => {
        dtmf = sample; // to be used in our playSample function
        if (isPlaying) { // start playing
          // check if context is in suspended state (autoplay policy)
          if (audioCtx.state === 'suspended') {
            audioCtx.resume();
          }
          nextNoteTime = audioCtx.currentTime;
          startPendulo(tempo)
          scheduler(); // kick off scheduling
        } else {
          window.clearTimeout(timerID);
          stopPendulo()
        }
      })
    return () => window.clearInterval(timerID);
  })
  let weightPosition = `calc( ( ${tempos.indexOf(tempo)} + 1 ) * 8.62px)`
  return (
    <div className="metronomo">
        <div className="mask">
          <div className="pendulo">
            <label className="peso" style={{ top: weightPosition}}>
              <svg viewBox="0 0 104 94">
                <g id="conjunto-palo">
                  <g id="peso">
                    <g id="peso-base">
                      <path fill="#666" d="M86 79a13 13 0 01-12 10H30a13 13 0 01-12-10L5 15a8 8 0 018-10h78a8 8 0 018 10z"/>
                      <path fill="none" stroke="#313131" strokeMiterlimit="10" strokeWidth="10" d="M86 79a13 13 0 01-12 10H30a13 13 0 01-12-10L5 15a8 8 0 018-10h78a8 8 0 018 10z"/>
                    </g>
                    <g id="peso-ciruclos">
                      <circle id="circulo2" cx="72.6" cy="28.3" r="12.5" fill="#313131"/>
                      <circle id="circulo1" cx="31.6" cy="28.3" r="12.5" fill="#313131"/>
                    </g>
                  </g>
                </g>
              </svg>
            </label>
          </div>
        </div>
        <svg id="metronomo" viewBox="795 350.9 410 792.2">
          <line id="suelo" className="borde" x1="800" y1="1138.1" x2="1200" y2="1138.1"/>
          <g id="patas">
            <g id="pata2">
              <circle className="base-inferior" cx="1145.5" cy="1111.4" r="22.7"/>
            </g>
            <g id="pata1">
              <circle className="base-inferior" cx="853.3" cy="1111.4" r="22.7"/>
            </g>
          </g>
          <path id="base-superior" className="base-superior" d="M1155.6,856.4H843.4L923,380.1c2.4-14,14.5-24.2,28.7-24.2h95.3c14.2,0,26.3,10.2,28.7,24.2
            L1155.6,856.4z"/>
          <path id="base-inferior" className="base-inferior" d="M1155.6,856.4l33.8,201.2c3,17.7-10.7,33.9-28.7,33.9H838.4c-18,0-31.7-16.2-28.7-33.9
            l33.8-201"/>
          <g id="marcas">
              <line className="marca" x1="950.5" y1="382.2" x2="999.4" y2="382.2"/>
              <line className="marca" x1="999.4" y1="393.9" x2="1048.2" y2="393.9"/>
              <line className="marca" x1="950.5" y1="405.6" x2="999.4" y2="405.6"/>
              <line className="marca" x1="999.4" y1="417.2" x2="1048.2" y2="417.2"/>
              <line className="marca" x1="950.5" y1="428.9" x2="999.4" y2="428.9"/>
              <line className="marca" x1="999.4" y1="440.6" x2="1048.2" y2="440.6"/>
              <line className="marca" x1="950.5" y1="452.3" x2="999.4" y2="452.3"/>
              <line className="marca" x1="999.4" y1="464" x2="1048.2" y2="464"/>
              <line className="marca" x1="950.5" y1="475.7" x2="999.4" y2="475.7"/>
              <line className="marca" x1="999.4" y1="487.4" x2="1048.2" y2="487.4"/>
              <line className="marca" x1="950.5" y1="499.1" x2="999.4" y2="499.1"/>
              <line className="marca" x1="999.4" y1="510.8" x2="1048.2" y2="510.8"/>
              <line className="marca" x1="950.5" y1="522.5" x2="999.4" y2="522.5"/>
              <line className="marca" x1="999.4" y1="534.2" x2="1048.2" y2="534.2"/>
              <line className="marca" x1="950.5" y1="545.8" x2="999.4" y2="545.8"/>
              <line className="marca" x1="999.4" y1="557.5" x2="1048.2" y2="557.5"/>
              <line className="marca" x1="950.5" y1="569.2" x2="999.4" y2="569.2"/>
              <line className="marca" x1="999.4" y1="580.9" x2="1048.2" y2="580.9"/>
              <line className="marca" x1="950.5" y1="592.6" x2="999.4" y2="592.6"/>
              <line className="marca" x1="999.4" y1="604.3" x2="1048.2" y2="604.3"/>
              <line className="marca" x1="950.5" y1="616" x2="999.4" y2="616"/>
              <line className="marca" x1="999.4" y1="627.7" x2="1048.2" y2="627.7"/>
              <line className="marca" x1="950.5" y1="639.4" x2="999.4" y2="639.4"/>
              <line className="marca" x1="999.4" y1="651.1" x2="1048.2" y2="651.1"/>
              <line className="marca" x1="950.5" y1="662.7" x2="999.4" y2="662.7"/>
              <line className="marca" x1="999.4" y1="674.4" x2="1048.2" y2="674.4"/>
              <line className="marca" x1="950.5" y1="686.1" x2="999.4" y2="686.1"/>
              <line className="marca" x1="999.4" y1="697.8" x2="1048.2" y2="697.8"/>
              <line className="marca" x1="950.5" y1="709.5" x2="999.4" y2="709.5"/>
              <line className="marca" x1="999.4" y1="721.2" x2="1048.2" y2="721.2"/>
              <line className="marca" x1="950.5" y1="732.9" x2="999.4" y2="732.9"/>
              <line className="marca" x1="999.4" y1="744.6" x2="1048.2" y2="744.6"/>
              <line className="marca" x1="950.5" y1="756.3" x2="999.4" y2="756.3"/>
              <line className="marca" x1="999.4" y1="768" x2="1048.2" y2="768"/>
              <line className="marca" x1="950.5" y1="779.6" x2="999.4" y2="779.6"/>
              <line className="marca" x1="999.4" y1="791.3" x2="1048.2" y2="791.3"/>
              <line className="marca" x1="950.5" y1="803" x2="999.4" y2="803"/>
              <line className="marca" x1="999.4" y1="380.4" x2="999.4" y2="854.4"/>
          </g>
          <path id="borde-division" className="borde" d="M843.4,856.6h312.2H843.4z"/>
          <path id="borde-base" className="borde" d="M864.4,1091.6c6.9,3.9,11.6,11.3,11.6,19.8c0,12.5-10.2,22.7-22.7,22.7s-22.7-10.2-22.7-22.7
            c0-8.5,4.7-15.9,11.6-19.8l0,0h-3.8c-18,0-31.7-16.2-28.7-33.9l33.8-201v-0.2L923,380.1c2.4-14,14.5-24.2,28.7-24.2h95.3
            c14.2,0,26.3,10.2,28.7,24.2l79.9,476.3l33.8,201.2c3,17.7-10.7,33.9-28.7,33.9h-4.1l0,0c6.9,3.9,11.6,11.3,11.6,19.8
            c0,12.5-10.2,22.7-22.7,22.7s-22.7-10.2-22.7-22.7c0-8.5,4.7-15.9,11.6-19.8L864.4,1091.6z"/>
        </svg>
        <p className="tempo">{tempo} ppm</p>
      </div>
  );
}

export default Metronomo
