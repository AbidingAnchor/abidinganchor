import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

const PROFILE_FETCH_TIMEOUT_MS = 5000
const profileSyncedUserIds = new Set()
let authStateChangeCount = 0
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
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  return uuidRegex.test(str)
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
  console.trace('ensureProfile called for user:', user?.id)
  if (!user?.id) return null
  
  // Skip if we've already synced this user ID (prevents infinite loops)
  if (profileSyncedUserIds.has(user.id)) {
    console.log('Profile already synced for user:', user.id, '- skipping upsert')
    const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    if (error) {
      console.error('Profile query error:', error)
      return null
    }
    return data ?? null
  }

  // Validate UUID before upserting
  if (!isValidUUID(user.id)) {
    console.error('Invalid user ID format:', user.id)
    return null
  }

  // Mark as synced BEFORE the await to prevent race conditions
  profileSyncedUserIds.add(user.id)

  const fullName = user.user_metadata?.full_name || ''
  const payload = {
    id: user.id,
    full_name: fullName || null,
    updated_at: new Date().toISOString()
  }
  console.log('Upserting profile with payload:', payload)
  
  try {
    await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
    console.log('Profile upsert successful for user:', user.id)
  } catch (error) {
    // Remove from Set on error to allow retry
    profileSyncedUserIds.delete(user.id)
    console.error('Profile upsert failed (will retry):', error.message)
    throw error // Re-throw to handle in caller
  }
  
  const { data, error } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  if (error?.code === 'PGRST116' || !data) {
    // Profile doesn't exist, create it
    console.log('Profile not found, creating new profile for user:', user.id)
    try {
      const { data: newProfile } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email,
          full_name: user.user_metadata?.full_name || '',
          onboarding_complete: false
        })
        .select()
        .single()
      console.log('Profile created successfully for user:', user.id)
      return newProfile ?? null
    } catch (insertError) {
      // Remove from Set on error to allow retry
      profileSyncedUserIds.delete(user.id)
      console.error('Profile creation error (will retry):', insertError)
      throw insertError
    }
  }
  if (error) {
    // Remove from Set on error to allow retry
    profileSyncedUserIds.delete(user.id)
    console.error('Profile query error:', error)
    throw error
  }
  return data ?? null
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

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      authStateChangeCount++
      console.log(`onAuthStateChange fired (count: ${authStateChangeCount}), event:`, event, 'user:', session?.user?.id)
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
    console.log('Signing out, clearing profileSyncedUserIds')
    profileSyncedUserIds.clear()
    authStateChangeCount = 0
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
