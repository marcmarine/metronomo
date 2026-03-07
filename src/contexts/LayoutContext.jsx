import React, { createContext, useState } from 'react';

export const LayoutContext = createContext()

const LayoutContextProvider = (props) => {
  const [ sidebar, setSidebar ] = useState(false)
  const [ isFullScreen, setIsFullScreen ] = useState(false)
  const toggleSidebar = () => setSidebar(!sidebar)
  const toggleFullScreen = () => setIsFullScreen(!isFullScreen)
  return (
    <LayoutContext.Provider value={{sidebar, toggleSidebar, isFullScreen, toggleFullScreen}}>
      { props.children }
    </LayoutContext.Provider>
  );
}

export default LayoutContextProvider;
