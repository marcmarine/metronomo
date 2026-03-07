import TempoContextProvider from '../contexts/TempoContext'
import LayoutContextProvider from '../contexts/LayoutContext'
import Layout from './Layout'

function App() {
  return (
      <LayoutContextProvider>
        <TempoContextProvider>
            <Layout />
        </TempoContextProvider>
      </LayoutContextProvider>
  );
}

export default App
