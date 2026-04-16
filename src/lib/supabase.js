import { createClient } from '@supabase/supabase-js'

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    autoRefreshToken: true,
    persistSession: true,
    detectSessionInUrl: true,
    flowType: 'implicit',
    storage: typeof window !== 'undefined' ? window.localStorage : undefined,
  },
})

let cachedSession = null
let cachedSessionPromise = null

/**
 * Centralized session getter to avoid concurrent auth lock contention.
 */
export async function getCachedSession({ forceRefresh = false } = {}) {
  if (!forceRefresh && cachedSession !== null) {
    return cachedSession
  }
  if (cachedSessionPromise) {
    return cachedSessionPromise
  }
  cachedSessionPromise = supabase.auth
    .getSession()
    .then(({ data, error }) => {
      if (error) throw error
      cachedSession = data?.session ?? null
      return cachedSession
    })
    .finally(() => {
      cachedSessionPromise = null
    })
  return cachedSessionPromise
}

export function clearCachedSession() {
  cachedSession = null
}

if (typeof window !== 'undefined') {
  supabase.auth.onAuthStateChange((_event, session) => {
    cachedSession = session ?? null
  })
}
