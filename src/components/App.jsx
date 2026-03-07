import React  from 'react'
import TempoContextProvider from '../contexts/TempoContext'
import LayoutContextProvider from '../contexts/LayoutContext'
import Layout from './Layout.jsx'

function App() {
  return (
    <div className="App">
      <LayoutContextProvider>
        <TempoContextProvider>
            <Layout />
        </TempoContextProvider>
      </LayoutContextProvider>
    </div>
  );
}

export default App
