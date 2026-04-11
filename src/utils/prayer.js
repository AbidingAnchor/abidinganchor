import { supabase } from '../lib/supabase'

export async function getPrayerEntries(userIdArg) {
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
      .from('prayers')
      .select('id,user_id,content,is_answered,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((entry) => ({ id: entry.id, text: entry.content, date: entry.created_at, answered: Boolean(entry.is_answered) }))
  } catch (err) {
    console.error('Error getting prayer entries:', err)
    return []
  }
}

export async function savePrayer({ text, date, answered = false, userId: userIdArg }) {
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
  if (!userId || !text?.trim()) return []
  try {
    const payload = { user_id: userId, content: text.trim(), is_answered: answered }
    if (date) payload.created_at = date
    const { error } = await supabase.from('prayers').insert(payload)
    if (error) throw error
  } catch (err) {
    console.error('Error saving prayer:', err)
  }
  return getPrayerEntries(userId)
}

export async function toggleAnswered(id) {
  try {
    const { data, error } = await supabase.from('prayers').select('id,is_answered,user_id').eq('id', id).single()
    if (error) throw error
    if (!data) return []
    const { error: updateError } = await supabase.from('prayers').update({ is_answered: !data.answered }).eq('id', id)
    if (updateError) throw updateError
    return getPrayerEntries(data.user_id)
  } catch (err) {
    console.error('Error toggling prayer answered status:', err)
    return []
  }
}

export async function deletePrayer(id) {
  try {
    const { data, error } = await supabase.from('prayers').select('id,user_id').eq('id', id).single()
    if (error) throw error
    const { error: deleteError } = await supabase.from('prayers').delete().eq('id', id)
    if (deleteError) throw deleteError
    return getPrayerEntries(data?.user_id)
  } catch (err) {
    console.error('Error deleting prayer:', err)
    return []
  }
}
