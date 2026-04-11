import { supabase } from '../lib/supabase'

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
  
  // Check for duplicate entry from today (only for new entries)
  if (!existingId) {
    const today = new Date().toISOString().slice(0, 10)
    const entries = await getJournalEntries(userId)
    const isDuplicate = entries.some(e => 
      e.content === content && 
      e.created_at?.startsWith(today)
    )
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
  }
  try {
    const { data, error } = await supabase.from('journal_entries').upsert(payload, { onConflict: 'id' }).select().single()
    if (error) throw error
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
