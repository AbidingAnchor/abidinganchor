import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
/** i18next + react-i18next: language from localStorage `abidinganchor-language`, then browser, then English. */
import './i18n.js'
import './index.css'
import './styles/theme-overrides.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
