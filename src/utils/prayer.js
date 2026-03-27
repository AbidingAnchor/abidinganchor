import { supabase } from '../lib/supabase'

export async function getPrayerEntries(userIdArg) {
  let userId = userIdArg
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
  }
  if (!userId) return []
  const { data } = await supabase.from('prayers').select('*').eq('user_id', userId).order('created_at', { ascending: false })
  return (data || []).map((entry) => ({ id: entry.id, text: entry.content, date: entry.created_at, answered: Boolean(entry.answered) }))
}

export async function savePrayer({ text, date, answered = false, userId: userIdArg }) {
  let userId = userIdArg
  if (!userId) {
    const { data: { user } } = await supabase.auth.getUser()
    userId = user?.id
  }
  if (!userId || !text?.trim()) return []
  await supabase.from('prayers').insert({ user_id: userId, content: text.trim(), answered, created_at: date || new Date().toISOString() })
  return getPrayerEntries(userId)
}

export async function toggleAnswered(id) {
  const { data } = await supabase.from('prayers').select('answered,user_id').eq('id', id).single()
  if (!data) return []
  await supabase.from('prayers').update({ answered: !data.answered }).eq('id', id)
  return getPrayerEntries(data.user_id)
}

export async function deletePrayer(id) {
  const { data } = await supabase.from('prayers').select('user_id').eq('id', id).single()
  await supabase.from('prayers').delete().eq('id', id)
  return getPrayerEntries(data?.user_id)
}
