import { useCallback, useEffect, useRef, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PrayerWall from './PrayerWall'

export default function Prayer() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [mainTab, setMainTab] = useState('mine')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  const load = useCallback(async () => {
    if (!user?.id) return
    setLoading(true)
    try {
      const { data, error } = await supabase
        .from('personal_prayers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = data || []
      setItems(rows)
      setAnsweredCount(rows.filter((r) => r.answered).length)
    } catch (e) {
      console.error('Error loading personal prayers:', e)
      setItems([])
    } finally {
      setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    if (!toast) return
    if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    toastTimerRef.current = setTimeout(() => setToast(null), 3800)
    return () => {
      if (toastTimerRef.current) clearTimeout(toastTimerRef.current)
    }
  }, [toast])

  const addPrayer = async () => {
    const text = draft.trim()
    if (!text || !user?.id) return
    setSaving(true)
    try {
      const { error } = await supabase.from('personal_prayers').insert({
        user_id: user.id,
        prayer_text: text,
        answered: false,
      })
      if (error) throw error
      setDraft('')
      setShowAddModal(false)
      await load()
    } catch (e) {
      console.error('Error saving prayer:', e)
    } finally {
      setSaving(false)
    }
  }

  const markAnswered = async (row) => {
    if (row.answered) {
      try {
        const { error } = await supabase
          .from('personal_prayers')
          .update({ answered: false, answered_at: null })
          .eq('id', row.id)
        if (error) throw error
        await load()
      } catch (e) {
        console.error(e)
      }
      return
    }
    try {
      const { error } = await supabase
        .from('personal_prayers')
        .update({
          answered: true,
          answered_at: new Date().toISOString(),
        })
        .eq('id', row.id)
      if (error) throw error
      setToast(t('prayer.toastFaithful'))
      await load()
    } catch (e) {
      console.error(e)
    }
  }

  const onStillBelieving = () => {
    setToast(t('prayer.stillBelievingToast'))
  }

  return (
    <div className="bg-transparent">
      <div className="content-scroll px-4 pt-3 max-w-[680px] mx-auto w-full">
        <div className="flex gap-1 p-1 rounded-xl bg-[#0a1028]/90 border border-white/10 mb-6 backdrop-blur-md">
          <button
            type="button"
            onClick={() => setMainTab('mine')}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${
              mainTab === 'mine'
                ? 'bg-[#1e1b3a] text-[#D4A843] border border-[#D4A843]/35 shadow-[0_0_20px_rgba(212,168,67,0.12)]'
                : 'text-white/55 hover:text-white/85'
            }`}
          >
            {t('prayer.tabMyPrayers')}
          </button>
          <button
            type="button"
            onClick={() => setMainTab('wall')}
            className={`flex-1 py-3 rounded-lg text-sm font-semibold transition-colors ${
              mainTab === 'wall'
                ? 'bg-[#1e1b3a] text-[#D4A843] border border-[#D4A843]/35 shadow-[0_0_20px_rgba(212,168,67,0.12)]'
                : 'text-white/55 hover:text-white/85'
            }`}
          >
            {t('prayer.tabPrayerWall')}
          </button>
        </div>

        {mainTab === 'mine' ? (
          <>
            <p className="text-[10px] uppercase tracking-[0.18em] text-center text-[#D4A843]/75 mb-1">
              {t('prayer.personalPrivateKicker')}
            </p>
            <p className="text-center text-[#D4A843] text-lg font-bold mb-6 drop-shadow-[0_0_12px_rgba(212,168,67,0.25)]">
              {t('prayer.statAnsweredCount', { count: answeredCount })}
            </p>

            <button type="button" onClick={() => setShowAddModal(true)} className="btn-primary w-full mb-6">
              {t('prayer.addPersonalPrayer')}
            </button>

            {loading ? (
              <p className="text-center text-white/50 py-12">{t('prayer.loading')}</p>
            ) : items.length === 0 ? (
              <div className="rounded-2xl border border-white/10 bg-[#1e1b3a]/60 p-8 text-center text-white/50 text-sm">
                {t('prayer.personalEmpty')}
              </div>
            ) : (
              <ul className="space-y-4 list-none p-0 m-0">
                {items.map((row) => (
                  <li
                    key={row.id}
                    className={[
                      'rounded-2xl border border-white/10 border-l-4 pl-4 pr-4 py-4 bg-[#1e1b3a]',
                      row.answered
                        ? 'border-l-green-400 personal-prayer-card--answered'
                        : 'border-l-amber-500',
                    ].join(' ')}
                  >
                    {row.answered ? (
                      <div className="flex items-start gap-2 mb-3">
                        <span className="text-emerald-400 text-xl leading-none font-bold" aria-hidden>
                          ✓
                        </span>
                        <p className="text-xs font-semibold text-[#D4A843] leading-snug">
                          {t('prayer.answeredOnLine', {
                            date: row.answered_at
                              ? new Date(row.answered_at).toLocaleDateString(i18n.language, {
                                  year: 'numeric',
                                  month: 'long',
                                  day: 'numeric',
                                })
                              : '—',
                          })}
                        </p>
                      </div>
                    ) : null}
                    <p className="text-white text-[15px] leading-relaxed mb-3 whitespace-pre-wrap">{row.prayer_text}</p>
                    <p className="text-white/40 text-xs mb-4">
                      {t('prayer.addedOn')}{' '}
                      {new Date(row.created_at).toLocaleDateString(i18n.language)}
                    </p>
                    {!row.answered ? (
                      <div className="flex flex-wrap gap-2">
                        <button
                          type="button"
                          onClick={onStillBelieving}
                          className="flex-1 min-w-[140px] py-2.5 rounded-xl bg-white/5 border border-white/15 text-white text-sm font-semibold hover:bg-white/10 active:scale-[0.99]"
                        >
                          {t('prayer.stillBelievingBtn')}
                        </button>
                        <button
                          type="button"
                          onClick={() => markAnswered(row)}
                          className="flex-1 min-w-[140px] py-2.5 rounded-xl bg-[#D4A843]/15 border border-[#D4A843]/45 text-[#F5E6B8] text-sm font-bold hover:bg-[#D4A843]/25 active:scale-[0.99]"
                        >
                          {t('prayer.godAnsweredButton')}
                        </button>
                      </div>
                    ) : (
                      <button
                        type="button"
                        onClick={() => markAnswered(row)}
                        className="text-xs text-white/45 hover:text-white/70 underline underline-offset-2"
                      >
                        {t('prayer.unmarkAnswered')}
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <PrayerWall />
        )}
      </div>

      {showAddModal ? (
        <div className="fixed inset-0 z-[100] flex items-end justify-center">
          <div
            className="glass-scrim fixed inset-0"
            onClick={() => setShowAddModal(false)}
            aria-hidden
          />
          <div className="glass relative z-10 w-full max-w-md rounded-t-3xl p-6 border-t border-white/10">
            <h2 className="text-[#D4A843] font-bold text-center mb-4">{t('prayer.addPersonalPrayer')}</h2>
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              className="w-full min-h-[140px] rounded-xl bg-white/8 border border-white/15 p-4 text-white placeholder:text-white/35 mb-4 outline-none focus:border-[#D4A843]/40"
              placeholder={t('prayer.personalPlaceholder')}
            />
            <button
              type="button"
              className="btn-primary w-full mb-2 disabled:opacity-50"
              disabled={saving || !draft.trim()}
              onClick={addPrayer}
            >
              {saving ? '…' : t('prayer.savePrayer')}
            </button>
            <button
              type="button"
              className="w-full py-2 text-white/50 text-sm hover:text-white/75"
              onClick={() => setShowAddModal(false)}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      ) : null}

      {toast ? (
        <div className="prayer-faithful-toast" role="status" aria-live="polite">
          <span className="prayer-faithful-toast__sparkle" aria-hidden>
            ✨
          </span>
          <span>{toast}</span>
        </div>
      ) : null}
    </div>
  )
}
