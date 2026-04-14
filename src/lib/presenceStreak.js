/**
 * Daily “presence” check-in for the Daily Encounter (localStorage now; Supabase later).
 *
 * Persistence shape — keep in sync when adding a DB column set:
 * @typedef {object} PresenceStreakPersisted
 * @property {string | null} lastCompletedDate  ISO local calendar key YYYY-MM-DD
 * @property {number} currentStreak
 * @property {number} longestStreak
 * @property {string[]} [completionHistory]  optional recent days (newest appended; capped)
 */

import { userStorageKey } from '../utils/userStorage'

const HISTORY_CAP = 120

function streakStorageKey(userId) {
  return userStorageKey(userId, 'presence-streak-v1')
}

/** @returns {PresenceStreakPersisted} */
function defaultState() {
  return {
    lastCompletedDate: null,
    currentStreak: 0,
    longestStreak: 0,
    completionHistory: [],
  }
}

/**
 * Calendar day in the user’s local timezone (not UTC).
 * @param {Date} [d]
 * @returns {string}
 */
export function getLocalDateKey(d = new Date()) {
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

/**
 * @param {string} dateKey YYYY-MM-DD
 * @returns {string}
 */
export function getYesterdayDateKey(dateKey) {
  const [y, m, d] = dateKey.split('-').map(Number)
  const dt = new Date(y, m - 1, d)
  dt.setDate(dt.getDate() - 1)
  return getLocalDateKey(dt)
}

/**
 * Whole calendar days between two local date keys (earlier → later). Same day = 0.
 * @param {string} earlierKey
 * @param {string} laterKey
 */
export function calendarDaysBetween(earlierKey, laterKey) {
  const [y1, m1, d1] = earlierKey.split('-').map(Number)
  const [y2, m2, d2] = laterKey.split('-').map(Number)
  const a = new Date(y1, m1 - 1, d1)
  const b = new Date(y2, m2 - 1, d2)
  return Math.round((b.getTime() - a.getTime()) / 86400000)
}

/**
 * @param {unknown} raw
 * @returns {PresenceStreakPersisted}
 */
function normalize(raw) {
  const base = defaultState()
  if (!raw || typeof raw !== 'object') return base
  const o = /** @type {Record<string, unknown>} */ (raw)
  return {
    lastCompletedDate: typeof o.lastCompletedDate === 'string' ? o.lastCompletedDate : null,
    currentStreak: Math.max(0, Number(o.currentStreak) || 0),
    longestStreak: Math.max(0, Number(o.longestStreak) || 0),
    completionHistory: Array.isArray(o.completionHistory)
      ? o.completionHistory.filter((x) => typeof x === 'string')
      : [],
  }
}

/**
 * Read raw persisted state (no migration of broken streaks — use {@link syncPresenceState}).
 * @param {string | undefined | null} userId
 * @returns {PresenceStreakPersisted}
 */
export function loadPresenceState(userId) {
  if (!userId) return defaultState()
  try {
    const k = streakStorageKey(userId)
    let s = localStorage.getItem(k)
    if (!s) {
      const legacy = localStorage.getItem('abidinganchor-presence-streak-v1')
      if (legacy) {
        s = legacy
        try {
          localStorage.setItem(k, legacy)
          localStorage.removeItem('abidinganchor-presence-streak-v1')
        } catch {
          /* ignore */
        }
      }
    }
    if (!s) return defaultState()
    return normalize(JSON.parse(s))
  } catch {
    return defaultState()
  }
}

/**
 * @param {PresenceStreakPersisted} state
 * @param {string | undefined | null} userId
 */
export function savePresenceState(state, userId) {
  if (!userId) return
  try {
    localStorage.setItem(streakStorageKey(userId), JSON.stringify(state))
  } catch (e) {
    console.warn('presence streak save failed', e)
  }
}

/**
 * If the user missed one or more calendar days since last completion, reset current streak in storage.
 * Call on app load and before computing UI.
 * @param {string | undefined | null} userId
 * @returns {PresenceStreakPersisted}
 */
export function syncPresenceState(userId) {
  const raw = loadPresenceState(userId)
  const today = getLocalDateKey()
  const last = raw.lastCompletedDate
  if (!last) return raw

  if (last === today) return raw

  const gap = calendarDaysBetween(last, today)
  if (gap >= 2) {
    const next = { ...raw, currentStreak: 0 }
    savePresenceState(next, userId)
    return next
  }

  return raw
}

/**
 * Whether today’s local date is already marked complete.
 * @param {PresenceStreakPersisted} state
 */
export function isCompletedToday(state) {
  return state.lastCompletedDate === getLocalDateKey()
}

/**
 * Apply a completion for today. Idempotent: if already completed today, state unchanged.
 * Updates longest streak and optional history.
 * @param {string | undefined | null} userId
 * @returns {PresenceStreakPersisted}
 */
export function markPresenceComplete(userId) {
  const synced = syncPresenceState(userId)
  const today = getLocalDateKey()

  if (synced.lastCompletedDate === today) {
    return synced
  }

  const yesterday = getYesterdayDateKey(today)
  let nextStreak = 1
  if (synced.lastCompletedDate === yesterday) {
    nextStreak = (synced.currentStreak || 0) + 1
  }

  const longestStreak = Math.max(synced.longestStreak || 0, nextStreak)

  const history = [...(synced.completionHistory || [])]
  if (!history.includes(today)) {
    history.push(today)
    while (history.length > HISTORY_CAP) history.shift()
  }

  const next = {
    ...synced,
    lastCompletedDate: today,
    currentStreak: nextStreak,
    longestStreak,
    completionHistory: history,
  }
  savePresenceState(next, userId)
  return next
}

/**
 * View model for UI: respects “completed today” and synced streak.
 * @param {PresenceStreakPersisted} state
 */
export function getPresenceViewModel(state) {
  const today = getLocalDateKey()
  const completedToday = state.lastCompletedDate === today
  return {
    completedToday,
    currentStreak: state.currentStreak || 0,
    longestStreak: state.longestStreak || 0,
  }
}
