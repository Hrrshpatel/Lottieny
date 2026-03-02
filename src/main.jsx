import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import PreviewDemo from './PreviewDemo.jsx'
import pkg from '../package.json'
import { Analytics } from '@vercel/analytics/react'

// Dynamic Title Logic
if (import.meta.env.DEV) {
  document.title = `Lottieny v${pkg.version}`;
} else {
  document.title = 'Lottieny';
}

// Route: ?preview loads the PreviewWindow demo page
const isPreview = new URLSearchParams(window.location.search).has('preview');

createRoot(document.getElementById('root')).render(
  <StrictMode>
    {isPreview ? <PreviewDemo /> : <App />}
    <Analytics />
  </StrictMode>,
)
