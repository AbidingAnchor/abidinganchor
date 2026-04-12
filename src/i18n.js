import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'
import pt from './locales/pt.json'
import fr from './locales/fr.json'
import de from './locales/de.json'

export const SUPPORTED_LANGS = ['en', 'es', 'pt', 'fr', 'de']
const STORAGE_KEY = 'abidinganchor-i18n-language'

function getInitialLanguage() {
  if (typeof window === 'undefined') return 'en'
  try {
    const saved = localStorage.getItem(STORAGE_KEY)
    if (saved && SUPPORTED_LANGS.includes(saved)) return saved
  } catch {
    /* ignore */
  }
  const nav = (typeof navigator !== 'undefined' && navigator.language) || 'en'
  const code = String(nav).split(/[-_]/)[0].toLowerCase()
  if (SUPPORTED_LANGS.includes(code)) return code
  return 'en'
}

i18n.use(initReactI18next).init({
  resources: {
    en: { translation: en },
    es: { translation: es },
    pt: { translation: pt },
    fr: { translation: fr },
    de: { translation: de },
  },
  lng: getInitialLanguage(),
  fallbackLng: 'en',
  interpolation: { escapeValue: false },
})

i18n.on('languageChanged', (lng) => {
  try {
    if (typeof localStorage !== 'undefined') localStorage.setItem(STORAGE_KEY, lng)
  } catch {
    /* ignore */
  }
})

export { STORAGE_KEY as I18N_LANGUAGE_KEY }
export default i18n
