import { createRoot } from 'react-dom/client'
/** i18next + react-i18next: language from localStorage `abidinganchor-language`, then browser, then English. */
import './i18n.js'
import './index.css'
import './styles/theme-overrides.css'
import App from './App.jsx'
import { AuthProvider } from './context/AuthContext'
import { registerSW } from 'virtual:pwa-register'

registerSW({ immediate: true })

function applyInitialThemeBeforeRender() {
  if (typeof window === 'undefined' || typeof document === 'undefined') return

  let preference = 'automatic'
  try {
    const raw = localStorage.getItem('theme-preference')
    const v = String(raw || '').trim().toLowerCase()
    if (v === 'day' || v === 'evening' || v === 'night' || v === 'automatic') {
      preference = v
    }
  } catch {
    /* ignore */
  }

  const resolveTheme = () => {
    if (preference === 'day') return 'day'
    if (preference === 'evening') return 'sunset'
    if (preference === 'night') return 'night'

    const now = new Date()
    const totalMinutes = now.getHours() * 60 + now.getMinutes()
    if (totalMinutes >= 6 * 60 && totalMinutes < 18 * 60) return 'day'
    if (totalMinutes >= 18 * 60 && totalMinutes < 20 * 60) return 'sunset'
    return 'night'
  }

  const theme = resolveTheme()
  document.documentElement.setAttribute('data-theme', theme)

  const BODY_SKY_CLASSES = [
    'theme-day',
    'theme-morning',
    'theme-afternoon',
    'theme-evening',
    'theme-sunset',
    'theme-night',
  ]
  const { body } = document
  for (const cls of BODY_SKY_CLASSES) body.classList.remove(cls)

  if (theme === 'day') {
    body.classList.add('theme-day')
    body.classList.add(nowHourIsMorning() ? 'theme-morning' : 'theme-afternoon')
  } else if (theme === 'sunset') {
    body.classList.add('theme-sunset', 'theme-evening')
  } else {
    body.classList.add('theme-night')
  }

  function nowHourIsMorning() {
    const h = new Date().getHours()
    return h < 12
  }
}

applyInitialThemeBeforeRender()

createRoot(document.getElementById('root')).render(
  <AuthProvider>
    <App />
  </AuthProvider>,
)
