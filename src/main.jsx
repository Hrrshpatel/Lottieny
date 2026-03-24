import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import pkg from '../package.json'
import { Analytics } from '@vercel/analytics/react'

// Dynamic Title Logic
if (import.meta.env.DEV) {
  document.title = `Lottiney v${pkg.version}`;
} else {
  document.title = 'Lottiney';
}

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
    <Analytics />
  </StrictMode>,
)
