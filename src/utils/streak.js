import { supabase } from '../lib/supabase'

function todayString(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

export async function getStreak() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return { currentStreak: 0, lastReadDate: null, longestStreak: 0 }
    const { data, error } = await supabase.from('profiles').select('reading_streak,last_read_date,longest_streak').eq('id', user.id).single()
    if (error) throw error
    return {
      currentStreak: Number(data?.reading_streak || 0),
      lastReadDate: data?.last_read_date || null,
      longestStreak: Number(data?.longest_streak || 0),
    }
  } catch (err) {
    console.error('Error getting streak:', err)
    return { currentStreak: 0, lastReadDate: null, longestStreak: 0 }
  }
}

export async function recordReadingToday() {
  try {
    const { data: { user } } = await supabase.auth.getUser()
    if (!user?.id) return { currentStreak: 0, lastReadDate: null, longestStreak: 0 }
    const today = new Date()
    const todayKey = todayString(today)
    const { data: profile, error: profileError } = await supabase
      .from('profiles')
      .select('id,created_at,streak_start_date,reading_streak,last_read_date,longest_streak')
      .eq('id', user.id)
      .single()
    if (profileError) throw profileError
    if (!profile) return { currentStreak: 0, lastReadDate: null, longestStreak: 0 }
    const startDate = profile.streak_start_date || (profile.created_at || todayKey).slice(0, 10)
    if (todayKey < startDate) return { currentStreak: 0, lastReadDate: null, longestStreak: 0 }
    if (profile.last_read_date === todayKey) {
      return {
        currentStreak: Number(profile.reading_streak || 0),
        longestStreak: Number(profile.longest_streak || 0),
        lastReadDate: profile.last_read_date,
      }
    }

    const yesterday = new Date(today)
    yesterday.setDate(yesterday.getDate() - 1)
    const yesterdayKey = todayString(yesterday)

    const currentStreak = profile.last_read_date === yesterdayKey ? Number(profile.reading_streak || 0) + 1 : 1
    const longestStreak = Math.max(Number(profile.longest_streak || 0), currentStreak)
    const next = { currentStreak, longestStreak, lastReadDate: todayKey }
    const { error: updateError } = await supabase.from('profiles').update({
      reading_streak: currentStreak,
      last_read_date: todayKey,
      longest_streak: longestStreak,
      streak_start_date: startDate,
    }).eq('id', user.id)
    if (updateError) throw updateError
    return next
  } catch (err) {
    console.error('Error recording reading today:', err)
    return { currentStreak: 0, lastReadDate: null, longestStreak: 0 }
  }
}
