import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import 'leaflet/dist/leaflet.css'
import './styles.css'
import App from './App.tsx'
import { bootstrapTheme } from './lib/theme'

// React マウント前に <html data-theme> を立てて FOUC（一瞬の白チラ）を防ぐ。
bootstrapTheme()

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
