import React, { createContext, useMemo, useState } from 'react';

export type TempoContextValue = {
  tempo: number
  tempos: number[]
  isPlaying: boolean
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

  const [tempo, setTempo] = useState<number>(tempos[8] ?? 60)

  const increaseTempo = () => {
    setIsPlaying(false)
    setTempo((t) => tempos[Math.min(tempos.indexOf(t) + 1, tempos.length - 1)] ?? t)
  }

  const decreaseTempo = () => {
    setIsPlaying(false)
    setTempo((t) => tempos[Math.max(tempos.indexOf(t) - 1, 0)] ?? t)
  }

  const togglePlay = () => setIsPlaying((prev) => !prev)

  const value: TempoContextValue = {
    tempo,
    tempos,
    isPlaying,
    increaseTempo,
    decreaseTempo,
    togglePlay,
  }

  return <TempoContext.Provider value={value}>{children}</TempoContext.Provider>
}

export default TempoContextProvider;
