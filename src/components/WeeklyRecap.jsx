import { useEffect, useMemo, useState } from 'react'
import { supabase } from '../lib/supabase'

function weekKeyForDate(date = new Date()) {
  const d = new Date(date)
  const day = d.getDay() // Sun=0...Sat=6
  const diffToMonday = day === 0 ? -6 : 1 - day
  d.setDate(d.getDate() + diffToMonday)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const dd = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${dd}`
}

function summarizeReading(rows) {
  const unique = new Set()
  for (const row of rows || []) {
    const book = row.book || row.book_name || row.book_id || ''
    const chapter = row.chapter || row.chapter_number || ''
    const key = `${book}:${chapter}`
    if (book || chapter) unique.add(key)
  }
  return {
    chaptersRead: unique.size,
    topBooks: [...new Set((rows || []).map((r) => r.book || r.book_name || '').filter(Boolean))].slice(0, 5),
  }
}

function logSupabaseTableError(table, error) {
  const message = error?.message ?? String(error)
  const code = error?.code != null ? String(error.code) : ''
  const details = error?.details != null ? String(error.details) : ''
  const hint = error?.hint != null ? String(error.hint) : ''
  console.warn(
    `[WeeklyRecap] Supabase query failed: table="${table}" message="${message}"` +
      (code ? ` code="${code}"` : '') +
      (details ? ` details="${details}"` : '') +
      (hint ? ` hint="${hint}"` : ''),
    error,
  )
}

async function fetchReadingProgressRows(uid) {
  const table = 'reading_progress'
  try {
    const { data, error } = await supabase.from(table).select('*').eq('user_id', uid)
    if (error) {
      logSupabaseTableError(table, error)
      return []
    }
    return data || []
  } catch (e) {
    logSupabaseTableError(table, e)
    return []
  }
}

async function fetchJournalRowsLast7Days(uid, sinceIso) {
  const table = 'journal_entries'
  try {
    const { data, error } = await supabase
      .from(table)
      .select('content, verse, verse_reference, created_at')
      .eq('user_id', uid)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) {
      logSupabaseTableError(table, error)
      return []
    }
    return data || []
  } catch (e) {
    logSupabaseTableError(table, e)
    return []
  }
}

async function fetchPrayerRowsLast7Days(uid, sinceIso) {
  const table = 'personal_prayers'
  try {
    const { data, error } = await supabase
      .from(table)
      .select('prayer_text, created_at')
      .eq('user_id', uid)
      .gte('created_at', sinceIso)
      .order('created_at', { ascending: false })
      .limit(20)
    if (error) {
      logSupabaseTableError(table, error)
      return []
    }
    return data || []
  } catch (e) {
    logSupabaseTableError(table, e)
    return []
  }
}

export default function WeeklyRecap({ userId, profile, weekStorageKey, autoGenerate = false, onDismiss }) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recap, setRecap] = useState('')
  const [stats, setStats] = useState({ chaptersRead: 0, journals: 0, prayers: 0, streak: 0 })
  const [dismissed, setDismissed] = useState(false)
  const localDismissKey = useMemo(() => `weekly-recap-dismissed-${weekStorageKey}`, [weekStorageKey])
  const themedStyles = useMemo(() => {
    const hour = new Date().getHours()
    if (hour >= 6 && hour < 17) {
      return {
        cardBg: 'rgba(245,237,214,0.85)',
        text: '#2c1810',
        subtext: 'rgba(44,24,16,0.78)',
      }
    }
    if (hour >= 17 && hour < 21) {
      return {
        cardBg: 'rgba(80,40,80,0.75)',
        text: '#ffffff',
        subtext: 'rgba(255,255,255,0.82)',
      }
    }
    return {
      cardBg: 'rgba(15,20,45,0.75)',
      text: '#ffffff',
      subtext: 'rgba(255,255,255,0.82)',
    }
  }, [])

  const callAiRecap = async (payloadPrompt) => {
    const endpoints = ['/api/ai-companion', '/.netlify/functions/ai-companion']
    let lastError = null
    for (const endpoint of endpoints) {
      try {
        const res = await fetch(endpoint, {
          method: 'POST',
          headers: { 'content-type': 'application/json' },
          body: JSON.stringify({ messages: [{ role: 'user', content: payloadPrompt }] }),
        })
        if (!res.ok) {
          const body = await res.text()
          lastError = new Error(`${endpoint} ${res.status}: ${body}`)
          continue
        }
        const data = await res.json()
        const text = (data?.reply || '').trim()
        if (text) return text
      } catch (e) {
        lastError = e
      }
    }
    throw lastError || new Error('Unable to generate recap.')
  }

  useEffect(() => {
    setDismissed(localStorage.getItem(localDismissKey) === 'true')
  }, [localDismissKey])

  const generateRecap = async () => {
    if (loading) return
    setLoading(true)
    setError('')
    try {
      const {
        data: { user: authUser },
        error: authError,
      } = await supabase.auth.getUser()
      if (authError) {
        logSupabaseTableError('auth.getUser', authError)
        setError('Could not verify your session. Please sign in again.')
        return
      }
      const uid = authUser?.id
      if (!uid) {
        setError('Sign in to generate your recap.')
        return
      }
      if (userId && userId !== uid) {
        console.warn('[WeeklyRecap] Session user id does not match userId prop; using authenticated session user.')
      }

      const sevenDaysAgo = new Date()
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7)
      const sinceIso = sevenDaysAgo.toISOString()

      const [readingRows, journalRows, prayerRows] = await Promise.all([
        fetchReadingProgressRows(uid),
        fetchJournalRowsLast7Days(uid, sinceIso),
        fetchPrayerRowsLast7Days(uid, sinceIso),
      ])
      const readingSummary = summarizeReading(readingRows)

      const nextStats = {
        chaptersRead: readingSummary.chaptersRead,
        journals: journalRows.length,
        prayers: prayerRows.length,
        streak: Math.max(0, Number(profile?.reading_streak) || 0),
      }
      setStats(nextStats)

      const payloadPrompt = [
        'Based on this user\'s Bible reading, journal entries, and prayers this week, write a warm, encouraging 3-4 sentence spiritual recap.',
        'Mention specific books they read, note patterns in their prayers or journal, and end with an encouraging scripture.',
        'Keep it personal and faith-focused.',
        '',
        `Books read this week: ${readingSummary.topBooks.join(', ') || 'None recorded'}`,
        `Chapters completed this week: ${nextStats.chaptersRead}`,
        `Journal entries this week: ${nextStats.journals}`,
        `Prayer entries this week: ${nextStats.prayers}`,
        `Current reading streak: ${nextStats.streak}`,
        `Recent journal notes: ${(journalRows || []).slice(0, 3).map((j) => (j.content || j.entry || j.verse || j.verse_text || j.verse_reference || '').slice(0, 160)).filter(Boolean).join(' | ') || 'None'}`,
        `Recent prayers: ${(prayerRows || []).slice(0, 3).map((p) => (p.prayer_text || '').slice(0, 160)).filter(Boolean).join(' | ') || 'None'}`,
      ].join('\n')

      if (typeof window !== 'undefined' && window.location?.hostname === 'localhost') {
        setRecap('Your weekly recap will be available on the live app 🙏')
        setError('')
        return
      }

      const aiText = await callAiRecap(payloadPrompt)
      setRecap(aiText || 'God is at work in your week. Keep seeking Him in Word and prayer.')
    } catch (e) {
      setRecap('Your weekly recap will be available on the live app 🙏')
      setError('')
      if (import.meta.env.DEV) console.error('weekly recap error', e)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (autoGenerate && !dismissed && !recap && !loading) {
      generateRecap()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, dismissed])

  if (dismissed) {
    return (
      <article
        className="home-gold-glass"
        style={{
          borderRadius: '16px',
          padding: '14px 16px',
          border: '1px solid rgba(212,175,55,0.55)',
          marginTop: '12px',
          marginBottom: '12px',
        }}
      >
        <button
          type="button"
          onClick={() => {
            localStorage.removeItem(localDismissKey)
            setDismissed(false)
          }}
          style={{
            backgroundColor: '#D4AF37',
            color: '#1a1a1a',
            fontWeight: 'bold',
            border: 'none',
            borderRadius: '12px',
            padding: '14px',
            width: '100%',
            cursor: 'pointer',
            fontSize: '16px',
          }}
        >
          View Weekly Recap
        </button>
      </article>
    )
  }

  return (
    <article
      style={{ backgroundColor: 'rgba(245,237,214,0.85)', borderRadius: '16px', padding: '16px', border: '1px solid rgba(212,175,55,0.55)', marginTop: '12px', marginBottom: '12px' }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
        <p style={{ margin: 0, color: themedStyles.text, fontWeight: 800, fontSize: '14px' }}>Weekly Spiritual Recap ✨</p>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(localDismissKey, 'true')
            setDismissed(true)
            if (onDismiss) onDismiss()
          }}
          style={{ border: '1px solid rgba(212,175,55,0.45)', borderRadius: '999px', background: 'transparent', color: themedStyles.subtext, padding: '4px 10px', cursor: 'pointer', fontSize: '11px' }}
        >
          Dismiss
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '8px', marginTop: '10px' }}>
        <div style={{ fontSize: '12px', color: themedStyles.text }}>📖 {stats.chaptersRead} ch</div>
        <div style={{ fontSize: '12px', color: themedStyles.text }}>📝 {stats.journals} journal</div>
        <div style={{ fontSize: '12px', color: themedStyles.text }}>🙏 {stats.prayers} prayers</div>
        <div style={{ fontSize: '12px', color: themedStyles.text }}>🔥 {stats.streak} streak</div>
      </div>

      {recap ? (
        <p style={{ margin: '10px 0 0', color: themedStyles.text, fontSize: '14px', lineHeight: 1.6 }}>{recap}</p>
      ) : (
        <p style={{ margin: '10px 0 0', color: themedStyles.subtext, fontSize: '13px' }}>
          {loading ? 'Generating your recap…' : 'Generate a personalized recap from your week with God.'}
        </p>
      )}

      {error ? <p style={{ margin: '8px 0 0', color: '#fca5a5', fontSize: '12px' }}>{error}</p> : null}

      <button
        type="button"
        onClick={generateRecap}
        disabled={loading}
        style={{ backgroundColor: '#D4AF37', color: '#1a1a1a', fontWeight: 'bold', border: 'none', borderRadius: '12px', padding: '14px', width: '100%', cursor: 'pointer', fontSize: '16px' }}
      >
        {loading ? 'Preparing Recap…' : (recap ? 'Regenerate Weekly Recap' : 'View Weekly Recap')}
      </button>
    </article>
  )
}

export { weekKeyForDate }
