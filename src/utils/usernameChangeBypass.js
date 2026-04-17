/** Email that always bypasses the one-time username change limit (matches founder account). */
export const ADMIN_UNLIMITED_USERNAME_EMAIL = 'andrewnegron95@gmail.com'

/**
 * @param {{ email?: string | null, isAdmin?: boolean | null }} opts
 * @returns {boolean}
 */
export function hasUnlimitedUsernameChanges({ email, isAdmin }) {
  const e = (email || '').trim().toLowerCase()
  if (e === ADMIN_UNLIMITED_USERNAME_EMAIL) return true
  return isAdmin === true
}
