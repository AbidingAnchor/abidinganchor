/**
 * Daily streak tied to opening the app (profiles.reading_streak + last_active_date).
 * Uses local calendar dates (same idea as presence streak). Idempotent per day.
 */
import { supabase } from './supabase'
import { calendarDaysBetween, getLocalDateKey, getYesterdayDateKey } from './presenceStreak'

/**
 * @param {string} userId
 * @returns {Promise<{ ok: boolean, currentStreak: number, skipped?: boolean }>}
 */
export async function applyDailyStreakOnAppOpen(userId) {
  if (!userId) return { ok: false, currentStreak: 0 }

  const today = getLocalDateKey()
  const { data: profile, error } = await supabase
    .from('profiles')
    .select('reading_streak, last_active_date, longest_streak, streak_start_date')
    .eq('id', userId)
    .maybeSingle()

  if (error) {
    console.warn('dailyAppStreak fetch:', error)
    return { ok: false, currentStreak: 0 }
  }
  if (!profile) return { ok: false, currentStreak: 0 }

  const last = profile.last_active_date ? String(profile.last_active_date).slice(0, 10) : null

  if (last && last > today) {
    return {
      ok: true,
      skipped: true,
      currentStreak: Number(profile.reading_streak) || 0,
    }
  }

  if (last === today) {
    return {
      ok: true,
      skipped: true,
      currentStreak: Number(profile.reading_streak) || 0,
    }
  }

  const prev = Number(profile.reading_streak) || 0
  const yesterday = getYesterdayDateKey(today)
  let next = 1

  if (last === yesterday) {
    next = prev + 1
  } else if (!last) {
    next = 1
  } else {
    const gap = calendarDaysBetween(last, today)
    next = gap >= 2 ? 1 : prev + 1
  }

  const longestStreak = Math.max(Number(profile.longest_streak) || 0, next)

  let streakStartDate = profile.streak_start_date || today
  if (next === 1 && last && calendarDaysBetween(last, today) >= 2) {
    streakStartDate = today
  } else if (next === 1 && !last) {
    streakStartDate = today
  }

  const { error: updateError } = await supabase
    .from('profiles')
    .update({
      reading_streak: next,
      last_active_date: today,
      longest_streak: longestStreak,
      streak_start_date: streakStartDate,
    })
    .eq('id', userId)

  if (updateError) {
    console.warn('dailyAppStreak update:', updateError)
    return { ok: false, currentStreak: prev }
  }

  return { ok: true, currentStreak: next }
}
