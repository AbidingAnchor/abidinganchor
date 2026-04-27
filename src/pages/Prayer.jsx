import { useCallback, useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { useLocation, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'
import PrayerWall from './PrayerWall'
import GuidedPrayersSection from '../components/GuidedPrayersSection'
import GuestPreviewBanner from '../components/GuestPreviewBanner'
import { getGuestBrowse } from '../utils/guestBrowse'
import { useGuestSignupModal } from '../context/GuestSignupModalContext'
import { fetchVerse } from '../utils/bibleTranslation'

export default function Prayer() {
  const { t, i18n } = useTranslation()
  const location = useLocation()
  const navigate = useNavigate()
  const { user } = useAuth()
  const { openGuestSignupModal } = useGuestSignupModal()
  const [mainTab, setMainTab] = useState('mine')
  const [items, setItems] = useState([])
  const [loading, setLoading] = useState(true)
  const [AnsweredCount, setAnsweredCount] = useState(0)
  const [showAddModal, setShowAddModal] = useState(false)
  const [draft, setDraft] = useState('')
  const [saving, setSaving] = useState(false)
  const [pendingDeletePrayerId, setPendingDeletePrayerId] = useState(null)
  const [deletingPrayerId, setDeletingPrayerId] = useState(null)
  const [toast, setToast] = useState(null)
  const toastTimerRef = useRef(null)
  const [dailyVerseText, setDailyVerseText] = useState('')
  const [dailyVerseLoading, setDailyVerseLoading] = useState(true)

  const load = useCallback(async (opts = {}) => {
    const silent = opts.silent === true
    if (!user?.id) {
      console.log('[Prayer] No user ID, skipping load')
      setItems([])
      setAnsweredCount(0)
      setLoading(false)
      return
    }
    if (!silent) setLoading(true)
    try {
      console.log('[Prayer] Loading prayers for user:', user.id)
      const { data, error } = await supabase
        .from('personal_prayers')
        .select('*')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      const rows = data || []
      console.log('[Prayer] Loaded', rows.length, 'prayers:', rows)
      setItems(rows)
      setAnsweredCount(rows.filter((r) => r.answered).length)
    } catch (e) {
      console.error('[Prayer] Error loading personal prayers:', e)
      console.error('[Prayer] Error details:', JSON.stringify(e, null, 2))
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
    // Only auto-open modal if explicitly navigating with daily prayer seed
    // Clear the state to prevent re-triggering on refresh
    navigate(location.pathname, { replace: true, state: {} })
  }, [location.state, location.pathname, navigate])

  useEffect(() => {
    const loadDailyVerse = async () => {
      setDailyVerseLoading(true)
      const lang = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().split(/[-_]/)[0]
      const cacheKey = `verse-cache-${lang}-50-4-6`
      const cached = localStorage.getItem(cacheKey)
      if (cached) {
        console.log('[Prayer] using cached verse')
        setDailyVerseText(cached)
        setDailyVerseLoading(false)
        return
      }
      try {
        const text = await fetchVerse(50, 4, 6, lang)
        console.log('[Prayer] verse result:', text)
        localStorage.setItem(cacheKey, text)
        setDailyVerseText(text)
      } catch (err) {
        console.error('[Prayer] Failed to fetch Philippians 4:6:', err)
        setDailyVerseText('')
      } finally {
        setDailyVerseLoading(false)
      }
    }

    loadDailyVerse()
  }, [i18n.resolvedLanguage, i18n.language])

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
    if (!text) return
    if (!user?.id) {
      if (getGuestBrowse()) openGuestSignupModal()
      return
    }
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
    <div style={{ background: 'transparent', minHeight: '100vh', animation: 'fadeIn 0.6s ease-out' }}>
      <div className="content-scroll prayer-page" style={{ padding: '60px 16px 100px', maxWidth: '680px', margin: '0 auto' }}>
        <GuestPreviewBanner />
        
        {/* Header */}
        <div style={{ marginBottom: '32px', animation: 'fadeIn 0.6s ease-out' }}>
          <h1 style={{
            color: '#ffffff',
            fontSize: '32px',
            fontWeight: 800,
            marginBottom: '8px',
            letterSpacing: '-0.02em',
          }}>
            {t('prayer.prayer')}
          </h1>
          <p style={{
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '15px',
            marginBottom: '20px',
          }}>
            {t('prayer.prayerSubtitle')}
          </p>
        </div>

        {/* Main Tabs */}
        <div style={{
          display: 'flex',
          gap: '12px',
          marginBottom: '32px',
          animation: 'fadeIn 0.6s ease-out 0.1s both',
        }}>
          <button
            type="button"
            onClick={() => setMainTab('mine')}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '50px',
              height: '44px',
              border: '1px solid rgba(212,168,67,0.3)',
              background: mainTab === 'mine'
                ? '#D4A843'
                : '#F0E8D4',
              color: '#1A1A1A',
              fontSize: '15px',
              fontWeight: mainTab === 'mine' ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {t('prayer.tabMyPrayers')}
          </button>
          <button
            type="button"
            onClick={() => setMainTab('wall')}
            style={{
              flex: 1,
              padding: '12px 20px',
              borderRadius: '50px',
              height: '44px',
              border: '1px solid rgba(212,168,67,0.3)',
              background: mainTab === 'wall'
                ? '#D4A843'
                : '#F0E8D4',
              color: '#1A1A1A',
              fontSize: '15px',
              fontWeight: mainTab === 'wall' ? 700 : 500,
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
          >
            {t('prayer.tabPrayerWall')}
          </button>
        </div>

        {mainTab === 'mine' ? (
          <>
            {/* My Prayers Section */}
            <div style={{
              marginBottom: '24px',
              animation: 'fadeIn 0.6s ease-out 0.2s both',
            }}>
              <p
                className="prayer-section-rail"
                style={{
                color: '#D4A843',
                fontSize: '11px',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.18em',
                marginBottom: '16px',
              }}
              >
                {t('prayer.tabMyPrayers')}
              </p>
            </div>

            {loading ? (
              <div style={{
                textAlign: 'center',
                padding: '48px 24px',
                color: 'rgba(255, 255, 255, 0.5)',
              }}>
                {t('prayer.loading')}
              </div>
            ) : items.length === 0 ? (
              <>
                <div className="prayer-empty-card" style={{
                  background: 'linear-gradient(145deg, rgba(15, 22, 55, 0.92), rgba(10, 15, 40, 0.97))',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(212, 168, 67, 0.2)',
                  borderRadius: '20px',
                  padding: '48px 32px',
                  textAlign: 'center',
                  boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(212, 168, 67, 0.08)',
                  animation: 'fadeIn 0.6s ease-out 0.3s both',
                }}>
                  <div style={{
                    width: '64px',
                    height: '64px',
                    background: 'rgba(212,168,67,0.12)',
                    border: '1px solid rgba(212,168,67,0.3)',
                    borderRadius: '20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: '32px',
                    margin: '0 auto 24px',
                  }}>
                    🙏
                  </div>
                  <h3 style={{
                    color: '#ffffff',
                    fontSize: '22px',
                    fontWeight: 800,
                    marginBottom: '8px',
                  }}>
                    {t('prayer.prayersHeard')}
                  </h3>
                  <p style={{
                    color: 'rgba(255, 255, 255, 0.5)',
                    fontSize: '15px',
                    marginBottom: '24px',
                  }}>
                    {t('prayer.prayersEmpty')}
                  </p>
                  <button
                    type="button"
                    onClick={() => setShowAddModal(true)}
                    style={{
                      padding: '14px 32px',
                      borderRadius: '50px',
                      border: 'none',
                      background: 'linear-gradient(135deg, #D4A843 0%, #B8860B 100%)',
                      color: '#0a0f28',
                      fontSize: '15px',
                      fontWeight: 600,
                      cursor: 'pointer',
                      transition: 'all 0.2s ease',
                      boxShadow: '0 4px 20px rgba(212, 168, 67, 0.4)',
                    }}
                  >
                    {t('prayer.addFirstPrayer')}
                  </button>
                </div>
                
                {/* Inspirational Verse Card */}
                <div className="prayer-for-today-card" style={{
                  background: '#F0E8D4',
                  border: '1px solid rgba(212,168,67,0.3)',
                  borderRadius: '16px',
                  padding: '16px',
                  marginTop: '16px',
                  animation: 'fadeIn 0.6s ease-out 0.4s both',
                }}>
                  <p style={{
                    fontSize: '11px',
                    letterSpacing: '1.5px',
                    color: '#1A1A1A',
                    textTransform: 'uppercase',
                    marginBottom: '12px',
                    fontWeight: 600,
                  }}>
                    {t('prayer.prayerForToday')}
                  </p>
                  <p style={{
                    fontSize: '15px',
                    fontStyle: 'italic',
                    color: '#1A1A1A',
                    lineHeight: 1.7,
                    marginBottom: '12px',
                  }}>
                    {dailyVerseLoading ? '...' : dailyVerseText}
                  </p>
                  <p style={{
                    fontSize: '13px',
                    color: '#1A1A1A',
                    fontWeight: 700,
                  }}>
                    {dailyVerseLoading ? '...' : `${t('bible.books.philippians')} 4:6`}
                  </p>
                </div>
              </>
            ) : (
              <ul style={{ listStyle: 'none', padding: 0, margin: 0, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                {items.map((row, index) => (
                  <li
                    key={row.id}
                    className="prayer-list-card"
                    style={{
                      background: 'linear-gradient(145deg, rgba(15, 22, 55, 0.92), rgba(10, 15, 40, 0.97))',
                      backdropFilter: 'blur(20px)',
                      WebkitBackdropFilter: 'blur(20px)',
                      border: '1px solid rgba(212, 168, 67, 0.2)',
                      borderLeft: `3px solid ${row.answered ? '#10B981' : '#D4A843'}`,
                      borderRadius: '20px',
                      padding: '24px',
                      boxShadow: '0 8px 32px rgba(0, 0, 0, 0.4), 0 2px 8px rgba(212, 168, 67, 0.08)',
                      animation: `fadeIn 0.6s ease-out ${0.3 + index * 0.05}s both`,
                      transition: 'all 0.2s ease',
                    }}
                  >
                    {/* Header with status */}
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        {row.answered ? (
                          <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '50%',
                            background: 'linear-gradient(135deg, #10B981 0%, #059669 100%)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: '#ffffff',
                            fontSize: '16px',
                            fontWeight: 600,
                          }}>
                            ✓
                          </div>
                        ) : (
                          <div style={{
                            width: '12px',
                            height: '12px',
                            borderRadius: '50%',
                            background: '#D4A843',
                            boxShadow: '0 0 12px rgba(212, 168, 67, 0.6)',
                            animation: 'pulse 2s ease-in-out infinite',
                          }} />
                        )}
                        <div>
                          <p style={{
                            color: row.answered ? '#10B981' : '#D4A843',
                            fontSize: '12px',
                            fontWeight: 600,
                            marginBottom: '2px',
                          }}>
                            {row.answered ? t('prayer.answeredBadge') : t('prayer.stillBelievingBtn')}
                          </p>
                          <p style={{
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontSize: '11px',
                          }}>
                            {new Date(row.created_at).toLocaleDateString(i18n.language)}
                          </p>
                        </div>
                      </div>
                    </div>

                    {/* Prayer content */}
                    <p style={{
                      color: 'rgba(255, 255, 255, 0.9)',
                      fontSize: '15px',
                      lineHeight: 1.6,
                      marginBottom: '20px',
                      whiteSpace: 'pre-wrap',
                    }}>
                      {row.prayer_text}
                    </p>

                    {/* Action buttons */}
                    <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                      {!row.answered ? (
                        <>
                          <button
                            type="button"
                            onClick={onStillBelieving}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              borderRadius: '12px',
                              border: '1px solid rgba(255, 255, 255, 0.15)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'rgba(255, 255, 255, 0.85)',
                              fontSize: '13px',
                              fontWeight: 500,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {t('prayer.stillBelievingBtn')}
                          </button>
                          <button
                            type="button"
                            onClick={() => markAnswered(row)}
                            style={{
                              flex: 1,
                              padding: '10px 16px',
                              borderRadius: '12px',
                              border: 'none',
                              background: 'linear-gradient(135deg, #D4A843 0%, #B8860B 100%)',
                              color: '#0a0f28',
                              fontSize: '13px',
                              fontWeight: 600,
                              cursor: 'pointer',
                              transition: 'all 0.2s ease',
                            }}
                          >
                            {t('prayer.godAnswered')}
                          </button>
                        </>
                      ) : (
                        <button
                          type="button"
                          onClick={() => markAnswered(row)}
                          style={{
                            padding: '8px 16px',
                            borderRadius: '12px',
                            border: '1px solid rgba(16, 185, 129, 0.3)',
                            background: 'rgba(16, 185, 129, 0.1)',
                            color: '#10B981',
                            fontSize: '12px',
                            fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                          }}
                        >
                          {t('prayer.unmarkBtn')}
                        </button>
                      )}
                      
                      {/* Delete button */}
                      {pendingDeletePrayerId === row.id ? (
                        <div style={{ display: 'flex', gap: '8px', marginLeft: 'auto' }}>
                          <button
                            type="button"
                            onClick={() => deletePrayer(row)}
                            disabled={deletingPrayerId === row.id}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '12px',
                              border: '1px solid rgba(239, 68, 68, 0.5)',
                              background: 'rgba(239, 68, 68, 0.1)',
                              color: '#FCA5A5',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: deletingPrayerId === row.id ? 'not-allowed' : 'pointer',
                              opacity: deletingPrayerId === row.id ? 0.6 : 1,
                            }}
                          >
                            {deletingPrayerId === row.id ? t('prayer.deleting') : t('prayer.yesDelete')}
                          </button>
                          <button
                            type="button"
                            onClick={() => setPendingDeletePrayerId(null)}
                            disabled={deletingPrayerId === row.id}
                            style={{
                              padding: '8px 16px',
                              borderRadius: '12px',
                              border: '1px solid rgba(255, 255, 255, 0.2)',
                              background: 'rgba(255, 255, 255, 0.05)',
                              color: 'rgba(255, 255, 255, 0.7)',
                              fontSize: '12px',
                              fontWeight: 500,
                              cursor: deletingPrayerId === row.id ? 'not-allowed' : 'pointer',
                            }}
                          >
                            {t('common.cancel')}
                          </button>
                        </div>
                      ) : (
                        <button
                          type="button"
                          onClick={() => setPendingDeletePrayerId(row.id)}
                          style={{
                            padding: '8px 12px',
                            borderRadius: '12px',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            background: 'transparent',
                            color: 'rgba(255, 255, 255, 0.4)',
                            fontSize: '12px',
                            cursor: 'pointer',
                            transition: 'all 0.2s ease',
                            marginLeft: 'auto',
                          }}
                        >
                          {t('common.delete')}
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

      {/* Floating Add Prayer Button */}
      {mainTab === 'mine' && (
        <button
          type="button"
          onClick={() => setShowAddModal(true)}
          style={{
            position: 'fixed',
            bottom: '90px',
            right: '20px',
            width: '56px',
            height: '56px',
            borderRadius: '50%',
            border: 'none',
            background: '#D4A843',
            color: '#0a1428',
            fontSize: '28px',
            fontWeight: 600,
            cursor: 'pointer',
            boxShadow: '0 4px 20px rgba(212, 168, 67, 0.4)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            transition: 'all 0.2s ease',
            zIndex: 100,
            animation: 'fadeIn 0.6s ease-out 0.4s both',
          }}
        >
          +
        </button>
      )}

      {showAddModal && typeof document !== 'undefined'
        ? createPortal(
            <>
              <div
                aria-hidden="true"
                style={{
                  position: 'fixed',
                  inset: 0,
                  background: 'rgba(0, 0, 0, 0.6)',
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
                  bottom: 0,
                  left: 0,
                  right: 0,
                  width: '100%',
                  maxWidth: '390px',
                  margin: '0 auto',
                  maxHeight: '85vh',
                  overflowY: 'auto',
                  backdropFilter: 'blur(20px)',
                  WebkitBackdropFilter: 'blur(20px)',
                  border: '1px solid rgba(212, 168, 67, 0.25)',
                  borderTop: '1px solid rgba(212, 168, 67, 0.4)',
                  borderRadius: '24px 24px 0 0',
                  padding: '24px',
                  zIndex: 10051,
                  animation: 'slideUp 0.3s ease-out',
                }}
              >
                <h2 style={{
                  color: '#D4A843',
                  fontSize: '20px',
                  fontWeight: 600,
                  marginBottom: '8px',
                }}>
                  {t('prayer.addPrayer')}
                </h2>
                <p style={{
                  color: 'rgba(255, 255, 255, 0.6)',
                  fontSize: '13px',
                  marginBottom: '20px',
                }}>
                  {t('prayer.addPrayerSub')}
                </p>
                <textarea
                  value={draft}
                  onChange={(e) => setDraft(e.target.value)}
                  style={{
                    width: '100%',
                    minHeight: '140px',
                    borderRadius: '16px',
                    border: '1px solid rgba(212, 168, 67, 0.2)',
                    background: 'rgba(255, 255, 255, 0.04)',
                    color: '#ffffff',
                    padding: '16px',
                    fontSize: '15px',
                    outline: 'none',
                    resize: 'none',
                    marginBottom: '16px',
                  }}
                  placeholder={t('prayer.placeholder')}
                  onFocus={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.8)'
                    e.currentTarget.style.boxShadow = '0 0 0 3px rgba(212, 168, 67, 0.1)'
                  }}
                  onBlur={(e) => {
                    e.currentTarget.style.borderColor = 'rgba(212, 168, 67, 0.2)'
                    e.currentTarget.style.boxShadow = 'none'
                  }}
                />
                <button
                  type="button"
                  onClick={addPrayer}
                  disabled={saving || !draft.trim()}
                  style={{
                    width: '100%',
                    padding: '14px',
                    borderRadius: '16px',
                    border: 'none',
                    background: saving || !draft.trim()
                      ? 'rgba(212, 168, 67, 0.3)'
                      : 'linear-gradient(135deg, #D4A843 0%, #B8860B 100%)',
                    color: '#0a0f28',
                    fontSize: '15px',
                    fontWeight: 600,
                    cursor: saving || !draft.trim() ? 'not-allowed' : 'pointer',
                    opacity: saving || !draft.trim() ? 0.6 : 1,
                    marginBottom: '12px',
                    transition: 'all 0.2s ease',
                  }}
                >
                  {saving ? t('journal.saving') : t('prayer.savePrayer')}
                </button>
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  style={{
                    width: '100%',
                    padding: '12px',
                    borderRadius: '16px',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    background: 'transparent',
                    color: 'rgba(255, 255, 255, 0.6)',
                    fontSize: '14px',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                  }}
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
