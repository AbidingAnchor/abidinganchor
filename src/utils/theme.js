const THEME_KEY = 'abidinganchor-theme'

export function getTheme() {
  const stored = localStorage.getItem(THEME_KEY)
  return stored === 'night' ? 'night' : 'day'
}

export function setTheme(theme) {
  const next = theme === 'night' ? 'night' : 'day'
  localStorage.setItem(THEME_KEY, next)
  return next
}
