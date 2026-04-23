import { createRoot } from 'react-dom/client'
/** i18next + react-i18next: language from localStorage `abidinganchor-language`, then browser, then English. */
import i18n from './i18n'
console.log('i18n initialized language:', i18n.language)
console.log('localStorage language key:', localStorage.getItem('abidinganchor-language'))
import './index.css'
import './styles/theme-overrides.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { FellowshipProvider } from './context/FellowshipContext'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <FellowshipProvider>
      <App />
    </FellowshipProvider>
  </AuthProvider>,
)
