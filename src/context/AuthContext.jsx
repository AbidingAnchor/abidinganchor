import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

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
 * Loads profile after ensureProfile. No per-step timeout on the SELECT — the
 * outer fetchProfileWithTimeout race caps total wait time.
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
      .select('id, avatar_url')
      .eq('id', user.id)
      .maybeSingle()

    if (selectError) {
      console.error('ensureProfile select error:', selectError)
      profileSyncedUserIds.delete(user.id)
      return
    }

    const metaAvatar =
      user.user_metadata?.avatar_url ?? user.user_metadata?.picture ?? null

    const syncFields = {
      email: user.email ?? '',
      full_name:
        user.user_metadata?.full_name ?? user.user_metadata?.name ?? '',
      bible_version: 'KJV',
      last_active_date: new Date().toISOString().split('T')[0],
    }

    // Never use upsert for existing rows: PostgREST maps omitted/NULL avatar_url
    // into EXCLUDED and can wipe Storage URLs on conflict. If a row exists,
    // UPDATE only non-avatar fields so avatar_url is never touched.
    if (existingProfile) {
      const { error } = await supabase
        .from('profiles')
        .update(syncFields)
        .eq('id', user.id)

      if (error) {
        console.error('Profile update error:', error)
        profileSyncedUserIds.delete(user.id)
      }
    } else {
      const { error } = await supabase.from('profiles').insert({
        id: user.id,
        ...syncFields,
        avatar_url: metaAvatar,
      })

      if (error) {
        // Row may have been created concurrently; sync without touching avatar_url
        if (error.code === '23505') {
          const { error: retryErr } = await supabase
            .from('profiles')
            .update(syncFields)
            .eq('id', user.id)
          if (retryErr) {
            console.error('Profile update after insert conflict:', retryErr)
            profileSyncedUserIds.delete(user.id)
          }
        } else {
          console.error('Profile insert error:', error)
          profileSyncedUserIds.delete(user.id)
        }
      }
    }
  } catch (err) {
    console.error('Profile upsert exception:', err)
    profileSyncedUserIds.delete(user.id)
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

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
      loading,
      signUp,
      signIn,
      signOut,
      refreshProfile,
    }),
    [user, profile, loading, refreshProfile],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
