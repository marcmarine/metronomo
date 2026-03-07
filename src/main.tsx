import ReactDOM from 'react-dom'
import App from './components/App'

import './index.css'

const rootEl = document.getElementById('root')

if (!rootEl) {
  throw new Error('Root element #root not found')
}

ReactDOM.render(<App />, rootEl)
