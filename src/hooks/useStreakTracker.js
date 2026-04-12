import { useEffect, useState } from 'react'
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
 * Build the list of lit weekday short names for the Daily Streak card.
 *
 * Primary: `profiles.weekly_active_days` (text[] of 'Mon'…'Sun') when present and non-empty.
 * Fallback (no migration / empty array): if `last_active_date` is **today** (local), show today only
 * so the card matches “active today” when daily streak already set `last_active_date`.
 *
 * If your project does not have `weekly_active_days`, only `last_active_date` (and related streak
 * columns like `reading_streak`) exist — the UI can only infer **today** until `weekly_active_days`
 * is populated by `syncWeeklyActiveDays`.
 *
 * @param {object|null|undefined} row profiles row subset or full row
 * @returns {string[]}
 */
export function parseWeeklyActiveDaysRow(row) {
  if (!row || typeof row !== 'object') return []

  const raw = row.weekly_active_days
  let arr = []

  if (Array.isArray(raw)) {
    arr = raw.filter((x) => typeof x === 'string' && WEEK_DAY_SHORT.includes(x))
  } else if (typeof raw === 'string') {
    const s = raw.trim()
    if (s.startsWith('{') && s.endsWith('}')) {
      const inner = s.slice(1, -1)
      if (inner)
        arr = inner
          .split(',')
          .map((x) => x.replace(/^"|"$/g, '').trim())
          .filter((x) => WEEK_DAY_SHORT.includes(x))
    }
  }

  if (arr.length > 0) return arr

  const last = row.last_active_date != null ? String(row.last_active_date).slice(0, 10) : null
  if (last && last === getLocalDateKey()) {
    return [getShortDayName()]
  }

  return []
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
 * Loads `weekly_active_days` + `last_active_date` from Supabase on mount and when profile streak
 * fields change (after refresh), so the Home card is not stuck at 0 when Auth context omits arrays.
 *
 * @param {string | undefined} userId
 * @returns {{ activeDays: string[] }}
 */
export function useStreakTracker(userId) {
  const { profile } = useAuth()
  const [activeDays, setActiveDays] = useState([])

  useEffect(() => {
    if (!userId) {
      setActiveDays([])
      return
    }

    let cancelled = false

    const apply = (row) => {
      if (!cancelled && row) setActiveDays(parseWeeklyActiveDaysRow(row))
    }

    if (profile?.id === userId) {
      apply(profile)
    }

    ;(async () => {
      const { data, error } = await supabase
        .from('profiles')
        .select('weekly_active_days, last_active_date')
        .eq('id', userId)
        .maybeSingle()

      if (cancelled) return
      if (error) {
        console.warn('useStreakTracker fetch:', error)
        return
      }
      if (data) apply(data)
    })()

    return () => {
      cancelled = true
    }
  }, [userId, profile?.id, profile?.weekly_active_days, profile?.last_active_date])

  return { activeDays }
}
