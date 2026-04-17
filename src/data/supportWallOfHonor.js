import { supabase } from '../lib/supabase'

/**
 * Fetches ministry supporters for the Support page Wall of Honor.
 * Kept outside Support.jsx to avoid Fast Refresh issues with mixed concerns.
 *
 * @returns {Promise<{ supporters: Array<object>, error: Error | null }>}
 */
export async function fetchWallOfHonorSupporters() {
  try {
    const { data, error } = await supabase
      .from('profiles')
      .select('id, display_name, full_name, username, avatar_url, supporter_since')
      .eq('is_supporter', true)
      .order('supporter_since', { ascending: true })

    if (error) {
      console.warn('[Wall of Honor] profiles fetch failed:', error.message, error.code, error.details)
      return { supporters: [], error }
    }

    return { supporters: Array.isArray(data) ? data : [], error: null }
  } catch (e) {
    const err = e instanceof Error ? e : new Error(String(e))
    console.warn('[Wall of Honor] profiles fetch exception:', err.message)
    return { supporters: [], error: err }
  }
}

/**
 * @param {string | null | undefined} iso
 * @returns {string} e.g. "Since April 2026", or empty if unparseable
 */
export function formatSupporterSince(iso) {
  if (iso == null || iso === '') return ''
  const d = new Date(iso)
  if (Number.isNaN(d.getTime())) return ''
  const monthYear = d.toLocaleString('en-US', { month: 'long', year: 'numeric' })
  return `Since ${monthYear}`
}

/**
 * @param {{ display_name?: string | null, username?: string | null, full_name?: string | null }} row
 * @returns {string}
 */
export function supporterDisplayName(row) {
  const displayName = typeof row?.display_name === 'string' ? row.display_name.trim() : ''
  const user = typeof row?.username === 'string' ? row.username.trim() : ''
  const full = typeof row?.full_name === 'string' ? row.full_name.trim() : ''
  return displayName || user || full || 'Friend'
}
