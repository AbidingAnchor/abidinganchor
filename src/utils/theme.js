import { getActiveStorageUserId, userStorageKey } from './userStorage'

function themeKey() {
  return userStorageKey(getActiveStorageUserId(), 'theme')
}

export function getTheme() {
  const stored = localStorage.getItem(themeKey())
  return stored === 'night' ? 'night' : 'day'
}

export function setTheme(theme) {
  const next = theme === 'night' ? 'night' : 'day'
  localStorage.setItem(themeKey(), next)
  return next
}
