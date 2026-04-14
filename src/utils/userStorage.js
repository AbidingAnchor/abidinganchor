/**
 * Browser storage scoped per signed-in user so data does not leak across accounts
 * on the same device. Keys use the prefix `abidinganchor` so sign-out can wipe them.
 */

export const USER_STORAGE_PREFIX = 'abidinganchor'

/** Set from AuthContext whenever the session user changes (including null on sign-out). */
let activeStorageUserId = null

export function setActiveStorageUserId(userId) {
  activeStorageUserId = userId ?? null
}

/** Current signed-in user id for namespaced keys; null if signed out or not yet resolved. */
export function getActiveStorageUserId() {
  return activeStorageUserId
}

/**
 * Stable key for the current user. Prefer this for any per-user local data.
 * @param {string | undefined | null} userId
 * @param {string} name short suffix, e.g. 'bible-book-index'
 */
export function userStorageKey(userId, name) {
  if (!userId) return `${USER_STORAGE_PREFIX}-anon-${name}`
  return `${USER_STORAGE_PREFIX}-${userId}-${name}`
}

/**
 * Removes every localStorage entry written under the app prefix (all users on this browser).
 * Call on sign out so the next session never reads stale client data.
 */
export function clearAbidingAnchorUserStorage() {
  if (typeof localStorage === 'undefined') return
  try {
    const keysToRemove = Object.keys(localStorage).filter((key) => key.startsWith(USER_STORAGE_PREFIX))
    keysToRemove.forEach((key) => localStorage.removeItem(key))
  } catch (e) {
    console.warn('clearAbidingAnchorUserStorage', e)
  }
}
