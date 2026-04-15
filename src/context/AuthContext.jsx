import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'
import { clearAbidingAnchorUserStorage, setActiveStorageUserId, userStorageKey } from '../utils/userStorage'

const AuthContext = createContext({})

const PROFILE_FETCH_TIMEOUT_MS = 5000
const profileSyncedUserIds = new Set()
const EMAIL_CONFIRMATION_SEND_ERROR_MARKERS = [
  'error sending confirmation email',
  'error sending email',
  'confirmation email',
]

function isConfirmationEmailSendError(message = '') {
  const normalized = String(message).toLowerCase()
  return EMAIL_CONFIRMATION_SEND_ERROR_MARKERS.some((marker) => normalized.includes(marker))
}

function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

/**
 * After ensureProfile (which never writes avatar_url), loads the full profile
 * row from the DB — including avatar_url — via SELECT only. No per-step
 * timeout on this SELECT; fetchProfileWithTimeout still caps total wait time.
 */
async function loadProfileRow(user) {
  const { data, error } = await supabase
    .from('profiles')
    .select('*')
    .eq('id', user.id)
    .maybeSingle()

  if (error) {
    console.error('Profile fetch error:', error)
    return null
  }
  return data ?? null
}

/**
 * Full profile sync: ensure row exists, then fetch. Entire operation is capped
 * at PROFILE_FETCH_TIMEOUT_MS so a hung Supabase request cannot block the app.
 */
async function fetchProfileWithTimeout(user) {
  if (!user?.id) return null
  try {
    return await Promise.race([
      (async () => {
        try {
          await Promise.race([
            ensureProfile(user),
            new Promise((_, reject) => {
              setTimeout(
                () => reject(new Error('ensure-profile-timeout')),
                PROFILE_FETCH_TIMEOUT_MS,
              )
            }),
          ])
        } catch {
          // Timeout or ensureProfile failure — still try to load an existing row
        }
        // Separate SELECT: full profile (avatar_url comes from DB only, never from upsert)
        return loadProfileRow(user)
      })(),
      new Promise((resolve) => {
        setTimeout(() => resolve(null), PROFILE_FETCH_TIMEOUT_MS)
      }),
    ])
  } catch (err) {
    console.error('fetchProfileWithTimeout:', err)
    return null
  }
}

async function ensureProfile(user) {
  if (!user?.id) return
  if (!isValidUUID(user.id)) return
  if (profileSyncedUserIds.has(user.id)) return

  // Add BEFORE the await to block any concurrent calls
  profileSyncedUserIds.add(user.id)

  try {
    const { data: existingProfile, error: selectError } = await supabase
      .from('profiles')
      .select('onboarding_complete')
      .eq('id', user.id)
      .maybeSingle()

    if (selectError) {
      console.error('ensureProfile select error:', selectError)
      profileSyncedUserIds.delete(user.id)
      return
    }

    const isNewProfile = !existingProfile
    const baseRow = {
      id: user.id,
      email: user.email ?? '',
      full_name: user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
      bible_version: 'KJV',
      onboarding_complete: existingProfile?.onboarding_complete ?? false,
    }
    /**
     * New rows: no last_active_date until the first daily check-in (local calendar).
     * Do not set last_active_date on upsert for existing users — streak + presence own that column.
     */
    const newUserDefaults = isNewProfile
      ? {
          last_active_date: null,
          reading_streak: 0,
          journal_streak: 0,
          prayer_streak: 0,
          prayer_total_minutes: 0,
          longest_streak: 0,
          last_book: 'GEN',
          last_chapter: 'GEN.1',
          weekly_active_days: [],
        }
      : {}

    const { error } = await supabase.from('profiles').upsert(
      { ...baseRow, ...newUserDefaults },
      { onConflict: 'id' },
    )

    if (error) {
      console.error('Profile upsert error:', error)
      profileSyncedUserIds.delete(user.id)
    }
  } catch (err) {
    console.error('Profile upsert exception:', err)
    profileSyncedUserIds.delete(user.id)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [suspendedInfo, setSuspendedInfo] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    setActiveStorageUserId(user?.id ?? null)
  }, [user?.id])

  /** Per-user anchor for achievements “days since start”; never reuse another account’s value. */
  useEffect(() => {
    if (typeof window === 'undefined' || !user?.id) return
    try {
      const k = userStorageKey(user.id, 'app-start-date')
      if (!localStorage.getItem(k)) {
        localStorage.setItem(k, new Date().toISOString())
      }
    } catch {
      /* ignore */
    }
  }, [user?.id])

  useEffect(() => {
    let active = true
    // Last-resort unblock if getSession() or anything before finally hangs
    const loadingWatchdog = setTimeout(() => {
      if (active) setLoading(false)
    }, PROFILE_FETCH_TIMEOUT_MS + 1000)

    const boot = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const nextUser = session?.user ?? null
        if (!active) return
        setUser(nextUser)
        if (nextUser) {
          let nextProfile = null
          try {
            nextProfile = await fetchProfileWithTimeout(nextUser)
          } catch (err) {
            console.error('Boot profile fetch:', err)
            nextProfile = null
          }
          if (!active) return
          if (nextProfile?.is_banned) {
            setSuspendedInfo({ bannedAt: nextProfile?.banned_at || null })
            setUser(null)
            setProfile(null)
            profileSyncedUserIds.clear()
            clearAbidingAnchorUserStorage()
            await supabase.auth.signOut()
            return
          }
          setSuspendedInfo(null)
          setProfile(nextProfile)
        } else {
          setProfile(null)
        }
      } catch (err) {
        console.error('Auth boot error:', err)
        if (active) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (active) {
          clearTimeout(loadingWatchdog)
          setLoading(false)
        }
      }
    }
    boot()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_, session) => {
        const nextUser = session?.user ?? null
        setUser(nextUser)
        try {
          if (nextUser) {
            let nextProfile = null
            try {
              nextProfile = await fetchProfileWithTimeout(nextUser)
            } catch (err) {
              console.error('onAuthStateChange profile fetch:', err)
              nextProfile = null
            }
            if (nextProfile?.is_banned) {
              setSuspendedInfo({ bannedAt: nextProfile?.banned_at || null })
              setUser(null)
              setProfile(null)
              profileSyncedUserIds.clear()
              clearAbidingAnchorUserStorage()
              await supabase.auth.signOut()
              return
            }
            setSuspendedInfo(null)
            setProfile(nextProfile)
          } else {
            setProfile(null)
          }
        } catch (err) {
          console.error('onAuthStateChange:', err)
          setProfile(null)
        } finally {
          setLoading(false)
        }
      },
    )

    return () => {
      active = false
      clearTimeout(loadingWatchdog)
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email, password, fullName) => {
    try {
      const { data, error } = await supabase.auth.signUp({
        email: email.trim().toLowerCase(),
        password,
        options: { data: { full_name: fullName } },
      })
      if (!error) return { data, error: null, usedEmailFallback: false }
      if (!isConfirmationEmailSendError(error.message)) return { data, error, usedEmailFallback: false }

      // Fallback path: account may exist but confirmation delivery failed.
      // Try password sign-in so users can continue immediately when allowed by project settings.
      const { data: signInData, error: signInError } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
      if (!signInError) return { data: signInData, error: null, usedEmailFallback: true }
      return { data, error, usedEmailFallback: false }
    } catch (error) {
      return { data: null, error, usedEmailFallback: false }
    }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email: email.trim().toLowerCase(), password })
    return { data, error }
  }

  const signOut = async () => {
    profileSyncedUserIds.clear()
    setSuspendedInfo(null)
    clearAbidingAnchorUserStorage()
    await supabase.auth.signOut()
  }

  const refreshProfile = useCallback(async (serverRow) => {
    if (serverRow && typeof serverRow === 'object') {
      setProfile(serverRow)
      return serverRow
    }
    if (!user?.id) return null
    try {
      const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', user.id)
        .maybeSingle()
      if (error) {
        console.error('Profile refresh error:', error)
        return null
      }
      setProfile(data ?? null)
      return data ?? null
    } catch (error) {
      console.error('Profile refresh error:', error)
      return null
    }
  }, [user?.id])

  const value = useMemo(
    () => ({
      user,
      profile,
      suspendedInfo,
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }),
    [user, profile, suspendedInfo, loading, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
