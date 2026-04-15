/**
 * Username uniqueness against `profiles.username` (stored lowercase for comparisons).
 */

const BANNED_USERNAME_WORDS = ['fuck', 'shit', 'bitch', 'asshole', 'bastard', 'nigger', 'slut', 'whore', 'dick', 'pussy']

export function hasProfanityInUsername(value = '') {
  const normalizedParts = value
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter(Boolean)
  return normalizedParts.some((part) => BANNED_USERNAME_WORDS.includes(part))
}

/** Lowercase trim — used for DB equality checks and storage. */
export function normalizeUsername(value) {
  return String(value || '').trim().toLowerCase()
}

/** Strip to a safe base for suggestions (letters/digits only). */
export function usernameBaseForSuggestions(value) {
  const n = normalizeUsername(value).replace(/[^a-z0-9]/g, '')
  return n.length > 0 ? n : 'user'
}

/**
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} raw
 * @param {string | undefined} excludeUserId - current user's id when editing own profile
 * @returns {Promise<{ taken: boolean, normalized: string, error: Error | null }>}
 */
export async function checkUsernameTaken(supabase, raw, excludeUserId) {
  const normalized = normalizeUsername(raw)
  if (!normalized) {
    return { taken: false, normalized: '', error: null }
  }

  let q = supabase.from('profiles').select('id').eq('username', normalized).limit(1)
  if (excludeUserId) {
    q = q.neq('id', excludeUserId)
  }

  const { data, error } = await q.maybeSingle()
  if (error) {
    if (error.code === 'PGRST116') {
      return { taken: false, normalized, error: null }
    }
    return { taken: false, normalized, error }
  }
  if (!data?.id) {
    return { taken: false, normalized, error: null }
  }

  return {
    taken: true,
    normalized,
    error: null,
  }
}

/**
 * Build up to 3 available usernames: random 2-digit, numeric suffix, underscore + number.
 * Each candidate is checked against Supabase before being returned.
 *
 * @param {import('@supabase/supabase-js').SupabaseClient} supabase
 * @param {string} rawInput - current (taken) username text
 * @param {string | undefined} excludeUserId
 * @returns {Promise<string[]>}
 */
export async function fetchAvailableUsernameSuggestions(supabase, rawInput, excludeUserId) {
  const base = usernameBaseForSuggestions(rawInput)
  const out = []
  const seen = new Set()

  const pushIfFree = async (candidate) => {
    const norm = normalizeUsername(candidate)
    if (!norm || seen.has(norm)) return false
    const { taken, error } = await checkUsernameTaken(supabase, norm, excludeUserId)
    if (error || taken) return false
    seen.add(norm)
    out.push(norm)
    return true
  }

  for (let k = 0; k < 30 && out.length < 1; k++) {
    const num = 10 + Math.floor(Math.random() * 90)
    await pushIfFree(`${base}${num}`)
  }

  for (let n = 1; n <= 99 && out.length < 2; n++) {
    if (await pushIfFree(`${base}${n}`)) break
  }

  for (let n = 7; n <= 99 && out.length < 3; n++) {
    if (await pushIfFree(`${base}_${n}`)) break
  }

  let pad = 1
  while (out.length < 3 && pad < 200) {
    await pushIfFree(`${base}${pad}`)
    pad++
  }

  return out.slice(0, 3)
}
