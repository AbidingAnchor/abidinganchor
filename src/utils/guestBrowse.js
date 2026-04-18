import { useSyncExternalStore } from 'react'

/**
 * Lets signed-out users browse a small set of routes (e.g. Bible reader) without an account.
 * Cleared when the user signs in.
 */
export const GUEST_BROWSE_KEY = 'abidinganchor-guest-browse'

export function getGuestBrowse() {
  if (typeof localStorage === 'undefined') return false
  try {
    return localStorage.getItem(GUEST_BROWSE_KEY) === '1'
  } catch {
    return false
  }
}

export function setGuestBrowse(enabled) {
  if (typeof localStorage === 'undefined') return
  try {
    if (enabled) {
      localStorage.setItem(GUEST_BROWSE_KEY, '1')
    } else {
      localStorage.removeItem(GUEST_BROWSE_KEY)
    }
    if (typeof window !== 'undefined') {
      window.dispatchEvent(new Event('abidinganchor-guest-browse'))
    }
  } catch {
    /* ignore */
  }
}

export function clearGuestBrowse() {
  setGuestBrowse(false)
}

function subscribeGuestBrowse(onStoreChange) {
  if (typeof window === 'undefined') return () => {}
  const handler = () => onStoreChange()
  window.addEventListener('storage', handler)
  window.addEventListener('abidinganchor-guest-browse', handler)
  return () => {
    window.removeEventListener('storage', handler)
    window.removeEventListener('abidinganchor-guest-browse', handler)
  }
}

function getGuestBrowseSnapshot() {
  return getGuestBrowse()
}

function getServerGuestSnapshot() {
  return false
}

/** Reactive guest flag for navigation UI (same-tab updates). */
export function useGuestBrowse() {
  return useSyncExternalStore(subscribeGuestBrowse, getGuestBrowseSnapshot, getServerGuestSnapshot)
}
