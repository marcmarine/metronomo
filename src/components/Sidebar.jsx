import React, { useEffect, useContext } from 'react'
import { LayoutContext } from '../contexts/LayoutContext'
import { TempoContext } from '../contexts/TempoContext'

const Sidebar = () => {
  const { sidebar, isFullScreen, toggleFullScreen } = useContext(LayoutContext)
  const { tempo, tempos, increaseTempo, decreaseTempo, togglePlay, isPlaying } = useContext(TempoContext)
  const keyPressed = (event) => {
    if (event.keyCode === 70) {
      toggleFullScreen()
    }
    if (event.keyCode === 32) {
      togglePlay()
    }
    if ((event.keyCode === 37 || event.keyCode === 40 ) && tempo !== 40 ) {
      decreaseTempo()
    }
    if (( event.keyCode === 39 || event.keyCode ===  38 ) && tempo !== 208) {
      increaseTempo()
    }
  }
  useEffect(() => {
    window.addEventListener('keyup', keyPressed)
    return () => {
      window.removeEventListener('keyup', keyPressed)
    }
  })
  return (
    <>
      {sidebar && 
        <div className="controls">
          <button className="button button--control" onClick={toggleFullScreen}>
            {isFullScreen ? (
              <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path d="M5 16h3v3h2v-5H5v2zm3-8H5v2h5V5H8v3zm6 11h2v-3h3v-2h-5v5zm2-11V5h-2v5h5V8h-3z"/></svg>
              
            ) : (
              <svg viewBox="0 0 24 24"><path d="M0 0h24v24H0z" fill="none"/><path d="M7 14H5v5h5v-2H7v-3zm-2-4h2V7h3V5H5v5zm12 7h-3v2h5v-5h-2v3zM14 5v2h3v3h2V5h-5z"/></svg>
            )}
          </button>
          <button className="button button--control" onClick={decreaseTempo} disabled={tempo <= tempos[0]}>
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" width="18px" height="18px"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 13H5v-2h14v2z"/></svg>
          </button>
          <button className="button button--control" onClick={togglePlay}>{isPlaying ? (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" width="18px" height="18px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M6 19h4V5H6v14zm8-14v14h4V5h-4z"/></svg>
          ) : (
            <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" width="18px" height="18px"><path d="M0 0h24v24H0V0z" fill="none"/><path d="M10 8.64L15.27 12 10 15.36V8.64M8 5v14l11-7L8 5z"/></svg>
          )}</button>
          <button className="button button--control" onClick={increaseTempo} disabled={tempo >= tempos[tempos.length - 1]}>
          <svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24" fill="black" width="18px" height="18px"><path d="M0 0h24v24H0z" fill="none"/><path d="M19 13h-6v6h-2v-6H5v-2h6V5h2v6h6v2z"/></svg>
          </button>
        </div>
      }
    </>
  )
}

export default Sidebar