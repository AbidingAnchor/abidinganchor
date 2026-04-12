import i18n from 'i18next'
import LanguageDetector from 'i18next-browser-languagedetector'
import { initReactI18next } from 'react-i18next'
import en from './locales/en.json'
import es from './locales/es.json'
import pt from './locales/pt.json'
import fr from './locales/fr.json'
import de from './locales/de.json'
import journeyStopsEs from './locales/journeyMapStops.es.js'
import journeyStopsPt from './locales/journeyMapStops.pt.js'
import journeyStopsFr from './locales/journeyMapStops.fr.js'
import journeyStopsDe from './locales/journeyMapStops.de.js'
import { deepMerge } from './utils/deepMerge.js'

export const SUPPORTED_LANGS = ['en', 'es', 'pt', 'fr', 'de']

/** Persisted UI language (Settings + i18n). */
export const LANGUAGE_STORAGE_KEY = 'abidinganchor-language'
const LEGACY_LANGUAGE_KEY = 'abidinganchor-i18n-language'

function migrateLanguageStorage() {
  if (typeof localStorage === 'undefined') return
  try {
    const next = localStorage.getItem(LANGUAGE_STORAGE_KEY)
    const legacy = localStorage.getItem(LEGACY_LANGUAGE_KEY)
    if (!next && legacy && SUPPORTED_LANGS.includes(legacy)) {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, legacy)
    }
  } catch {
    /* ignore */
  }
}

migrateLanguageStorage()

const esMerged = deepMerge(es, { journeyMap: { stops: journeyStopsEs } })
const ptMerged = deepMerge(pt, { journeyMap: { stops: journeyStopsPt } })
const frMerged = deepMerge(fr, { journeyMap: { stops: journeyStopsFr } })
const deMerged = deepMerge(de, { journeyMap: { stops: journeyStopsDe } })

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: { translation: en },
      es: { translation: esMerged },
      pt: { translation: ptMerged },
      fr: { translation: frMerged },
      de: { translation: deMerged },
    },
    fallbackLng: 'en',
    supportedLngs: SUPPORTED_LANGS,
    nonExplicitSupportedLngs: true,
    load: 'languageOnly',
    interpolation: { escapeValue: false },
    detection: {
      order: ['localStorage', 'navigator'],
      caches: ['localStorage'],
      lookupLocalStorage: LANGUAGE_STORAGE_KEY,
    },
  })

i18n.on('languageChanged', (lng) => {
  try {
    if (typeof localStorage !== 'undefined') {
      localStorage.setItem(LANGUAGE_STORAGE_KEY, lng)
    }
  } catch {
    /* ignore */
  }
})

/** @deprecated use LANGUAGE_STORAGE_KEY */
export const I18N_LANGUAGE_KEY = LANGUAGE_STORAGE_KEY
export default i18n
