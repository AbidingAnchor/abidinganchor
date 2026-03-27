const SCENERY_KEY = 'abidinganchor-scenery'

export function getAutoScenery() {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 20 ? 'day' : 'night'
}

export function getSavedScenery() {
  const stored = localStorage.getItem(SCENERY_KEY)
  if (stored === 'day' || stored === 'night') return stored
  return null
}

export function getScenery() {
  return getSavedScenery() ?? getAutoScenery()
}

export function setScenery(next) {
  const value = next === 'night' ? 'night' : 'day'
  localStorage.setItem(SCENERY_KEY, value)
  return value
}

export function toggleScenery(current) {
  return setScenery(current === 'night' ? 'day' : 'night')
}
