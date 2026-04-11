import { supabase } from '../lib/supabase'

function localYmdFromDate(d) {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
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
  
  // Check for duplicate entry from today (only for new entries) — compare local calendar days
  if (!existingId) {
    const todayLocal = localYmdFromDate(new Date())
    const entries = await getJournalEntries(userId)
    const isDuplicate = entries.some((e) => e.content === content && entryLocalYmdRow(e) === todayLocal)
    if (isDuplicate) return null
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
    return data || null
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
