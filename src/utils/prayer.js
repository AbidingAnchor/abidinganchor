import { supabase } from '../lib/supabase'

export async function getPrayerEntries(userIdArg) {
  let userId = userIdArg
  if (!userId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userId = user?.id
    } catch (err) {
      console.error('Error getting user:', err)
      return []
    }
  }
  if (!userId) return []
  try {
    const { data, error } = await supabase
      .from('personal_prayers')
      .select('id,user_id,prayer_text,answered,answered_at,created_at')
      .eq('user_id', userId)
      .order('created_at', { ascending: false })
    if (error) throw error
    return (data || []).map((entry) => ({
      id: entry.id,
      text: entry.prayer_text,
      date: entry.created_at,
      answered: Boolean(entry.answered),
      answeredAt: entry.answered_at || null,
    }))
  } catch (err) {
    console.error('Error getting prayer entries:', err)
    return []
  }
}

export async function savePrayer({ text, date, answered = false, userId: userIdArg }) {
  let userId = userIdArg
  if (!userId) {
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser()
      userId = user?.id
    } catch (err) {
      console.error('Error getting user:', err)
      return []
    }
  }
  if (!userId || !text?.trim()) return []
  try {
    const payload = {
      user_id: userId,
      prayer_text: text.trim(),
      answered,
      answered_at: answered ? new Date().toISOString() : null,
    }
    if (date) payload.created_at = date
    const { error } = await supabase.from('personal_prayers').insert(payload)
    if (error) throw error
  } catch (err) {
    console.error('Error saving prayer:', err)
  }
  return getPrayerEntries(userId)
}

export async function toggleAnswered(id) {
  try {
    const { data, error } = await supabase
      .from('personal_prayers')
      .select('id,answered,user_id')
      .eq('id', id)
      .single()
    if (error) throw error
    if (!data) return []
    const next = !data.answered
    const { error: updateError } = await supabase
      .from('personal_prayers')
      .update({
        answered: next,
        answered_at: next ? new Date().toISOString() : null,
      })
      .eq('id', id)
    if (updateError) throw updateError
    return getPrayerEntries(data.user_id)
  } catch (err) {
    console.error('Error toggling prayer answered status:', err)
    return []
  }
}

export async function deletePrayer(id) {
  try {
    const { data, error } = await supabase.from('personal_prayers').select('id,user_id').eq('id', id).single()
    if (error) throw error
    const { error: deleteError } = await supabase.from('personal_prayers').delete().eq('id', id)
    if (deleteError) throw deleteError
    return getPrayerEntries(data?.user_id)
  } catch (err) {
    console.error('Error deleting prayer:', err)
    return []
  }
}
