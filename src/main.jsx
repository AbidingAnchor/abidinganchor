import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import './styles/theme-overrides.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { requestPermission, scheduleDaily } from './services/notifications'

if ('serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker
      .register('/sw.js')
      .then((reg) => console.log('SW registered:', reg.scope))
      .catch((err) => console.log('SW failed:', err))
  })
}

// Request notification permission and schedule daily notification
const setupNotifications = async () => {
  const granted = await requestPermission()
  if (granted) {
    await scheduleDaily()
  }
}

// Setup notifications when app loads
window.addEventListener('load', () => {
  setupNotifications()
})

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <AuthProvider>
      <App />
    </AuthProvider>
  </StrictMode>,
)
