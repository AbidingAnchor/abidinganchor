import { supabase } from '../lib/supabase'
import { getLocalDateKey, getMostRecentSaturdayDateKey, WEEK_DAY_SHORT } from '../hooks/useStreakTracker'

function localYmdFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
 * Most recent local Saturday 00:00 → next Saturday 00:00 (exclusive): allowed local YYYY-MM-DD set + ms bounds.
 */
function getJournalSaturdayWeekContext() {
  const satYmd = getMostRecentSaturdayDateKey()
  const [y, m, d] = satYmd.split('-').map(Number)
  const byShort = {}
  const allowed = new Set()
  for (let i = 0; i < 7; i++) {
    const dt = new Date(y, m - 1, d + i, 12, 0, 0, 0)
    const short = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'][dt.getDay()]
    const ymdKey = getLocalDateKey(dt)
    byShort[short] = ymdKey
    allowed.add(ymdKey)
  }
  const startMs = new Date(y, m - 1, d, 0, 0, 0, 0).getTime()
  const endMs = new Date(y, m - 1, d + 7, 0, 0, 0, 0).getTime()
  return { satYmd, byShort, allowed, startMs, endMs }
}

/**
 * Local calendar day names for each YYYY-MM-DD in the Saturday→Friday window (current streak week).
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
 * Fetches `journal_entries` for the current user with `created_at` in [last local Saturday 00:00, next Saturday 00:00).
 * Returns distinct local calendar dates (YYYY-MM-DD) derived from `created_at` only.
 *
 * @param {string} userId
 * @returns {Promise<string[]>}
 */
export async function fetchJournalWeekEntryLocalDates(userId) {
  if (!userId) return []
  const { allowed, startMs, endMs } = getJournalSaturdayWeekContext()
  try {
    const { data, error } = await supabase
      .from('journal_entries')
      .select('created_at')
      .eq('user_id', userId)
      .gte('created_at', new Date(startMs).toISOString())
      .lt('created_at', new Date(endMs).toISOString())
    if (error) throw error
    const ymds = new Set()
    for (const row of data || []) {
      const raw = row.created_at
      if (raw == null || raw === '') continue

      const ymd = localCalendarYmdFromCreatedAt(raw)
      if (!ymd || !allowed.has(ymd)) continue

      if (!isPlainDateOnlyString(raw)) {
        const t = new Date(raw).getTime()
        if (Number.isNaN(t) || t < startMs || t >= endMs) continue
      }

      ymds.add(ymd)
    }
    return [...ymds]
  } catch (err) {
    console.error('fetchJournalWeekEntryLocalDates:', err)
    return []
  }
}

/**
 * Short names ('Mon'…'Sun') with journal activity this Saturday-based week, Mon→Sun order.
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
 * Maps each UI column (Mon→Sun) to the local YYYY-MM-DD in the current Saturday-based week.
 * @returns {{ shortEn: string, ymd: string }[]}
 */
export function getJournalWritingWeekColumnsMonSun() {
  const { byShort } = getJournalSaturdayWeekContext()
  return WEEK_DAY_SHORT.map((shortEn) => ({ shortEn, ymd: byShort[shortEn] }))
}

function entryLocalYmdRow(e) {
  if (!e) return ''
  if (e.local_date) return e.local_date
  if (!e.created_at) return ''
  return localYmdFromDate(new Date(e.created_at))
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
    const isDuplicate = entries.some((e) => e.content === content && entryLocalYmdRow(e) === todayLocal)
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
