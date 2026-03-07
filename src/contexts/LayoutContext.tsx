import React, { createContext, useState } from 'react';

export type LayoutContextValue = {
  sidebar: boolean
  isFullScreen: boolean
  toggleSidebar: () => void
  toggleFullScreen: () => void
}

export const LayoutContext = createContext<LayoutContextValue | undefined>(undefined)

type LayoutContextProviderProps = {
  children?: React.ReactNode
}

const LayoutContextProvider = ({ children }: LayoutContextProviderProps) => {
  const [sidebar, setSidebar] = useState(false)
  const [isFullScreen, setIsFullScreen] = useState(false)

  const toggleSidebar = () => setSidebar((s) => !s)
  const toggleFullScreen = () => setIsFullScreen((f) => !f)

  const value: LayoutContextValue = { sidebar, toggleSidebar, isFullScreen, toggleFullScreen }

  return <LayoutContext.Provider value={value}>{children}</LayoutContext.Provider>
}

export const useLayoutContext = () => {
  const context = React.useContext(LayoutContext)
  if (context === undefined) {
    throw new Error('useLayoutContext must be used within a LayoutContextProvider')
  }
  return context
}

export default LayoutContextProvider;
