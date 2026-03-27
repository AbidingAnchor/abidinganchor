import { createContext, useContext, useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

const AuthContext = createContext({})

async function ensureProfile(user) {
  if (!user?.id) return null
  const fullName = user.user_metadata?.full_name || ''
  const createdAt = (user.created_at || new Date().toISOString()).slice(0, 10)
  const payload = {
    id: user.id,
    email: user.email ?? null,
    full_name: fullName || null,
    streak_start_date: createdAt,
    reading_streak: 0,
    last_read_date: null,
  }
  await supabase.from('profiles').upsert(payload, { onConflict: 'id' })
  const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
  return data ?? null
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let active = true
    const boot = async () => {
      const { data: { session } } = await supabase.auth.getSession()
      const nextUser = session?.user ?? null
      if (!active) return
      setUser(nextUser)
      if (nextUser) {
        const nextProfile = await ensureProfile(nextUser)
        if (!active) return
        setProfile(nextProfile)
      } else {
        setProfile(null)
      }
      setLoading(false)
    }
    boot()

    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (_, session) => {
      const nextUser = session?.user ?? null
      setUser(nextUser)
      if (nextUser) {
        const nextProfile = await ensureProfile(nextUser)
        setProfile(nextProfile)
      } else {
        setProfile(null)
      }
      setLoading(false)
    })

    return () => {
      active = false
      subscription.unsubscribe()
    }
  }, [])

  const signUp = async (email, password, fullName) => {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { full_name: fullName } },
    })
    return { data, error }
  }

  const signIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password })
    return { data, error }
  }

  const signOut = async () => {
    await supabase.auth.signOut()
  }

  const refreshProfile = async () => {
    if (!user?.id) return
    const { data } = await supabase.from('profiles').select('*').eq('id', user.id).single()
    setProfile(data ?? null)
  }

  const value = useMemo(() => ({
    user, profile, loading, signUp, signIn, signOut, refreshProfile,
  }), [user, profile, loading])

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export const useAuth = () => useContext(AuthContext)
