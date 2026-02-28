import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import PreviewDemo from './PreviewDemo.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <PreviewDemo />
  </StrictMode>,
)
