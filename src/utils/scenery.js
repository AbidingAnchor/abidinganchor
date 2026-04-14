import { getActiveStorageUserId, userStorageKey } from './userStorage'

function sceneryKey() {
  return userStorageKey(getActiveStorageUserId(), 'scenery')
}

export function getAutoScenery() {
  const hour = new Date().getHours()
  return hour >= 6 && hour < 20 ? 'day' : 'night'
}

export function getSavedScenery() {
  const stored = localStorage.getItem(sceneryKey())
  if (stored === 'day' || stored === 'night') return stored
  return null
}

export function getScenery() {
  return getSavedScenery() ?? getAutoScenery()
}

export function setScenery(next) {
  const value = next === 'night' ? 'night' : 'day'
  localStorage.setItem(sceneryKey(), value)
  return value
}

export function toggleScenery(current) {
  return setScenery(current === 'night' ? 'day' : 'night')
}
