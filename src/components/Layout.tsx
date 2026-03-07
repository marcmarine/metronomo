import { useContext } from 'react'
import FullScreen from 'react-full-screen'
import Sidebar from '../components/Sidebar'
import Metronomo from '../components/Metronomo'
import Controls from '../components/Controls'
import { LayoutContext } from '../contexts/LayoutContext'

const Layout = () => {
  const layout = useContext(LayoutContext)

  // Should never happen if Layout is rendered under LayoutContextProvider,
  // but guards against undefined at runtime and satisfies TypeScript.
  if (!layout) return null

  const { isFullScreen } = layout

  return (
    <FullScreen enabled={isFullScreen}>
      <Sidebar />
      <Metronomo />
      <Controls />
    </FullScreen>
  )
}

export default Layout
