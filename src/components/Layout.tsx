import { useContext } from 'react'
import FullScreen from 'react-full-screen'
import Sidebar from '../components/Sidebar'
import Metronomo from '../components/Metronomo'
import Controls from '../components/Controls'
import { LayoutContext } from '../contexts/LayoutContext'
import { TempoContext } from '../contexts/TempoContext'
import { useKeyboardControls } from '../lib/useKeyboardControls'
import { useWheelTempo } from '../lib/useWheelTempo'

const Layout = () => {
  const layout = useContext(LayoutContext)
  const tempoCtx = useContext(TempoContext)

  // Should never happen if Layout is rendered under the providers,
  // but guards against undefined at runtime and satisfies TypeScript.
  if (!layout || !tempoCtx) return null

  const { isFullScreen, toggleFullScreen } = layout
  const { increaseTempo, decreaseTempo, togglePlay } = tempoCtx

  useKeyboardControls({
    increaseTempo,
    decreaseTempo,
    togglePlay,
    toggleFullScreen,
  })

  useWheelTempo({
    increaseTempo,
    decreaseTempo,
    options: {
      enabled: true,
      preventScroll: true,
      // No target => listens on window (same "global" pattern as keyboard shortcuts)
      // If you want to limit it to a specific area later, pass `target`.
      // shouldHandleEvent: (e) => !(e.target instanceof Element) || !e.target.closest('.controls'),
    },
  })

  return (
    <FullScreen enabled={isFullScreen}>
      <Sidebar />
      <Metronomo />
      <Controls />
    </FullScreen>
  )
}

export default Layout
