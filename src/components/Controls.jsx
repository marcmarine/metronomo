import React, { useEffect, useContext } from 'react'
import { LayoutContext } from '../contexts/LayoutContext'


const Controls = () => {
  const { toggleSidebar } = useContext(LayoutContext)
  const keyPressed = (event) => {
    if (event.keyCode === 77) {
      toggleSidebar()
    }
  }
  useEffect(() => {
    const buttonsControl = document.querySelectorAll('.button--control')
    buttonsControl.forEach(button => {
      button.addEventListener('focus', function() {
        this.blur();
      })
    })
    window.addEventListener('keyup', keyPressed)
    return () => {
      window.removeEventListener('keyup', keyPressed)
    }
  })
  return (
    <div className="layout-buttons">
      <button className="button button--control button--selector" onClick={toggleSidebar}>
        <svg className="button__icon-svg" viewBox="0 0 40 40">
          <title>Icono Menu</title>
          <line x1="5" y1="0" x2="5" y2="40"></line>
          <line x1="20" y1="0" x2="20" y2="40"></line>
          <line x1="35" y1="0" x2="35" y2="40"></line>
        </svg>
      </button>
    </div>
  );
}
 
export default Controls