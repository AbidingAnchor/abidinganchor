import { supabase } from '../lib/supabase'

export async function getJournalEntries(userIdArg) {
  let userId = userIdArg
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
  }
  if (!userId) return []
  const { data } = await supabase
    .from('journal_entries')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false })
  return data || []
}

export async function saveToJournal({ verse, reference, note = '', tags = [], userId: userIdArg }) {
  let userId = userIdArg
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
  }
  if (!userId) return null
  const content = (note || verse || '').trim()
  if (!content) return null
  const payload = {
    user_id: userId,
    content,
    verse: verse || null,
    verse_reference: reference || null,
    entry_type: tags?.[0] || 'Reflection',
  }
  const { data } = await supabase.from('journal_entries').insert(payload).select().single()
  return data || null
}

export async function deleteJournalEntry(id) {
  if (!id) return
  await supabase.from('journal_entries').delete().eq('id', id)
}
