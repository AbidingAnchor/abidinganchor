import { useAuth } from '../context/AuthContext'
import { useGuestBrowse } from '../utils/guestBrowse'

/** True when browsing as guest (no Supabase session + guest flag). */
export function useIsGuestSession() {
  const { user } = useAuth()
  const guestBrowse = useGuestBrowse()
  return Boolean(!user && guestBrowse)
}
