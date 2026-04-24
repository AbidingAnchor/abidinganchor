import { useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'
import { useAiUsage } from '../hooks/useAiUsage'
import { withAiLimit } from '../utils/withAiLimit'

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

export default function WeeklyRecap({ weekStorageKey, autoGenerate = false, userId, onDismiss }) {
  const { t } = useTranslation()
  const { profile } = useAuth()
  const { checkAndIncrement } = useAiUsage()
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [recap, setRecap] = useState('')
  const [stats, setStats] = useState({ chaptersRead: 0, journals: 0, prayers: 0, streak: 0 })
  const [dismissed, setDismissed] = useState(false)
  const [limitReachedOpen, setLimitReachedOpen] = useState(false)
  const localDismissKey = useMemo(() => `weekly-recap-dismissed-${weekStorageKey}`, [weekStorageKey])

  const callAiRecap = async (payloadPrompt) => {
    const API_URL = import.meta.env.VITE_AI_API_URL || '/api/ai-companion'
    const endpoints = [API_URL, '/.netlify/functions/ai-companion']
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

      const aiCallFn = async () => {
        return await callAiRecap(payloadPrompt)
      }

      const result = await withAiLimit(
        checkAndIncrement,
        aiCallFn,
        {
          isSupporter: profile?.is_supporter || false,
          onLimitReached: () => {
            setLimitReachedOpen(true)
          }
        }
      )

      if (result === null) {
        setRecap('You have reached your daily AI limit. Upgrade to Supporter for unlimited access.')
        setError('')
        return
      }

      const aiText = await result
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
        className="home-gold-glass rounded-[20px] p-5"
        style={{
          marginTop: '12px',
          marginBottom: '28px',
          animation: 'fadeInUp 0.6s ease forwards',
          animationDelay: '0.25s',
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
          {t('weeklyRecap.viewButton')}
        </button>
      </article>
    )
  }

  return (
    <article
      className="home-gold-glass rounded-[20px] p-5"
      style={{
        marginTop: '12px',
        marginBottom: '28px',
        animation: 'fadeInUp 0.6s ease forwards',
        animationDelay: '0.25s',
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: '10px', alignItems: 'center' }}>
        <p style={{ margin: 0, color: 'var(--text-primary)', fontWeight: 800, fontSize: '14px' }}>
          {t('weeklyRecap.title')} ✨
        </p>
        <button
          type="button"
          onClick={() => {
            localStorage.setItem(localDismissKey, 'true')
            setDismissed(true)
            if (onDismiss) onDismiss()
          }}
          style={{
            border: '1px solid rgba(212, 168, 67, 0.35)',
            borderRadius: '999px',
            background: 'transparent',
            color: 'var(--text-secondary)',
            padding: '4px 10px',
            cursor: 'pointer',
            fontSize: '11px',
          }}
        >
          {t('common.dismiss')}
        </button>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, minmax(0,1fr))', gap: '8px', marginTop: '10px' }}>
        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>📖 {stats.chaptersRead} {t('weeklyRecap.chapters')}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>📝 {stats.journals} {t('weeklyRecap.journal')}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>🙏 {stats.prayers} {t('weeklyRecap.prayers')}</div>
        <div style={{ fontSize: '12px', color: 'var(--text-primary)' }}>🔥 {stats.streak} {t('weeklyRecap.streak')}</div>
      </div>

      {recap ? (
        <p style={{ margin: '10px 0 0', color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.6 }}>{recap}</p>
      ) : (
        <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', fontSize: '13px', lineHeight: 1.5 }}>
          {loading ? t('weeklyRecap.generating') : t('weeklyRecap.generatePrompt')}
        </p>
      )}

      {error ? (
        <p style={{ margin: '8px 0 0', color: '#f87171', fontSize: '12px', lineHeight: 1.45 }}>{error}</p>
      ) : null}

      <button
        type="button"
        onClick={generateRecap}
        disabled={loading}
        style={{
          marginTop: '12px',
          backgroundColor: '#D4AF37',
          color: '#1a1a1a',
          fontWeight: 'bold',
          border: 'none',
          borderRadius: '12px',
          padding: '14px',
          width: '100%',
          cursor: loading ? 'not-allowed' : 'pointer',
          fontSize: '16px',
          opacity: loading ? 0.85 : 1,
        }}
      >
        {loading ? 'Preparing Recap…' : (recap ? 'Regenerate Weekly Recap' : t('weeklyRecap.viewButton'))}
      </button>

      {limitReachedOpen && (
        <div
          className="fixed inset-0 z-[10050] flex items-center justify-center p-4"
          style={{ background: 'rgba(0,0,0,0.7)' }}
          onClick={() => setLimitReachedOpen(false)}
        >
          <div
            className="relative z-10 w-full max-w-md overflow-hidden rounded-2xl"
            style={{
              background: 'var(--modal-bg)',
              border: '1px solid var(--glass-border)',
              padding: '24px',
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <h2 style={{ color: '#D4A843', fontSize: '20px', fontWeight: 700, marginBottom: '12px' }}>
              Daily Limit Reached
            </h2>
            <p style={{ color: 'white', fontSize: '15px', lineHeight: 1.5, marginBottom: '16px' }}>
              You've reached your daily limit of 5 AI interactions. Upgrade to Supporter for unlimited access to weekly recaps.
            </p>
            <div style={{ display: 'flex', gap: '12px' }}>
              <button
                type="button"
                onClick={() => setLimitReachedOpen(false)}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'transparent',
                  color: 'white',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() => {
                  setLimitReachedOpen(false)
                  window.location.href = '/support'
                }}
                style={{
                  flex: 1,
                  padding: '12px',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#D4A843',
                  color: '#0a1432',
                  fontSize: '15px',
                  fontWeight: 600,
                  cursor: 'pointer',
                }}
              >
                Upgrade to Supporter
              </button>
            </div>
          </div>
        </div>
      )}
    </article>
  )
}

export { weekKeyForDate }
