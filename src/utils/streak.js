const STREAK_KEY = 'abidinganchor-streak'

function todayString(date = new Date()) {
  return date.toISOString().slice(0, 10)
}

function read() {
  try {
    const raw = localStorage.getItem(STREAK_KEY)
    if (!raw) return { currentStreak: 1, lastReadDate: null, longestStreak: 1 }
    const parsed = JSON.parse(raw)
    return {
      currentStreak: Math.max(1, parsed.currentStreak || 1),
      lastReadDate: parsed.lastReadDate || null,
      longestStreak: Math.max(1, parsed.longestStreak || 1),
    }
  } catch {
    return { currentStreak: 1, lastReadDate: null, longestStreak: 1 }
  }
}

function write(data) {
  localStorage.setItem(STREAK_KEY, JSON.stringify(data))
}

export function getStreak() {
  return read()
}

export function recordReadingToday() {
  const data = read()
  const today = new Date()
  const todayKey = todayString(today)
  if (data.lastReadDate === todayKey) return data

  const yesterday = new Date(today)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayKey = todayString(yesterday)

  const currentStreak = data.lastReadDate === yesterdayKey ? (data.currentStreak || 0) + 1 : 1
  const longestStreak = Math.max(data.longestStreak || 0, currentStreak)
  const next = { currentStreak, longestStreak, lastReadDate: todayKey }
  write(next)
  return next
}
