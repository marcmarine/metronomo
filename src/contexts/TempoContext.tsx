import React, { createContext, useMemo, useState } from 'react';

export type TempoContextValue = {
  tempo: number
  tempos: number[]
  isPlaying: boolean
  setTempo: (tempo: number) => void
  increaseTempo: () => void
  decreaseTempo: () => void
  togglePlay: () => void
}

export const TempoContext = createContext<TempoContextValue | undefined>(undefined)

type TempoContextProviderProps = {
  children?: React.ReactNode
}

const TempoContextProvider = ({ children }: TempoContextProviderProps) => {
  const [isPlaying, setIsPlaying] = useState(false)

  const tempos = useMemo(
    () => [
      40, 44, 48, 50, 52, 54, 56, 58, 60, 63, 66, 69, 72, 76, 80, 84, 88, 92,
      96, 100, 104, 108, 112, 116, 120, 126, 132, 138, 144, 152, 160, 168,
      176, 184, 192, 200, 208,
    ],
    []
  )

  const [tempo, setTempoState] = useState<number>(tempos[8] ?? 60)

  const setTempo = (nextTempo: number) => {
    if (!tempos.includes(nextTempo)) return
    setIsPlaying(false)
    setTempoState(nextTempo)
  }

  const increaseTempo = () => {
    setIsPlaying(false)
    setTempoState((t) => tempos[Math.min(tempos.indexOf(t) + 1, tempos.length - 1)] ?? t)
  }

  const decreaseTempo = () => {
    setIsPlaying(false)
    setTempoState((t) => tempos[Math.max(tempos.indexOf(t) - 1, 0)] ?? t)
  }

  const togglePlay = () => setIsPlaying((prev) => !prev)

  const value: TempoContextValue = {
    tempo,
    tempos,
    isPlaying,
    setTempo,
    increaseTempo,
    decreaseTempo,
    togglePlay,
  }

  return <TempoContext.Provider value={value}>{children}</TempoContext.Provider>
}

export const useTempoContext = () => {
  const context = React.useContext(TempoContext)
  if (context === undefined) {
    throw new Error('useTempoContext must be used within a TempoContextProvider')
  }
  return context
}

export default TempoContextProvider;
