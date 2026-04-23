import { useEffect, useMemo, useState } from 'react'
import { Link, useParams, useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

function formatMemberSince(iso, t) {
  if (!iso) return t('profile.unknown')
  const parsed = new Date(iso)
  if (Number.isNaN(parsed.getTime())) return t('profile.unknown')
  return parsed.toLocaleDateString(undefined, { month: 'short', day: 'numeric', year: 'numeric' })
}

function computeTotalDaysActive(profile) {
  const weeklyCount = Array.isArray(profile?.weekly_active_days) ? profile.weekly_active_days.length : 0
  const readingStreak = Math.max(0, Number(profile?.reading_streak) || 0)
  return Math.max(weeklyCount, readingStreak)
}

function buildFaithBadges({ profile, hasReadChapter, hasPrayerWallPost, t }) {
  const badges = []
  const streak = Math.max(0, Number(profile?.reading_streak) || 0)

  if (profile?.is_founding_member) badges.push(t('profile.badges.foundingMember'))
  if (profile?.is_supporter) badges.push(t('profile.badges.ministrySupporter'))
  if (streak >= 3) badges.push(t('profile.badges.streakStarter'))
  if (streak >= 7) badges.push(t('profile.badges.onFire'))
  if (streak >= 30) badges.push(t('profile.badges.faithful'))
  if (hasReadChapter) badges.push(t('profile.badges.wordSeeker'))
  if (hasPrayerWallPost) badges.push(t('profile.badges.prayerWarrior'))

  return badges
}

export default function PublicProfile() {
  const { t } = useTranslation()
  const { userId } = useParams()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [praying, setPraying] = useState(false)
  const [toast, setToast] = useState('')
  const [shareToastVisible, setShareToastVisible] = useState(false)
  const [hasPrayerWallPost, setHasPrayerWallPost] = useState(false)

  useEffect(() => {
    let alive = true
    const run = async () => {
      if (!userId) {
        if (alive) {
          setError(t('profile.notFound'))
          setLoading(false)
        }
        return
      }
      setLoading(true)
      setError('')
      try {
        const { data, error: fetchError } = await supabase
          .from('profiles')
          .select('id, username, full_name, avatar_url, bio, favorite_verse, is_supporter, is_founding_member, reading_streak, weekly_active_days, verses_read, last_chapter, created_at')
          .eq('id', userId)
          .maybeSingle()
        if (fetchError) throw fetchError
        if (!data) {
          setError(t('profile.notFound'))
          setProfile(null)
          setHasPrayerWallPost(false)
        } else {
          setProfile(data)
          const { count: prayerCount } = await supabase
            .from('prayer_wall')
            .select('id', { count: 'exact', head: true })
            .eq('user_id', data.id)
          setHasPrayerWallPost((prayerCount || 0) > 0)
        }
      } catch {
        setError(t('profile.loadError'))
        setProfile(null)
        setHasPrayerWallPost(false)
      } finally {
        if (alive) setLoading(false)
      }
    }
    run()
    return () => {
      alive = false
    }
  }, [t, userId])

  const displayName = useMemo(() => {
    const username = profile?.username?.trim()
    const fullName = profile?.full_name?.trim()
    return username || fullName || t('profile.belovedMember')
  }, [profile?.username, profile?.full_name, t])

  const initials = useMemo(() => {
    return (displayName?.[0] || 'A').toUpperCase()
  }, [displayName])

  const bio = profile?.bio?.trim() || ''
  const favoriteVerse = profile?.favorite_verse?.trim() || ''
  const hasReadChapter = Math.max(0, Number(profile?.verses_read) || 0) > 0 || Boolean(profile?.last_chapter)
  const faithBadges = buildFaithBadges({ profile, hasReadChapter, hasPrayerWallPost, t })

  const handlePrayForUser = async () => {
    if (!profile?.id || praying) return
    setPraying(true)
    setToast('')
    try {
      const prayerText = `Please pray for ${displayName}. May the Lord strengthen and guide them today.`
      const { error: insertError } = await supabase
        .from('community_prayers')
        .insert({
          user_id: user?.id,
          content: prayerText,
          category: 'General',
          is_anonymous: false,
          display_name: `Prayer for ${displayName}`,
          pray_count: 0,
        })
      if (insertError) throw insertError
      setToast(t('profile.prayerAdded', { name: displayName }))
      setTimeout(() => setToast(''), 2600)
    } catch {
      setToast(t('profile.prayerError'))
      setTimeout(() => setToast(''), 2600)
    } finally {
      setPraying(false)
    }
  }

  const handleShareProfile = async () => {
    if (!profile?.id) return
    const shareUrl = `https://abidinganchor.com/profile/${profile.id}`
    const sharePayload = {
      title: t('profile.shareTitle', { name: displayName }),
      text: t('profile.shareText'),
      url: shareUrl,
    }
    try {
      if (navigator.share) {
        await navigator.share(sharePayload)
        return
      }
      await navigator.clipboard.writeText(shareUrl)
      setShareToastVisible(true)
      setTimeout(() => setShareToastVisible(false), 3000)
    } catch {
      // Ignore cancellation/errors to avoid noisy UX.
    }
  }

  return (
    <div style={{ position: 'relative', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{
          position: 'relative',
          zIndex: 1,
          padding: '0 16px',
          paddingTop: '16px',
          paddingBottom: '120px',
          maxWidth: '680px',
          margin: '0 auto',
          width: '100%',
        }}
      >
        <div style={{
          display: 'flex',
          alignItems: 'center',
          padding: '16px 16px 8px 16px',
        }}>
          <button
            type="button"
            onClick={() => navigate(-1)}
            style={{
              width: '40px',
              height: '40px',
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(212,168,67,0.3)',
              borderRadius: '50%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              cursor: 'pointer',
              color: '#D4A843',
              fontSize: '20px',
            }}
          >
            ←
          </button>
          <div style={{ flex: 1, textAlign: 'center' }}>
            <span style={{ fontSize: '18px', fontWeight: 700, color: '#ffffff' }}>{t('profile.title')}</span>
          </div>
          <div style={{ width: '40px' }} />
        </div>
        <div className="mb-4 flex items-center justify-between gap-3">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <button
              type="button"
              onClick={handleShareProfile}
              style={{
                whiteSpace: 'nowrap',
                borderRadius: '10px',
                background: '#D4AF37',
                color: '#1a1a1a',
                padding: '8px 12px',
                fontWeight: 700,
                border: '1px solid rgba(20,20,20,0.18)',
                cursor: 'pointer',
              }}
            >
              🔗 {t('profile.share')}
            </button>
            <Link
              to="/community-prayer"
              style={{
                whiteSpace: 'nowrap',
                borderRadius: '10px',
                background: '#D4AF37',
                color: '#1a1a1a',
                padding: '8px 12px',
                fontWeight: 700,
                textDecoration: 'none',
                border: '1px solid rgba(20,20,20,0.18)',
              }}
            >
              {t('profile.back')}
            </Link>
          </div>
        </div>

        {loading ? (
          <article className="app-card p-5 text-secondary">{t('profile.loading')}</article>
        ) : null}

        {!loading && error ? (
          <article className="app-card p-5 text-secondary">{error}</article>
        ) : null}

        {!loading && !error && profile ? (
          <section className="app-card p-5">
            <div className="flex items-center gap-4">
              {profile.avatar_url ? (
                <img
                  src={profile.avatar_url}
                  alt={`${displayName} avatar`}
                  style={{ width: '64px', height: '64px', borderRadius: '50%', objectFit: 'cover', border: '1px solid var(--card-border)' }}
                />
              ) : (
                <div
                  aria-hidden
                  style={{
                    width: '64px',
                    height: '64px',
                    borderRadius: '50%',
                    display: 'grid',
                    placeItems: 'center',
                    background: 'var(--gold)',
                    color: '#1a1a1a',
                    fontWeight: 700,
                    fontSize: '20px',
                  }}
                >
                  {initials}
                </div>
              )}
              <div style={{ minWidth: 0, flex: 1 }}>
                <p style={{ margin: 0, color: 'var(--text-primary)', fontSize: '20px', fontWeight: 700 }}>{displayName}</p>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', marginTop: '8px' }}>
                  {faithBadges.length > 0 ? faithBadges.map((badge) => (
                    <span
                      key={badge}
                      style={
                        badge === '⚓ Founding Member'
                          ? {
                              background: 'rgba(212,168,67,0.15)',
                              border: '1px solid #D4A843',
                              color: '#D4A843',
                              fontSize: '12px',
                              borderRadius: '20px',
                              padding: '4px 10px',
                              fontWeight: 700,
                            }
                          : {
                              borderRadius: '20px',
                              border: '1px solid rgba(212,175,55,0.55)',
                              background: 'rgba(212,175,55,0.14)',
                              color: '#D4AF37',
                              padding: '4px 10px',
                              fontSize: '11px',
                              fontWeight: 700,
                            }
                      }
                    >
                      {badge}
                    </span>
                  )) : null}
                </div>
                {bio ? (
                  <p style={{ margin: '10px 0 0', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: 1.5 }}>
                    {bio}
                  </p>
                ) : null}
              </div>
            </div>

            {favoriteVerse ? (
              <div
                className="mt-4"
                style={{
                  border: '1px solid #D4AF37',
                  borderRadius: '12px',
                  padding: '12px 14px',
                  background: 'rgba(212,175,55,0.08)',
                }}
              >
                <p style={{ margin: 0, color: '#D4AF37', fontSize: '12px', fontWeight: 700, letterSpacing: '0.04em' }}>{t('profile.favoriteVerse')}</p>
                <p style={{ margin: '6px 0 0', color: 'var(--text-primary)', fontSize: '14px', lineHeight: 1.5 }}>
                  {favoriteVerse}
                </p>
              </div>
            ) : null}

            <div className="mt-4 grid gap-2">
              <div className="app-card" style={{ padding: '12px' }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '12px' }}>{t('profile.readingStreak')}</p>
                <p style={{ margin: '4px 0 0', color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700 }}>
                  🔥 {Math.max(0, Number(profile.reading_streak) || 0)} {t('profile.days')}
                </p>
              </div>
              <div className="app-card" style={{ padding: '12px' }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '12px' }}>{t('profile.totalDaysActive')}</p>
                <p style={{ margin: '4px 0 0', color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700 }}>
                  {computeTotalDaysActive(profile)} {t('profile.days')}
                </p>
              </div>
              <div className="app-card" style={{ padding: '12px' }}>
                <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '12px' }}>{t('profile.memberSince')}</p>
                <p style={{ margin: '4px 0 0', color: 'var(--text-primary)', fontSize: '16px', fontWeight: 700 }}>
                  {formatMemberSince(profile.created_at, t)}
                </p>
              </div>
            </div>

            <button type="button" className="btn-primary mt-4 w-full" onClick={handlePrayForUser} disabled={praying}>
              {praying ? t('profile.addingPrayer') : t('profile.prayFor', { name: displayName })}
            </button>
            {toast ? (
              <p style={{ marginTop: '10px', marginBottom: 0, color: 'var(--text-secondary)', fontSize: '13px' }}>{toast}</p>
            ) : null}
          </section>
        ) : null}
      </div>
      {shareToastVisible ? (
        <div
          style={{
            position: 'fixed',
            left: '50%',
            bottom: '92px',
            transform: 'translateX(-50%)',
            zIndex: 10060,
            background: '#D4AF37',
            color: '#1a1a1a',
            borderRadius: '999px',
            padding: '10px 16px',
            fontSize: '13px',
            fontWeight: 700,
            boxShadow: '0 8px 24px rgba(0,0,0,0.25)',
            border: '1px solid rgba(20,20,20,0.22)',
          }}
          aria-live="polite"
        >
          {t('profile.shareCopied')}
        </div>
      ) : null}
    </div>
  )
}
