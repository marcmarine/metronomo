import TempoContextProvider from '../contexts/TempoContext'
import LayoutContextProvider from '../contexts/LayoutContext'
import Layout from './Layout'

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
