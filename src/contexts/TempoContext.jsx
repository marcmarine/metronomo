import React, { createContext, useState } from 'react';

export const TempoContext = createContext()

const TempoContextProvider = (props) => {
  const [ isPlaying, toggleIsPlaying ]= useState(false)
  const tempos = [ 40, 44, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 76, 80, 84, 88, 92, 96, 100, 104, 108, 112, 116, 120, 126, 132, 138, 144, 152, 160, 168, 176, 184, 192, 200, 208]
  const [ tempo, setTempo ] = useState(tempos[8])
  const increaseTempo = () => {
    toggleIsPlaying(false)
    setTempo(tempos[tempos.indexOf(tempo) + 1])
  }
  const decreaseTempo = () => {
    toggleIsPlaying(false)
    setTempo(tempos[tempos.indexOf(tempo) - 1])
  }
  const togglePlay = () => toggleIsPlaying(!isPlaying)
  return (
    <TempoContext.Provider value={{tempo, increaseTempo, decreaseTempo, tempos, isPlaying, togglePlay}}>
      { props.children }
    </TempoContext.Provider>
  );
}
 
export default TempoContextProvider;