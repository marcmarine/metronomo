
import FullScreen from './FullScreen'
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
  })

  return (
    <FullScreen
      enabled={isFullScreen}
      onChange={(enabled) => {
        if (enabled !== isFullScreen) toggleFullScreen()
      }}
    >
      <Metronomo />
      <Controls />
    </FullScreen>
  )
}

export default Layout
