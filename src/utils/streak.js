import { supabase } from '../lib/supabase'
import { applyDailyStreakOnAppOpen } from '../lib/dailyAppStreak'
import { getLocalCalendarDateKey } from './localCalendarDate'

function todayString(date = new Date()) {
  return getLocalCalendarDateKey(date)
}

export async function getStreak() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return { currentStreak: 0, lastReadDate: null, longestStreak: 0 }
    const { data, error } = await supabase.from('profiles').select('reading_streak,last_active_date,longest_streak').eq('id', user.id).single()
    console.log('[getStreak] Reading from profiles:', {
      userId: user.id,
      reading_streak: data?.reading_streak,
      last_active_date: data?.last_active_date,
      longest_streak: data?.longest_streak,
      error: error ?? null,
    })
    if (error) throw error
    return {
      currentStreak: Number(data?.reading_streak || 0),
      lastReadDate: data?.last_active_date || null,
      longestStreak: Number(data?.longest_streak || 0),
    }
  } catch (err) {
    console.error('[getStreak] Error getting streak:', err)
    return { currentStreak: 0, lastReadDate: null, longestStreak: 0 }
  }
}

/** @deprecated Prefer {@link applyDailyStreakOnAppOpen}; kept for any legacy callers. */
export async function recordReadingToday() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return { currentStreak: 0, lastReadDate: null, longestStreak: 0 }
    const result = await applyDailyStreakOnAppOpen(user.id)
    const { data: profile } = await supabase
      .from('profiles')
      .select('last_active_date, longest_streak')
      .eq('id', user.id)
      .maybeSingle()
    return {
      currentStreak: result.currentStreak,
      longestStreak: Number(profile?.longest_streak || 0),
      lastReadDate: profile?.last_active_date || null,
    }
  } catch (err) {
    console.error('Error recording reading today:', err)
    return { currentStreak: 0, lastReadDate: null, longestStreak: 0 }
  }
}
