import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PrayerWall from './PrayerWall'
import GuidedPrayersSection from '../components/GuidedPrayersSection'

export default function Prayer() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [mainTab, setMainTab] = useState('mine')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [answeredCount, setAnsweredCount] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDeletePrayerId, setPendingDeletePrayerId] = useState(null)
  const [deletingPrayerId, setDeletingPrayerId] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)

  const load = useCallback(async (opts = {}) => {
    const silent = opts.silent === true
    if (!user?.id) return
    if (!silent) setLoading(true)
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
      if (!silent) setItems([])
    } finally {
      if (!silent) setLoading(false)
    }
  }, [user?.id])

  useEffect(() => {
    load()
  }, [load])

  useEffect(() => {
    const seed = location.state?.dailyPrayerSeed
    if (!seed?.text?.trim()) return
    setDraft(seed.text.trim())
    setShowAddModal(true)
    setMainTab('mine')
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, location.pathname, navigate])

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
      const { data: row, error } = await supabase
        .from('personal_prayers')
        .insert({
          user_id: user.id,
          prayer_text: text,
          answered: false,
        })
        .select()
        .single()
      if (error) throw error
      setDraft('')
      setShowAddModal(false)
      if (row) {
        setItems((prev) => {
          const next = [row, ...prev.filter((p) => p.id !== row.id)]
          return next
        })
      }
      await load({ silent: true })
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

  const deletePrayer = async (row) => {
    if (!row?.id) return

    try {
      setDeletingPrayerId(row.id)
      const { error } = await supabase
        .from('personal_prayers')
        .delete()
        .eq('id', row.id)
      if (error) throw error

      setItems((prev) => prev.filter((item) => item.id !== row.id))
      setAnsweredCount((prev) => Math.max(0, prev - (row.answered ? 1 : 0)))
      setPendingDeletePrayerId((current) => (current === row.id ? null : current))
    } catch (e) {
      console.error('Error deleting prayer:', e)
    } finally {
      setDeletingPrayerId((current) => (current === row.id ? null : current))
    }
  }

  const onStillBelieving = () => {
    setToast(t('prayer.stillBelievingToast'))
  }

  return (
    <div className="bg-transparent">
      <div className="content-scroll px-4 pt-3 max-w-[680px] mx-auto w-full">
        <div className="prayer-page-main-tabs">
          <button
            type="button"
            onClick={() => setMainTab('mine')}
            className={`prayer-page-main-tab ${mainTab === 'mine' ? 'prayer-page-main-tab--active' : ''}`}
          >
            {t('prayer.tabMyPrayers')}
          </button>
          <button
            type="button"
            onClick={() => setMainTab('wall')}
            className={`prayer-page-main-tab ${mainTab === 'wall' ? 'prayer-page-main-tab--active' : ''}`}
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
              <div
                className="rounded-2xl p-8 text-center text-sm"
                style={{
                  background: 'rgba(255, 255, 255, 0.3)',
                  border: '1px solid #D4A843',
                  borderRadius: '12px',
                  color: '#1a1a2e',
                }}
              >
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
                    <div className="mt-3 flex justify-end">
                      {pendingDeletePrayerId === row.id ? (
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => deletePrayer(row)}
                            disabled={deletingPrayerId === row.id}
                            className="rounded-full border border-red-300/70 px-3 py-1 text-xs text-red-200 hover:bg-red-500/10 disabled:opacity-60"
                          >
                            {deletingPrayerId === row.id ? 'Deleting…' : 'Yes, Delete'}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeletePrayerId(null)}
                            disabled={deletingPrayerId === row.id}
                            className="rounded-full border border-white/25 px-3 py-1 text-xs text-white/70 hover:bg-white/10 disabled:opacity-60"
                          >
                            Cancel
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingDeletePrayerId(row.id)}
                          className="text-xs text-red-300/85 hover:text-red-200 transition-colors"
                          aria-label="Delete prayer"
                        >
                          🗑 Delete
                        </button>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </>
        ) : (
          <>
            <GuidedPrayersSection />
            <PrayerWall />
          </>
        )}
      </div>

      {showAddModal && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div
                aria-hidden="true"
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.5)',
                  zIndex: 10050,
                }}
                onClick={() => setShowAddModal(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                onClick={(e) => e.stopPropagation()}
                style={{
                  position: 'fixed',
                  top: '50%',
                  left: '50%',
                  transform: 'translate(-50%, -50%)',
                  zIndex: 10051,
                  width: 'min(90vw, 390px)',
                  maxWidth: '100%',
                  maxHeight: '85vh',
                  overflowY: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  boxSizing: 'border-box',
                  borderRadius: '20px',
                  padding: '24px 20px',
                  background: 'rgba(10, 15, 40, 0.97)',
                  border: '1px solid rgba(255,255,255,0.1)',
                }}
              >
                <h2 className="text-[#D4A843] font-bold text-center mb-4">{t('prayer.addPersonalPrayer')}</h2>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  className="relative z-10 w-full min-h-[140px] rounded-xl border border-white/15 p-4 mb-4 outline-none focus:border-[#D4A843]/40 pointer-events-auto caret-[#F5E6B8] placeholder:text-[rgba(255,255,255,0.55)]"
                  style={{
                    color: '#ffffff',
                    backgroundColor: 'rgba(255, 255, 255, 0.08)',
                  }}
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
            </>,
            document.body,
          )
        : null}

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
