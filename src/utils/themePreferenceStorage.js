/** User-chosen app theme; read first by getBackgroundTypeForTime before hour-based logic. */
export const THEME_PREFERENCE_STORAGE_KEY = 'theme-preference'

export const THEME_PREFERENCE_CHANGED_EVENT = 'abidinganchor-theme-preference-changed'

export function normalizeThemePreferenceValue(raw) {
  if (raw == null || raw === '') return 'automatic'
  const t = String(raw).trim().toLowerCase()
  if (t === 'day' || t === 'evening' || t === 'night' || t === 'automatic') return t
  return 'automatic'
}

export function readThemePreferenceFromStorage() {
  if (typeof localStorage === 'undefined') return null
  try {
    const v = localStorage.getItem(THEME_PREFERENCE_STORAGE_KEY)
    if (v == null || v === '') return null
    return normalizeThemePreferenceValue(v)
  } catch {
    return null
  }
}

export function writeThemePreferenceToStorage(value) {
  if (typeof localStorage === 'undefined') return
  try {
    localStorage.setItem(THEME_PREFERENCE_STORAGE_KEY, normalizeThemePreferenceValue(value))
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
  if (!Object.prototype.hasOwnProperty.call(profile, 'theme_preference')) return
  const v = normalizeThemePreferenceValue(profile.theme_preference ?? 'automatic')
  const local = readThemePreferenceFromStorage()
  // Manual local choice is sticky on this device: do not let background
  // profile refreshes overwrite it (including stale DB values).
  if (local && local !== 'automatic' && v !== local) return
  writeThemePreferenceToStorage(v)
  emitThemePreferenceChanged()
}
