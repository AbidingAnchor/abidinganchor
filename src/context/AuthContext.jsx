import { createContext, useContext, useEffect, useMemo, useState } from 'react'
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

async function fetchProfileWithTimeout(user) {
  if (!user?.id) return null
  try {
    return await Promise.race([
      ensureProfile(user),
      new Promise((_, reject) => {
        setTimeout(() => reject(new Error('profile-fetch-timeout')), PROFILE_FETCH_TIMEOUT_MS)
      }),
    ])
  } catch {
    return null
  }
}

async function ensureProfile(user) {
  if (!user?.id) return;
  if (!isValidUUID(user.id)) return;
  if (profileSyncedUserIds.has(user.id)) return;
  
  // Add BEFORE the await to block any concurrent calls
  profileSyncedUserIds.add(user.id);

  try {
    const { error } = await supabase
      .from('profiles')
      .upsert({
        id: user.id,
        email: user.email ?? '',
        full_name: user.user_metadata?.full_name 
                   ?? user.user_metadata?.name 
                   ?? '',
        avatar_url: user.user_metadata?.avatar_url ?? null,
        bible_version: 'KJV',
        last_active_date: new Date().toISOString().split('T')[0],
      }, { 
        onConflict: 'id',
        ignoreDuplicates: false 
      });

    if (error) {
      console.error('Profile upsert error:', error);
      // Remove from set so it can retry next session
      profileSyncedUserIds.delete(user.id);
    }
  } catch (err) {
    console.error('Profile upsert exception:', err);
    profileSyncedUserIds.delete(user.id);
  }
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const boot = async () => {
      try {
        const { data: { session } } = await supabase.auth.getSession()
        const nextUser = session?.user ?? null
        if (!active) return
        setUser(nextUser)
        if (nextUser) {
          try {
            const nextProfile = await fetchProfileWithTimeout(nextUser)
            if (!active) return
            setProfile(nextProfile)
          } catch {
            if (!active) return
            setProfile(null)
          }
        } else {
          setProfile(null)
        }
      } catch {
        if (active) {
          setUser(null)
          setProfile(null)
        }
      } finally {
        if (active) setLoading(false)
      }
    }
    boot()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      try {
        if (nextUser) {
          try {
            const nextProfile = await fetchProfileWithTimeout(nextUser)
            setProfile(nextProfile)
          } catch {
            setProfile(null)
          }
        } else {
          setProfile(null)
        }
      } catch {
        setProfile(null)
      } finally {
        setLoading(false)
      }
    })

    return () => {
      active = false
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

  const refreshProfile = async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
      if (error) {
        console.error('Profile refresh error:', error)
        setProfile(null)
        return
      }
      setProfile(data ?? null)
    } catch (error) {
      console.error('Profile refresh error:', error)
      setProfile(null)
    }
  }

  const value = useMemo(() => ({
    user, profile, loading, signUp, signIn, signOut, refreshProfile,
  }), [user, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
