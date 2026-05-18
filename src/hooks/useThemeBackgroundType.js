import { useEffect, useState } from 'react'
import { getBackgroundTypeForTime } from '../components/DayBackground'
import {
  THEME_PREFERENCE_CHANGED_EVENT,
  THEME_PREFERENCE_STORAGE_KEY,
  MANUAL_THEME_PREFERENCE_KEY,
  readManualThemePreference,
  readThemePreferenceFromStorage,
} from '../utils/themePreferenceStorage'

/**
 * Resolves theme: manual selection takes priority over time-based detection.
 */
function safeResolvedTheme() {
  if (typeof window === 'undefined') return 'night'
  try {
    // Check manual key first, then fall back to theme-preference key, then time-based
    const manualPref = readManualThemePreference()
    if (manualPref && manualPref !== 'auto') {
      return manualPref === 'evening' ? 'sunset' : manualPref
    }
    const storedPref = readThemePreferenceFromStorage()
    if (storedPref && storedPref !== 'auto') {
      return storedPref === 'evening' ? 'sunset' : storedPref
    }
    return getBackgroundTypeForTime()
  } catch {
    return 'night'
  }
}

export function useThemeBackgroundType() {
  const [sky, setSky] = useState(safeResolvedTheme)

  useEffect(() => {
    const sync = () => {
      setSky(safeResolvedTheme())
    }

    sync()
    window.addEventListener(THEME_PREFERENCE_CHANGED_EVENT, sync)
    const onStorage = (e) => {
      if (e.key === THEME_PREFERENCE_STORAGE_KEY || e.key === MANUAL_THEME_PREFERENCE_KEY || e.key === null) sync()
    }
    window.addEventListener('storage', onStorage)
    const interval = setInterval(sync, 30 * 1000)
    const onVis = () => {
      if (document.visibilityState === 'visible') sync()
    }
    document.addEventListener('visibilitychange', onVis)

    return () => {
      window.removeEventListener(THEME_PREFERENCE_CHANGED_EVENT, sync)
      window.removeEventListener('storage', onStorage)
      clearInterval(interval)
      document.removeEventListener('visibilitychange', onVis)
    }
  }, [])

  return sky
}
