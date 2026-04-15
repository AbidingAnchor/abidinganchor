/**
 * Daily streak tied to opening the app (profiles.reading_streak + last_active_date).
 * Uses local calendar dates (same idea as presence streak). Idempotent per day.
 */
import { supabase } from './supabase'
import { getLocalCalendarDateKey } from '../utils/localCalendarDate'
import { calendarDaysBetween, getYesterdayDateKey, profileLastActiveDateKey } from './presenceStreak'

function parseStreak(v) {
  const n = Number(v)
  if (!Number.isFinite(n)) return 0
  return Math.max(0, Math.floor(n))
}

/**
 * @param {string} userId
 * @returns {Promise<{ ok: boolean, currentStreak: number, skipped?: boolean }>}
 */
export async function applyDailyStreakOnAppOpen(userId) {
  if (!userId) return { ok: false, currentStreak: 0 }

  const today = getLocalCalendarDateKey()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('reading_streak, last_active_date, longest_streak, streak_start_date')
    .eq('id', userId)
    .maybeSingle()

  console.log('[dailyAppStreak] profiles SELECT reading_streak,last_active_date,…', {
    userId,
    error: error ?? null,
    data: profile ?? null,
  })

  if (error) {
    console.error('[dailyAppStreak] profiles SELECT failed (exact error)', {
      message: error.message,
      code: error.code,
      details: error.details,
      hint: error.hint,
      raw: error,
    })
    return { ok: false, currentStreak: 0 }
  }
  if (!profile) return { ok: false, currentStreak: 0 }

  let last = profileLastActiveDateKey(profile.last_active_date)
  const prevStreak = parseStreak(profile.reading_streak)

  // Future calendar date in DB (UTC mismatch, bad row): ignore for streak — treat as no prior day.
  if (last && last > today) {
    console.warn('[dailyAppStreak] last_active_date is after local today — ignoring for streak math', {
      last,
      today,
      prevStreak,
    })
    last = null
  }

  // Already counted today with a non-zero streak — idempotent skip (no second UPDATE).
  if (last === today && prevStreak >= 1) {
    return {
      ok: true,
      skipped: true,
      currentStreak: prevStreak,
    }
  }

  // Same calendar day but streak still 0 (legacy / partial row): must UPDATE, not skip.
  const yesterday = getYesterdayDateKey(today)
  let next = 1

  if (last === yesterday) {
    next = Math.max(1, prevStreak + 1)
  } else if (!last) {
    next = 1
  } else if (last === today) {
    next = Math.max(1, prevStreak + 1)
  } else {
    const gap = calendarDaysBetween(last, today)
    next = gap >= 2 ? 1 : Math.max(1, prevStreak + 1)
  }

  const longestStreak = Math.max(parseStreak(profile.longest_streak), next)

  let streakStartDate = profile.streak_start_date || today
  if (next === 1 && last && calendarDaysBetween(last, today) >= 2) {
    streakStartDate = today
  } else if (next === 1 && !last) {
    streakStartDate = today
  }

  const { data: updatedRows, error: updateError } = await supabase
    .from('profiles')
    .update({
      reading_streak: next,
      last_active_date: today,
      longest_streak: longestStreak,
      streak_start_date: streakStartDate,
    })
    .eq('id', userId)
    .select('id, reading_streak, last_active_date')

  console.log('[dailyAppStreak] profiles UPDATE streak fields', {
    userId,
    next,
    today,
    error: updateError ?? null,
    returnedRows: updatedRows ?? null,
  })

  if (updateError) {
    console.error('[dailyAppStreak] profiles UPDATE failed (exact error)', {
      message: updateError.message,
      code: updateError.code,
      details: updateError.details,
      hint: updateError.hint,
      raw: updateError,
    })
    return { ok: false, currentStreak: prevStreak }
  }

  if (!updatedRows?.length) {
    console.error('[dailyAppStreak] UPDATE returned 0 rows (RLS denied, missing row, or id mismatch)', {
      userId,
      hint: 'Check profiles UPDATE policy and that auth.uid() = id',
    })
    return { ok: false, currentStreak: prevStreak }
  }

  const written = updatedRows[0]
  const outStreak = Math.max(parseStreak(written.reading_streak), next, 1)

  return { ok: true, currentStreak: outStreak }
}
