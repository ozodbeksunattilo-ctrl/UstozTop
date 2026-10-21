import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './components/fx.css'
import './i18nExtra.js'
import App from './App.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
