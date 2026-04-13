import { supabase } from '../lib/supabase'
import { getLocalDateKey, WEEK_DAY_SHORT } from '../hooks/useStreakTracker'

function localYmdFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

function normalizeActivityYmd(value) {
  if (value == null) return ''
  const s = String(value).slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(s) ? s : ''
}

/**
 * Local calendar YYYY-MM-DD for a `journal_entries.created_at` value.
 * Plain `YYYY-MM-DD` (no time) is treated as that calendar day in the user's local timezone — not UTC midnight
 * (which would shift the day backward in positive-offset zones and break streak matching).
 */
function localCalendarYmdFromCreatedAt(value) {
  if (value == null || value === '') return ''
  const s = String(value).trim()
  if (/^\d{4}-\d{2}-\d{2}$/.test(s)) {
    const [y, m, d] = s.split('-').map(Number)
    if (!y || !m || !d) return ''
    return getLocalDateKey(new Date(y, m - 1, d, 12, 0, 0, 0))
  }
  const t = new Date(s)
  if (Number.isNaN(t.getTime())) return ''
  return getLocalDateKey(t)
}

function isPlainDateOnlyString(value) {
  return typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value.trim())
}

/**
 * Current local Monday 00:00 → next Monday 00:00 (exclusive): Mon–Sun streak week + ms bounds for queries.
 * Resets every Monday at midnight local time.
 */
function getJournalMondayWeekContext() {
  const now = new Date()
  const noon = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 12, 0, 0, 0)
  const dow = noon.getDay()
  const diffToMonday = dow === 0 ? -6 : 1 - dow
  const mondayNoon = new Date(noon.getFullYear(), noon.getMonth(), noon.getDate() + diffToMonday, 12, 0, 0, 0)
  const y = mondayNoon.getFullYear()
  const m = mondayNoon.getMonth()
  const d = mondayNoon.getDate()

  const byShort = {}
  const allowed = new Set()
  for (let i = 0; i < 7; i++) {
    const dt = new Date(y, m, d + i, 12, 0, 0, 0)
    const ymdKey = getLocalDateKey(dt)
    byShort[WEEK_DAY_SHORT[i]] = ymdKey
    allowed.add(ymdKey)
  }
  const startMs = new Date(y, m, d, 0, 0, 0, 0).getTime()
  const endMs = new Date(y, m, d + 7, 0, 0, 0, 0).getTime()
  return { monYmd: getLocalDateKey(new Date(y, m, d)), byShort, allowed, startMs, endMs }
}

/**
 * Local calendar day names for each YYYY-MM-DD in the current Mon–Sun streak week.
 */
function shortDayNameFromYmd(ymd) {
  const parts = ymd.split('-').map(Number)
  if (parts.length !== 3 || parts.some(Number.isNaN)) return ''
  const [y, m, d] = parts
  const dt = new Date(y, m - 1, d, 12, 0, 0, 0)
  const map = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']
  return map[dt.getDay()] || ''
}

/**
 * Local YYYY-MM-DDs in the current Mon–Sun week where the user had writing activity.
 * Uses `journal_activity_log` so deleting entries does not remove a day from the week heatmap.
 *
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function fetchJournalWeekEntryLocalDates(userId) {
  if (!userId) return []
  const { allowed, startMs, endMs } = getJournalMondayWeekContext()
  const allowedArr = [...allowed]
  const merged = new Set()
  try {
    const { data, error } = await supabase
      .from('journal_activity_log')
      .select('activity_date')
      .eq('user_id', userId)
      .in('activity_date', allowedArr)
    if (error) throw error
    for (const row of data || []) {
      const ymd = normalizeActivityYmd(row.activity_date)
      if (ymd && allowed.has(ymd)) merged.add(ymd)
    }
  } catch (err) {
    console.warn('fetchJournalWeekEntryLocalDates (activity log):', err)
  }
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(startMs).toISOString())
      .lt('created_at', new Date(endMs).toISOString())
    if (error) throw error
    for (const row of data || []) {
      const raw = row.created_at
      if (raw == null || raw === '') continue

      const ymd = localCalendarYmdFromCreatedAt(raw)
      if (!ymd || !allowed.has(ymd)) continue

      if (!isPlainDateOnlyString(raw)) {
        const t = new Date(raw).getTime()
        if (Number.isNaN(t) || t < startMs || t >= endMs) continue
      }

      merged.add(ymd)
    }
  } catch (err) {
    console.error('fetchJournalWeekEntryLocalDates:', err)
  }
  return [...merged]
}

/**
 * Short names ('Mon'…'Sun') with journal activity this Mon–Sun week, Mon→Sun order.
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function getJournalWeekActiveDayShortNames(userId) {
  const ymds = await fetchJournalWeekEntryLocalDates(userId)
  const shorts = new Set()
  for (const ymd of ymds) {
    const s = shortDayNameFromYmd(ymd)
    if (s) shorts.add(s)
  }
  return WEEK_DAY_SHORT.filter((k) => shorts.has(k))
}

/**
 * Maps each UI column (Mon→Sun) to the local YYYY-MM-DD in the current Mon–Sun week.
 * @returns {{ shortEn: string, ymd: string }[]}
 */
export function getJournalWritingWeekColumnsMonSun() {
  const { byShort } = getJournalMondayWeekContext()
  return WEEK_DAY_SHORT.map((shortEn) => ({ shortEn, ymd: byShort[shortEn] }))
}

/**
 * Prefer `local_date` when present; otherwise local calendar YYYY-MM-DD from `created_at`
 * (ISO timestamps use local date parts; plain YYYY-MM-DD is that calendar day in local time, not UTC midnight).
 */
export function getJournalEntryLocalYmd(entry) {
  if (!entry) return ''
  if (entry.local_date) return entry.local_date
  if (!entry.created_at) return ''
  return localCalendarYmdFromCreatedAt(entry.created_at)
}

export async function getJournalEntries(userIdArg) {
  let userId = userIdArg
  if (!userId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    } catch (err) {
      console.error('Error getting user:', err)
      return []
    }
  }
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('*')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return data || []
  } catch (err) {
    console.error('Error getting journal entries:', err)
    return []
  }
}

/**
 * Record one local calendar day as a writing day (idempotent). Survives journal entry deletion.
 * @param {string} userId
 * @param {string} activityYmd YYYY-MM-DD (user local calendar day when the entry was created)
 */
export async function logJournalWritingDay(userId, activityYmd) {
  const ymd = normalizeActivityYmd(activityYmd)
  if (!userId || !ymd) return
  try {
    const { error } = await supabase.from('journal_activity_log').upsert(
      { user_id: userId, activity_date: ymd },
      { onConflict: 'user_id,activity_date' },
    )
    if (error) throw error
  } catch (e) {
    console.warn('logJournalWritingDay:', e)
  }
}

function addDaysToYmdString(ymd, deltaDays) {
  const [y, m, d] = ymd.split('-').map(Number)
  const next = new Date(y, m - 1, d + deltaDays, 12, 0, 0, 0)
  return getLocalDateKey(next)
}

/**
 * All local YYYY-MM-DD values with logged writing activity (persists after entries are deleted).
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function fetchJournalActivityLocalYmds(userId) {
  if (!userId) return []
  const merged = new Set()
  try {
    const { data, error } = await supabase.from('journal_activity_log').select('activity_date').eq('user_id', userId)
    if (error) throw error
    for (const row of data || []) {
      const y = normalizeActivityYmd(row.activity_date)
      if (y) merged.add(y)
    }
  } catch (e) {
    console.warn('fetchJournalActivityLocalYmds (activity log):', e)
  }
  try {
    const entries = await getJournalEntries(userId)
    for (const e of entries || []) {
      const y = getJournalEntryLocalYmd(e)
      if (y) merged.add(y)
    }
  } catch (e2) {
    console.warn('fetchJournalActivityLocalYmds (entries):', e2)
  }
  return [...merged]
}

/**
 * Consecutive local days with logged activity (today, or yesterday if today has none yet).
 * @param {string[]} ymdStrings
 * @returns {number}
 */
export function computeWritingStreakFromActivityDates(ymdStrings) {
  const dates = new Set((ymdStrings || []).map((s) => normalizeActivityYmd(s)).filter(Boolean))
  if (dates.size === 0) return 0
  const today = getLocalDateKey(new Date())
  let cursor = today
  if (!dates.has(cursor)) {
    cursor = addDaysToYmdString(today, -1)
    if (!dates.has(cursor)) return 0
  }
  let streak = 0
  while (dates.has(cursor)) {
    streak += 1
    cursor = addDaysToYmdString(cursor, -1)
  }
  return streak
}

// NOTE: Run this migration in Supabase if local_date column is missing:
// ALTER TABLE journal_entries ADD COLUMN IF NOT EXISTS local_date TEXT;
export async function saveToJournal({ verse, reference, note = '', tags = [], userId: userIdArg, id: existingId, mood }) {
  let userId = userIdArg
  if (!userId) {
    try {
      const { data: { user } } = await supabase.auth.getUser()
      userId = user?.id
    } catch (err) {
      console.error('Error getting user:', err)
      return null
    }
  }
  if (!userId) return null
  const content = (note || verse || '').trim()
  if (!content) return null
  
  let isFirstJournalEntry = false
  // Check for duplicate entry from today (only for new entries) — compare local calendar days
  if (!existingId) {
    const todayLocal = localYmdFromDate(new Date())
    const entries = await getJournalEntries(userId)
    const isDuplicate = entries.some((e) => e.content === content && getJournalEntryLocalYmd(e) === todayLocal)
    if (isDuplicate) return null
    isFirstJournalEntry = entries.length === 0
  }

  // Generate UUID for new entries, use existing ID for edits
  const entryId = existingId || crypto.randomUUID()
  
  const payload = {
    id: entryId,
    user_id: userId,
    content,
    verse: verse || null,
    verse_reference: reference || null,
    entry_type: tags?.[0] || 'Reflection',
    mood: mood || null,
    // User's local calendar date at save time (TEXT YYYY-MM-DD). Supabase ignores unknown columns until migrated.
    local_date: (() => {
      const now = new Date()
      return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
    })(),
  }
  try {
    const { data, error } = await supabase.from('journal_entries').upsert(payload, { onConflict: 'id' }).select().single()
    if (error) throw error
    if (!existingId) {
      const jk = 'abidinganchor-journal-entry-count'
      const next = parseInt(localStorage.getItem(jk) || '0', 10) + 1
      localStorage.setItem(jk, String(next))
    }
    if (!data) return null
    if (!existingId) {
      void logJournalWritingDay(userId, payload.local_date)
    }
    return { ...data, isFirstJournalEntry }
  } catch (err) {
    console.error('Error saving to journal:', err)
    return null
  }
}

export async function deleteJournalEntry(id) {
  if (!id) return
  try {
    const { error } = await supabase.from('journal_entries').delete().eq('id', id)
    if (error) throw error
  } catch (err) {
    console.error('Error deleting journal entry:', err)
  }
}

export async function markPrayerAnswered(id) {
  if (!id) return null
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .update({ answered: true })
      .eq('id', id)
      .select()
      .single()
    if (error) throw error
    return data
  } catch (err) {
    console.error('Error marking prayer as answered:', err)
    return null
  }
}
