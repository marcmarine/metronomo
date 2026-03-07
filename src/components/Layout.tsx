
import FullScreen from 'react-full-screen'
import Sidebar from '../components/Sidebar'
import Metronomo from '../components/Metronomo'
import Controls from '../components/Controls'
import {  useLayoutContext } from '../contexts/LayoutContext'
import {  useTempoContext } from '../contexts/TempoContext'
import { useKeyboardControls } from '../lib/useKeyboardControls'
import { useWheelTempo } from '../lib/useWheelTempo'

const Layout = () => {
  const { isFullScreen, toggleFullScreen }  = useLayoutContext()
  const { increaseTempo, decreaseTempo, togglePlay } = useTempoContext()

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
