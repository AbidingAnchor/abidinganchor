/** Manual theme selection is temporarily disabled; app always uses automatic time-based theme. */
export const THEME_PREFERENCE_STORAGE_KEY = 'theme-preference'

export const THEME_PREFERENCE_CHANGED_EVENT = 'abidinganchor-theme-preference-changed'

export function normalizeThemePreferenceValue(raw) {
  if (raw == null || raw === '') return 'automatic'
  const t = String(raw).trim().toLowerCase()
  if (t === 'day' || t === 'evening' || t === 'night' || t === 'automatic') return t
  return 'automatic'
}

export function readThemePreferenceFromStorage() {
  return 'automatic'
}

export function writeThemePreferenceToStorage(value) {
  if (typeof localStorage === 'undefined') return
  try {
    // Manual theme selection is disabled for now; keep storage clear.
    localStorage.removeItem(THEME_PREFERENCE_STORAGE_KEY)
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
  // Manual theme selection is disabled; sky is time-based only. Do not emit —
  // emitting on every profile refresh caused BackgroundManager to "thrash" and log repeatedly.
  writeThemePreferenceToStorage('automatic')
}
