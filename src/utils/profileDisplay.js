/**
 * Display name for profiles: never treat the account email as a chosen name.
 */

export function profileFullNameFromUser(user) {
  if (!user) return ''
  const raw = user.user_metadata?.full_name ?? user.user_metadata?.name
  const trimmed = typeof raw === 'string' ? raw.trim() : ''
  if (!trimmed) return ''
  const email = (user.email || '').trim().toLowerCase()
  if (email && trimmed.toLowerCase() === email) return ''
  return trimmed
}

/** Prefill onboarding from profile/metadata, excluding email masquerading as a name. */
export function initialDisplayNameFromAuth(user, profile) {
  const fromProfile = typeof profile?.full_name === 'string' ? profile.full_name.trim() : ''
  const fromMeta = profileFullNameFromUser(user)
  const email = (user?.email || '').trim().toLowerCase()
  const pick = fromProfile || fromMeta
  if (pick && email && pick.toLowerCase() === email) return ''
  return pick
}
