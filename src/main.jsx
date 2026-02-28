import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import pkg from '../package.json'

// Dynamic Title Logic
if (import.meta.env.DEV) {
  document.title = `Lottieny v${pkg.version}`;
} else {
  document.title = 'Lottieny'; // Public hosted version
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
