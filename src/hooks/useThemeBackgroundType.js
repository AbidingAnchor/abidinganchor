import { useEffect, useState } from 'react'
import { getBackgroundTypeForTime } from '../components/DayBackground'
import {
  THEME_PREFERENCE_CHANGED_EVENT,
  THEME_PREFERENCE_STORAGE_KEY,
  readManualThemePreference,
} from '../utils/themePreferenceStorage'

/**
 * Reactive sky period for UI that should match BackgroundManager (local time, same bands).
 */
function safeBackgroundType() {
  if (typeof window === 'undefined') return 'night'
  try {
    return getBackgroundTypeForTime()
  } catch {
    return 'night'
  }
}

export function useThemeBackgroundType() {
  const [sky, setSky] = useState(safeBackgroundType)

  useEffect(() => {
    const sync = () => {
      // Check for manual theme preference FIRST - before ANY other code runs
      const manualPref = readManualThemePreference()
      if (manualPref && manualPref !== 'auto') {
        // User has manually selected a theme - preserve it
        const theme = manualPref === 'evening' ? 'sunset' : manualPref
        setSky(theme)
        return
      }
      setSky(safeBackgroundType())
    }

    sync()
    window.addEventListener(THEME_PREFERENCE_CHANGED_EVENT, sync)
    const onStorage = (e) => {
      if (e.key === THEME_PREFERENCE_STORAGE_KEY || e.key === null) sync()
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
