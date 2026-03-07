
import FullScreen from 'react-full-screen'
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
    <FullScreen enabled={isFullScreen}>
      <Metronomo />
      <Controls />
    </FullScreen>
  )
}

export default Layout
