import { useContext, useCallback } from 'react'
import { LayoutContext } from '../contexts/LayoutContext'

const Controls = () => {
  const layout = useContext(LayoutContext)

  // Should never happen if Controls is rendered under LayoutContextProvider,
  // but guards against undefined at runtime and satisfies TypeScript.
  if (!layout) return null

  const { toggleSidebar } = layout

  const keyPressed = useCallback(
    (event) => {
      if (event.keyCode === 77) {
        toggleSidebar()
      }
    },
    [toggleSidebar]
  )

  return (
    <div className="layout-buttons" tabIndex={0} onKeyUp={keyPressed}>
      <button className="button button--control button--selector" onClick={toggleSidebar}>
        <svg className="button__icon-svg" viewBox="0 0 40 40">
          <title>Icono Menu</title>
          <line x1="5" y1="0" x2="5" y2="40"></line>
          <line x1="20" y1="0" x2="20" y2="40"></line>
          <line x1="35" y1="0" x2="35" y2="40"></line>
        </svg>
      </button>
    </div>
  )
}

export default Controls
