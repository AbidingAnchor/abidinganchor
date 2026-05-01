/** Manual theme selection is temporarily disabled; app always uses automatic time-based theme. */
export const THEME_PREFERENCE_STORAGE_KEY = 'theme-preference'

export const THEME_PREFERENCE_CHANGED_EVENT = 'abidinganchor-theme-preference-changed'

export function normalizeThemePreferenceValue(raw) {
  if (raw == null || raw === '') return 'auto'
  const t = String(raw).trim().toLowerCase()
  if (t === 'day' || t === 'evening' || t === 'night' || t === 'auto') return t
  return 'auto'
}

export function readThemePreferenceFromStorage() {
  if (typeof localStorage === 'undefined') return 'auto'
  try {
    const raw = localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)
    return normalizeThemePreferenceValue(raw)
  } catch {
    return 'auto'
  }
}

export function writeThemePreferenceToStorage(value) {
  if (typeof localStorage === 'undefined') return
  try {
    const normalized = normalizeThemePreferenceValue(value)
    if (normalized === 'auto') {
      localStorage.removeItem(THEME_PREFERENCE_STORAGE_KEY)
    } else {
      localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, normalized)
    }
  } catch {
    /* ignore */
  }
}

export function clearThemePreferenceStorage() {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.removeItem(THEME_PREFERENCE_STORAGE_KEY)
  } catch {
    /* ignore */
  }
}

export function emitThemePreferenceChanged() {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new Event(THEME_PREFERENCE_CHANGED_EVENT))
}

/** Call when a full (or theme-updating) profile row arrives from Supabase. */
export function syncThemePreferenceFromProfileRow(profile) {
  if (!profile || typeof profile !== 'object') return
  // Manual theme selection is now enabled; sky can be time-based or manual.
  // Do not emit — emitting on every profile refresh caused BackgroundManager to "thrash" and log repeatedly.
  writeThemePreferenceToStorage('auto')
}
