import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from 'react'
import { clearCachedSession, getCachedSession, supabase } from '../lib/supabase'
import { clearAbidingAnchorUserStorage, setActiveStorageUserId, userStorageKey } from '../utils/userStorage'
import { clearGuestBrowse } from '../utils/guestBrowse'
import { profileFullNameFromUser } from '../utils/profileDisplay'
import {
  clearThemePreferenceStorage,
  clearManualThemePreference,
  emitThemePreferenceChanged,
  readThemePreferenceFromStorage,
  readManualThemePreference,
  syncThemePreferenceFromProfileRow,
} from '../utils/themePreferenceStorage'

const AuthContext = createContext({})

const PROFILE_FETCH_TIMEOUT_MS = 5000
const ONBOARDING_COMPLETED_KEY = 'onboarding_completed'
const profileSyncedUserIds = new Set()
function isValidUUID(str) {
  return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(str);
}

function applyThemeStorageForProfile(profile) {
  if (typeof window === 'undefined') return
  if (!profile) {
    clearThemePreferenceStorage()
    emitThemePreferenceChanged()
    return
  }
  syncThemePreferenceFromProfileRow(profile)
}

function syncLocalOnboardingCompletion(profile) {
  if (typeof window === 'undefined') return
  try {
    const completed =
      profile?.onboarding_complete === true || profile?.onboarding_completed === true
    if (completed) localStorage.setItem(ONBOARDING_COMPLETED_KEY, 'true')
  } catch {
    /* ignore */
  }
}

/**
 * Handles auth redirects and normalizes URL query params.
 */
async function syncSessionFromAuthRedirectUrl() {
  if (typeof window === 'undefined') return
  try {
    const url = new URL(window.location.href)
    const code = url.searchParams.get('code')
    if (!code) return
    const { error } = await supabase.auth.exchangeCodeForSession(code)
    if (error && !String(error.message || '').toLowerCase().includes('already')) {
      console.error('exchangeCodeForSession:', error.message)
    }
    ;['code', 'error', 'error_description', 'error_code', 'state'].forEach((k) =>
      url.searchParams.delete(k),
    )
    const qs = url.searchParams.toString()
    const path = `${url.pathname}${qs ? `?${qs}` : ''}${url.hash}`
    window.history.replaceState(window.history.state, '', path)
    await getCachedSession({ forceRefresh: true })
  } catch (err) {
    console.error('syncSessionFromAuthRedirectUrl:', err)
  }
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
      .select('onboarding_complete, onboarding_completed')
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
      full_name: profileFullNameFromUser(user),
      bible_version: 'KJV',
      onboarding_complete: existingProfile?.onboarding_complete ?? false,
      onboarding_completed:
        existingProfile?.onboarding_completed ?? existingProfile?.onboarding_complete ?? false,
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
  console.log('AuthProvider rendering')
  
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [suspendedInfo, setSuspendedInfo] = useState(null)
  const [loading, setLoading] = useState(true)
  /** After first boot finishes, auth events must not flip global loading (tab focus / token refresh). */
  const initialBootCompleteRef = useRef(false)
  const userRef = useRef(null)

  useEffect(() => {
    setActiveStorageUserId(user?.id ?? null)
    userRef.current = user ?? null
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
      if (active) {
        setLoading(false)
        initialBootCompleteRef.current = true
      }
    }, PROFILE_FETCH_TIMEOUT_MS + 1000)

    const boot = async () => {
      try {
        await syncSessionFromAuthRedirectUrl()
        let session = await getCachedSession()
        if (!session?.user && typeof window !== 'undefined') {
          const h = window.location.hash || ''
          const q = window.location.search || ''
          if (/access_token|refresh_token|code=/.test(`${q}${h}`)) {
            await new Promise((r) => setTimeout(r, 150))
            session = await getCachedSession({ forceRefresh: true })
          }
        }
        const nextUser = session?.user ?? null
        if (!active) return
        setUser(nextUser)
        if (nextUser) {
          clearGuestBrowse()
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
            applyThemeStorageForProfile(null)
            profileSyncedUserIds.clear()
            clearAbidingAnchorUserStorage()
            await supabase.auth.signOut()
            return
          }
          setSuspendedInfo(null)
          setProfile(nextProfile)
          applyThemeStorageForProfile(nextProfile)
          syncLocalOnboardingCompletion(nextProfile)
        } else {
          setProfile(null)
          applyThemeStorageForProfile(null)
        }
      } catch (err) {
        console.error('Auth boot error:', err)
        if (active) {
          setUser(null)
          setProfile(null)
          applyThemeStorageForProfile(null)
        }
      } finally {
        if (active) {
          clearTimeout(loadingWatchdog)
          setLoading(false)
          initialBootCompleteRef.current = true
        }
      }
    }
    boot()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (event, session) => {
        if (event === 'TOKEN_REFRESHED') return

        const nextUser = session?.user ?? null
        setUser(nextUser)
        try {
          if (nextUser) clearGuestBrowse()
          if (!nextUser) {
            setProfile(null)
            applyThemeStorageForProfile(null)
            setLoading(false)
            return
          }
          // Never show the global loading screen here — only the first boot() may block the app.
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
            applyThemeStorageForProfile(null)
            profileSyncedUserIds.clear()
            clearAbidingAnchorUserStorage()
            await supabase.auth.signOut()
            return
          }
          setSuspendedInfo(null)
          setProfile(nextProfile)
          applyThemeStorageForProfile(nextProfile)
          syncLocalOnboardingCompletion(nextProfile)
        } catch (err) {
          console.error('onAuthStateChange:', err)
          setProfile(null)
          applyThemeStorageForProfile(null)
        } finally {
          if (!nextUser) setLoading(false)
        }
      },
    )

    return () => {
      active = false
      clearTimeout(loadingWatchdog)
      subscription.unsubscribe()
    }
  }, [])

  /** Tab focus / bfcache: refresh session + profile in the background without toggling `loading`. */
  useEffect(() => {
    if (typeof window === 'undefined' || typeof document === 'undefined') return

    let debounceId = null
    const runSilent = async () => {
      if (!initialBootCompleteRef.current) return
      
      // Check for manual theme preference FIRST - before ANY other code runs
      const manualThemePref = readManualThemePreference()
      if (manualThemePref && manualThemePref !== 'auto') {
        // User has manually selected a theme - preserve it, emit event and return immediately
        emitThemePreferenceChanged()
        return
      }
      
      try {
        const { data: { session }, error } = await supabase.auth.getSession()
        if (error) return
        const nextUser = session?.user ?? null
        setUser(nextUser)
        if (!nextUser) {
          // Guard against transient null sessions during background refresh.
          // Do not clear a manual theme preference unless user was already signed out.
          const localThemePref = readThemePreferenceFromStorage()
          const hadSignedInUser = Boolean(userRef.current?.id)
          if (hadSignedInUser && localThemePref && localThemePref !== 'automatic') return
          setProfile(null)
          applyThemeStorageForProfile(null)
          return
        }
        // One lightweight SELECT — no ensureProfile upsert, no global loading.
        let nextProfile = null
        try {
          nextProfile = await loadProfileRow(nextUser)
        } catch (err) {
          console.error('Silent visibility profile fetch:', err)
          nextProfile = null
        }
        if (nextProfile?.is_banned) {
          setSuspendedInfo({ bannedAt: nextProfile?.banned_at || null })
          setUser(null)
          setProfile(null)
          applyThemeStorageForProfile(null)
          profileSyncedUserIds.clear()
          clearAbidingAnchorUserStorage()
          await supabase.auth.signOut()
          return
        }
        setSuspendedInfo(null)
        setProfile(nextProfile)
        // No manual preference (already checked above) - safe to sync from profile
        applyThemeStorageForProfile(nextProfile)
        syncLocalOnboardingCompletion(nextProfile)
      } catch (e) {
        console.warn('Silent session refresh:', e)
      }
    }

    const schedule = () => {
      // Check for manual theme preference FIRST - before ANY other code runs
      const manualThemePref = readManualThemePreference()
      if (manualThemePref && manualThemePref !== 'auto') {
        // User has manually selected a theme - preserve it, emit event and return immediately
        emitThemePreferenceChanged()
        return
      }
      
      if (debounceId) clearTimeout(debounceId)
      debounceId = window.setTimeout(() => {
        debounceId = null
        if (document.visibilityState === 'visible') void runSilent()
      }, 80)
    }

    const onVisibility = () => {
      if (document.visibilityState === 'visible') schedule()
    }

    window.addEventListener('focus', schedule)
    window.addEventListener('pageshow', schedule)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (debounceId) clearTimeout(debounceId)
      window.removeEventListener('focus', schedule)
      window.removeEventListener('pageshow', schedule)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [])

  const signUp = async (email, password, fullName) => {
    try {
      const trimmedName = typeof fullName === 'string' ? fullName.trim() : ''
      if (!trimmedName) {
        return { data: null, error: { message: 'Display name is required.' } }
      }
      const emailNorm = email.trim().toLowerCase()
      if (trimmedName.toLowerCase() === emailNorm) {
        return {
          data: null,
          error: { message: 'Display name cannot be your email address.' },
        }
      }
      const emailRedirectTo =
        typeof window !== 'undefined' ? `${window.location.origin}/auth` : undefined
      const { data, error } = await supabase.auth.signUp({
        email: emailNorm,
        password,
        options: {
          data: { full_name: trimmedName },
          ...(emailRedirectTo ? { emailRedirectTo } : {}),
        },
      })
      return { data, error }
    } catch (error) {
      return { data: null, error }
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
    clearThemePreferenceStorage()
    clearManualThemePreference()
    emitThemePreferenceChanged()
    clearCachedSession()
    await supabase.auth.signOut()
  }

  const refreshProfile = useCallback(async (serverRow) => {
    if (serverRow && typeof serverRow === 'object') {
      setProfile(serverRow)
      applyThemeStorageForProfile(serverRow)
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
      if (data) applyThemeStorageForProfile(data)
      if (data) syncLocalOnboardingCompletion(data)
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
