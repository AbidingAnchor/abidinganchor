import { useMemo } from 'react'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

/** Canonical order for UI (Mon → Sun); must match stored short names */
export const WEEK_DAY_SHORT = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun']

/**
 * Local calendar YYYY-MM-DD
 * @param {Date} [d]
 */
export function getLocalDateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * Most recent Saturday (00:00 local) as YYYY-MM-DD — week anchor for resets.
 */
export function getMostRecentSaturdayDateKey() {
  const d = new Date()
  const local = new Date(d.getFullYear(), d.getMonth(), d.getDate())
  const dow = local.getDay() // 0 Sun … 6 Sat
  const daysBack = (dow + 1) % 7 // Sat → 0, Sun → 1, … Fri → 6
  local.setDate(local.getDate() - daysBack)
  return getLocalDateKey(local)
}

/**
 * Today's short day name in local time ('Mon' … 'Sun').
 * @param {Date} [d]
 */
export function getShortDayName(d = new Date()) {
  const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return map[d.getDay()]
}

function normalizedKey(arr) {
  return [...new Set(arr)].filter((x) => WEEK_DAY_SHORT.includes(x)).sort().join('|')
}

/**
 * Run on app open **before** {@link applyDailyStreakOnAppOpen} so `last_active_date` in the row
 * still reflects the prior visit for Saturday-boundary checks. Updates **only** `weekly_active_days`;
 * daily streak logic continues to own `last_active_date`.
 *
 * @param {string} userId
 * @returns {Promise<{ ok: boolean, skipped?: boolean }>}
 */
export async function syncWeeklyActiveDays(userId) {
  if (!userId) return { ok: false }

  const { data: row, error: fetchError } = await supabase
    .from('profiles')
    .select('last_active_date, weekly_active_days')
    .eq('id', userId)
    .maybeSingle()

  if (fetchError) {
    console.warn('syncWeeklyActiveDays fetch:', fetchError)
    return { ok: false }
  }
  if (!row) return { ok: false }

  const prevLast = row.last_active_date ? String(row.last_active_date).slice(0, 10) : null
  const satKey = getMostRecentSaturdayDateKey()
  const shortDay = getShortDayName()
  const raw = row.weekly_active_days
  const prevArr = Array.isArray(raw) ? raw.filter((x) => typeof x === 'string' && WEEK_DAY_SHORT.includes(x)) : []

  const shouldReset = !prevLast || prevLast < satKey

  let next
  if (shouldReset) {
    next = [shortDay]
  } else {
    next = [...new Set(prevArr)]
    if (!next.includes(shortDay)) {
      next = [...next, shortDay]
    }
  }

  if (normalizedKey(prevArr) === normalizedKey(next)) {
    return { ok: true, skipped: true }
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({ weekly_active_days: next })
    .eq('id', userId)

  if (updateError) {
    console.warn('syncWeeklyActiveDays update:', updateError)
    return { ok: false }
  }

  return { ok: true }
}

/**
 * @param {string | undefined} userId
 * @returns {{ activeDays: string[] }}
 */
export function useStreakTracker(userId) {
  const { profile } = useAuth()

  const activeDays = useMemo(() => {
    if (!userId) return []
    const raw = profile?.weekly_active_days
    if (!Array.isArray(raw)) return []
    return raw.filter((d) => typeof d === 'string' && WEEK_DAY_SHORT.includes(d))
  }, [userId, profile?.weekly_active_days])

  return { activeDays }
}
