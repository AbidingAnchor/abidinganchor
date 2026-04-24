import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { useNavigate } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { SHIMMER_KEYFRAMES } from '../hooks/useNameStyle'
import { supabase } from '../lib/supabase'
import { userStorageKey } from '../utils/userStorage'

const MODERATOR_ROLES = new Set(['founder', 'admin', 'mod'])
const ROLE_STYLES = {
  founder: {
    nameColor: '#C9A84C',
    badgeLabelKey: 'prayerWall.roles.founder',
    badgeStyle: {
      background: 'rgba(201, 168, 76, 0.15)',
      border: '1px solid #C9A84C',
      color: '#C9A84C',
      borderRadius: '20px',
      padding: '2px 8px',
      fontSize: '11px',
    },
  },
  admin: {
    nameColor: '#C9A84C',
    badgeLabelKey: 'prayerWall.roles.admin',
    badgeStyle: {
      background: 'rgba(201, 168, 76, 0.15)',
      border: '1px solid #C9A84C',
      color: '#C9A84C',
      borderRadius: '20px',
      padding: '2px 8px',
      fontSize: '11px',
    },
  },
  mod: {
    nameColor: '#7EB8D4',
    badgeLabelKey: 'prayerWall.roles.mod',
    badgeStyle: {
      background: 'rgba(126, 184, 212, 0.15)',
      border: '1px solid #7EB8D4',
      color: '#7EB8D4',
      borderRadius: '20px',
      padding: '2px 8px',
      fontSize: '11px',
    },
  },
  user: {
    nameColor: '#ffffff',
    badgeLabelKey: '',
    badgeStyle: null,
  },
}

export default function PrayerWall() {
  const { t } = useTranslation()
  const reportReasons = [
    t('prayerWall.reportReasons.inappropriate'),
    t('prayerWall.reportReasons.offensive'),
    t('prayerWall.reportReasons.spam'),
    t('prayerWall.reportReasons.other'),
  ]
  const muteOptions = [
    { id: '24h', label: t('prayerWall.mute.24h'), hours: 24 },
    { id: '7d', label: t('prayerWall.mute.7d'), hours: 24 * 7 },
    { id: '30d', label: t('prayerWall.mute.30d'), hours: 24 * 30 },
  ]
  const { user, profile, signOut } = useAuth()
  const navigate = useNavigate()
  const [prayers, setPrayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)
  const [newPrayer, setNewPrayer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [prayedPrayers, setPrayedPrayers] = useState(new Set())
  const [animatingPrayer, setAnimatingPrayer] = useState(null)
  const [showReportModal, setShowReportModal] = useState(false)
  const [selectedPrayer, setSelectedPrayer] = useState(null)
  const [reportReason, setReportReason] = useState('')
  const [reportSubmitting, setReportSubmitting] = useState(false)
  const [reportError, setReportError] = useState('')
  const [showReportToast, setShowReportToast] = useState(false)
  const [showModerationModal, setShowModerationModal] = useState(false)
  const [moderationTarget, setModerationTarget] = useState(null)
  const [muteDurationId, setMuteDurationId] = useState('24h')
  const [moderationError, setModerationError] = useState('')
  const [moderating, setModerating] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const CHARACTER_LIMIT = 280

  useEffect(() => {
    fetchPrayers()
  }, [])

  useEffect(() => {
    loadPrayedPrayers()
  }, [user?.id])

  useEffect(() => {
    setReportReason((current) => (reportReasons.includes(current) ? current : reportReasons[0]))
    setMuteDurationId((current) => (muteOptions.some((opt) => opt.id === current) ? current : muteOptions[0].id))
  }, [reportReasons, muteOptions])

  const prayedStorageKey = user?.id ? userStorageKey(user.id, 'prayed-prayer-ids') : null

  const loadPrayedPrayers = () => {
    if (!prayedStorageKey) {
      setPrayedPrayers(new Set())
      return
    }
    try {
      const saved = localStorage.getItem(prayedStorageKey)
      if (saved) {
        setPrayedPrayers(new Set(JSON.parse(saved)))
      } else {
        setPrayedPrayers(new Set())
      }
    } catch (error) {
      console.error('Error loading prayed prayers:', error)
    }
  }

  const savePrayedPrayers = (prayerId) => {
    if (!prayedStorageKey) return
    const updated = new Set(prayedPrayers)
    updated.add(prayerId)
    setPrayedPrayers(updated)
    localStorage.setItem(prayedStorageKey, JSON.stringify([...updated]))
  }

  const fetchPrayers = async () => {
    try {
      setLoading(true)
      const cutoffDate = new Date()
      cutoffDate.setDate(cutoffDate.getDate() - 30)
      const cutoffIso = cutoffDate.toISOString()

      const { data: prayerRows, error: prayerError } = await supabase
        .from('prayer_wall')
        .select('*')
        .gte('created_at', cutoffIso)
        .order('created_at', { ascending: false })
      if (prayerError) throw prayerError

      const prayersList = prayerRows || []
      const userIds = [...new Set(prayersList.map((row) => row.user_id).filter(Boolean))]

      let profilesById = {}
      if (userIds.length > 0) {
        const { data: profileRows, error: profileError } = await supabase
          .from('profiles')
          .select('id, username, role, avatar_url, supporter_tier')
          .in('id', userIds)
        if (profileError) throw profileError
        profilesById = (profileRows || []).reduce((acc, row) => {
          acc[row.id] = row
          return acc
        }, {})
      }

      const merged = prayersList.map((row) => ({
        ...row,
        profiles: profilesById[row.user_id]
          ? {
              username: profilesById[row.user_id].username || t('prayerWall.anonymous'),
              role: profilesById[row.user_id].role || 'user',
              avatar_url: profilesById[row.user_id].avatar_url || null,
              supporter_tier: profilesById[row.user_id].supporter_tier || 'free',
            }
          : {
              username: t('prayerWall.anonymous'),
              role: 'user',
              avatar_url: null,
              supporter_tier: 'free',
            },
      }))

      setPrayers(merged)
    } catch (error) {
      console.error('Error fetching prayers:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleRemovePrayer = async (prayerId) => {
    const currentRole = (profile?.role || '').toLowerCase()
    if (!MODERATOR_ROLES.has(currentRole)) return
    if (!prayerId) return

    try {
      const { error } = await supabase
        .from('prayer_wall')
        .delete()
        .eq('id', prayerId)
      if (error) throw error
      setPrayers((prev) => prev.filter((p) => p.id !== prayerId))
    } catch (error) {
      console.error('Error removing prayer:', error)
    }
  }

  const handlePraying = async (prayerId) => {
    // Check if already prayed for this prayer
    if (prayedPrayers.has(prayerId)) return
    
    try {
      // Trigger animation
      setAnimatingPrayer(prayerId)
      setTimeout(() => setAnimatingPrayer(null), 600)
      
      // Increment count locally immediately for responsive feel
      setPrayers(prev => prev.map(p => 
        p.id === prayerId 
          ? { ...p, praying_count: (p.praying_count || 0) + 1 }
          : p
      ))
      
      // Save to localStorage
      savePrayedPrayers(prayerId)
      
      const { error } = await supabase.rpc('increment_prayer_wall_praying_count', {
        p_prayer_id: prayerId,
      })
      
      if (error) {
        console.error('Error updating praying count:', error)
        // Revert local change if Supabase fails
        setPrayers(prev => prev.map(p => 
          p.id === prayerId 
            ? { ...p, praying_count: Math.max(0, (p.praying_count || 0) - 1) }
            : p
        ))
      }
    } catch (error) {
      console.error('Error updating praying count:', error)
    }
  }

  const handleSubmitPrayer = async () => {
    if (!newPrayer.trim() || !user?.id) return
    
    try {
      setSubmitError('')
      const { data: statusProfile, error: statusError } = await supabase
        .from('profiles')
        .select('is_banned, muted_until')
        .eq('id', user.id)
        .maybeSingle()
      if (statusError) throw statusError

      const isBanned = Boolean(statusProfile?.is_banned)
      const mutedUntilRaw = statusProfile?.muted_until
      const mutedUntil = mutedUntilRaw ? new Date(mutedUntilRaw) : null
      const isMutedActive = mutedUntil && mutedUntil.getTime() > Date.now()

      if (isBanned) {
        setSubmitError(t('prayerWall.errors.banned'))
        return
      }

      if (isMutedActive) {
        setSubmitError(t('prayerWall.errors.mutedUntil', { until: mutedUntil.toLocaleString() }))
        return
      }

      setSubmitting(true)
      const { data, error } = await supabase
        .from('prayer_wall')
        .insert({
          content: newPrayer.trim(),
          user_id: user.id,
          is_anonymous: true,
          praying_count: 0,
        })
        .select()
        .single()
      
      if (error) throw error
      
      // Add new prayer to top of list without page reload
      const prayerWithProfile = {
        ...data,
        profiles: {
          username: profile?.username || profile?.full_name || user?.user_metadata?.full_name || t('prayerWall.anonymous'),
          role: profile?.role || 'user',
        },
      }
      setPrayers(prev => [prayerWithProfile, ...prev])
      setNewPrayer('')
      setShowShareModal(false)
      
      // Show toast notification
      setShowToast(true)
      setTimeout(() => setShowToast(false), 3000)
    } catch (error) {
      console.error('Error submitting prayer:', error)
    } finally {
      setSubmitting(false)
    }
  }

  const openReportModal = (prayer) => {
    setSelectedPrayer(prayer)
    setReportReason(reportReasons[0])
    setReportError('')
    setShowReportModal(true)
  }

  const closeReportModal = () => {
    setShowReportModal(false)
    setSelectedPrayer(null)
    setReportReason(reportReasons[0])
    setReportError('')
  }

  const openModerationModal = (prayer) => {
    setModerationTarget(prayer)
    setMuteDurationId(muteOptions[0].id)
    setModerationError('')
    setShowModerationModal(true)
  }

  const closeModerationModal = () => {
    setShowModerationModal(false)
    setModerationTarget(null)
    setModerationError('')
    setModerating(false)
  }

  const handleMuteUser = async () => {
    const targetUserId = moderationTarget?.user_id
    if (!targetUserId || moderating) return
    const selectedOption = muteOptions.find((opt) => opt.id === muteDurationId) || muteOptions[0]
    const mutedUntilIso = new Date(Date.now() + selectedOption.hours * 60 * 60 * 1000).toISOString()

    try {
      setModerating(true)
      setModerationError('')
      const { error } = await supabase
        .from('profiles')
        .update({ muted_until: mutedUntilIso })
        .eq('id', targetUserId)
      if (error) throw error
      closeModerationModal()
    } catch (error) {
      console.error('Error muting user:', error)
      setModerationError(t('prayerWall.errors.muteFailed'))
      setModerating(false)
    }
  }

  const handleBanUser = async () => {
    const targetUserId = moderationTarget?.user_id
    if (!targetUserId || moderating) return

    try {
      setModerating(true)
      setModerationError('')
      const { error } = await supabase
        .from('profiles')
        .update({ is_banned: true, banned_at: new Date().toISOString() })
        .eq('id', targetUserId)
      if (error) throw error
      if (targetUserId === user?.id) {
        await signOut()
      }
      closeModerationModal()
    } catch (error) {
      console.error('Error banning user:', error)
      setModerationError(t('prayerWall.errors.banFailed'))
      setModerating(false)
    }
  }

  const handleSubmitReport = async () => {
    if (!user?.id || !selectedPrayer?.id || reportSubmitting) return
    const timestamp = new Date().toISOString()

    try {
      setReportSubmitting(true)
      setReportError('')

      const { error } = await supabase.from('reports').insert({
        reported_user_id: selectedPrayer.user_id || null,
        content_type: 'prayer_wall_post',
        content_id: selectedPrayer.id,
        reason: reportReason,
        reported_by: user.id,
        created_at: timestamp,
      })
      if (error) throw error

      const webhookUrl = import.meta.env.VITE_DISCORD_WEBHOOK_URL
      if (webhookUrl) {
        const reporterName =
          profile?.username ||
          profile?.full_name ||
          user?.user_metadata?.full_name ||
          user?.email ||
          t('prayerWall.unknownUser')
        const reportedUserName =
          selectedPrayer?.profiles?.username ||
          t('prayerWall.unknownUser')

        const message = [
          '🚨 New Report — AbidingAnchor',
          'Type: Prayer Wall Post',
          `Reported by: ${reporterName}`,
          `Reported user: ${reportedUserName}`,
          `Reason: ${reportReason}`,
          `Content: ${selectedPrayer.content || ''}`,
          `Time: ${timestamp}`,
        ].join('\n')

        try {
          await fetch(webhookUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ content: message }),
          })
        } catch (webhookError) {
          console.error('Discord webhook error:', webhookError)
        }
      }

      closeReportModal()
      setShowReportToast(true)
      setTimeout(() => setShowReportToast(false), 3000)
    } catch (error) {
      console.error('Error submitting report:', error)
      setReportError(t('prayerWall.errors.reportFailed'))
    } finally {
      setReportSubmitting(false)
    }
  }

  const getPosterMeta = (prayer) => {
    const roleKey = (prayer?.profiles?.role || 'user').toLowerCase()
    const roleStyle = ROLE_STYLES[roleKey] || ROLE_STYLES.user
    const supporterTier = prayer?.profiles?.supporter_tier || 'free'
    
    let nameStyle = { color: roleStyle.nameColor }
    if (supporterTier === 'lifetime') {
      nameStyle = {
        background: 'linear-gradient(90deg, #b8860b, #ffd700, #ffec8b, #ffd700, #b8860b)',
        backgroundSize: '200%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'shimmer-gold 2s infinite linear',
      }
    } else if (supporterTier === 'monthly') {
      nameStyle = { color: '#93c5fd' }
    }
    
    return {
      name: prayer?.profiles?.username || t('prayerWall.anonymous'),
      nameColor: roleStyle.nameColor,
      nameStyle,
      badgeLabel: roleStyle.badgeLabelKey ? t(roleStyle.badgeLabelKey) : '',
      badgeStyle: roleStyle.badgeStyle,
      avatarUrl: prayer?.profiles?.avatar_url || null,
      userId: prayer?.user_id || null,
      supporterTier,
    }
  }

  const canModeratePrayers = MODERATOR_ROLES.has((profile?.role || '').toLowerCase())
  const canBanUsers = new Set(['founder', 'admin']).has((profile?.role || '').toLowerCase())

  return (
    <div className="w-full pt-4">
      <style>{SHIMMER_KEYFRAMES}</style>
      {/* Screen Title */}
      <div className="flex items-center gap-3 mb-4">
        <span className="text-3xl">🙏</span>
        <h1 className="text-page-title text-gold-accent">{t('prayerWall.title')}</h1>
      </div>

      {/* Subtitle */}
      <p className="text-white/80 italic text-center mb-6 text-sm">
        {t('prayerWall.subtitle')}
      </p>

      {/* Share a Prayer Request Button */}
      <button
        onClick={() => {
          setSubmitError('')
          setShowShareModal(true)
        }}
        className="btn-primary w-full mb-6"
      >
        🙏 {t('prayerWall.shareRequest')}
      </button>

      {/* Prayer Cards List */}
      {loading ? (
        <div className="flex items-center justify-center h-48">
          <p className="text-gold-accent text-lg">Loading prayers…</p>
        </div>
      ) : prayers.length > 0 ? (
        <div className="space-y-4">
          {prayers.map((prayer) => {
            const poster = getPosterMeta(prayer)
            return (
            <div
              key={prayer.id}
              className="glass p-5 rounded-2xl"
            >
              <div className="mb-2 flex items-center justify-between gap-3">
                <p className="text-gold-accent text-xs font-semibold uppercase tracking-wider">
                  Someone is praying for…
                </p>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => openReportModal(prayer)}
                    className="text-xs text-white/60 hover:text-white transition-colors"
                    aria-label="Report prayer post"
                  >
                    🚩
                  </button>
                  {canModeratePrayers ? (
                    <button
                      type="button"
                      onClick={() => openModerationModal(prayer)}
                      className="text-xs text-white/60 hover:text-white transition-colors"
                      aria-label="Moderate user"
                    >
                      🛡️
                    </button>
                  ) : null}
                </div>
              </div>
              <div className="mb-2 flex items-center gap-2">
                {poster.badgeLabel ? (
                  <span style={poster.badgeStyle}>
                    {poster.badgeLabel}
                  </span>
                ) : null}
                <button
                  type="button"
                  onClick={() => poster.userId && navigate(`/profile/${poster.userId}`)}
                  className="flex items-center gap-2 rounded-lg border border-transparent px-1 py-0.5 transition hover:border-white/10"
                  style={{ background: 'transparent' }}
                  aria-label={`Open ${poster.name}'s profile`}
                >
                  {poster.avatarUrl ? (
                    <img
                      src={poster.avatarUrl}
                      alt=""
                      aria-hidden
                      style={{ width: '24px', height: '24px', borderRadius: '50%', objectFit: 'cover' }}
                    />
                  ) : (
                    <span
                      aria-hidden
                      style={{
                        width: '24px',
                        height: '24px',
                        borderRadius: '50%',
                        display: 'grid',
                        placeItems: 'center',
                        background: 'rgba(212,168,67,0.2)',
                        color: '#D4A843',
                        fontSize: '11px',
                        fontWeight: 700,
                      }}
                    >
                      {(poster.name?.[0] || 'A').toUpperCase()}
                    </span>
                  )}
                  <p className="text-sm font-semibold" style={{ ...poster.nameStyle, margin: 0 }}>
                    {poster.name}
                  </p>
                </button>
              </div>
              <p className="text-white text-base mb-4 leading-relaxed">
                {prayer.content}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-white/60 text-sm">
                  🙏 {prayer.praying_count || 0} {prayer.praying_count === 1 ? 'person is' : 'people are'} praying
                </p>
                <div className="flex items-center gap-3">
                  {canModeratePrayers ? (
                    <button
                      type="button"
                      onClick={() => handleRemovePrayer(prayer.id)}
                      className="text-xs text-red-300/85 hover:text-red-200 transition-colors"
                      aria-label="Remove prayer post"
                    >
                      🗑 Remove
                    </button>
                  ) : null}
                  <button
                    onClick={() => handlePraying(prayer.id)}
                    disabled={prayedPrayers.has(prayer.id)}
                    className={`
                      px-4 py-2 rounded-full text-sm font-semibold transition-all
                      ${prayedPrayers.has(prayer.id)
                        ? 'bg-[#D4A843] text-[#1a0533] cursor-default'
                        : 'bg-[#D4A843]/20 border border-[#D4A843]/50 text-[#D4A843] hover:bg-[#D4A843]/30 cursor-pointer'
                      }
                      ${animatingPrayer === prayer.id ? 'animate-prayer-pulse' : ''}
                    `}
                    style={animatingPrayer === prayer.id ? {
                      animation: 'prayerPulse 0.6s ease-out'
                    } : {}}
                  >
                    {prayedPrayers.has(prayer.id) ? '🙏 Praying' : '🙏 I\'m praying too'}
                  </button>
                </div>
              </div>
            </div>
            )
          })}
        </div>
      ) : (
        <div className="glass p-8 rounded-2xl text-center">
          <p className="text-white/60 text-sm">
            {t('prayerWall.empty')}
          </p>
        </div>
      )}

      {/* Share Prayer Modal */}
      {showShareModal && typeof document !== 'undefined'
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
              onClick={() => {
                setShowShareModal(false)
                setNewPrayer('')
                setSubmitError('')
              }}
            />
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className="glass w-full max-w-md rounded-t-3xl p-6 border-t border-white/10"
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10051,
                width: 'min(90vw, 390px)',
                maxHeight: '85vh',
                overflowY: 'auto',
                background: 'rgba(10, 15, 40, 0.97)',
              }}
            >
            <h2 className="text-gold-accent text-lg font-bold mb-2 text-center">
              Share with the body of Christ 🙏
            </h2>
            <p className="text-white/60 text-sm text-center mb-4">
              What can we pray for you about?
            </p>
            <textarea
              value={newPrayer}
              onChange={(e) => {
                if (e.target.value.length <= CHARACTER_LIMIT) {
                  setNewPrayer(e.target.value)
                }
              }}
              placeholder="What can we pray for you about?"
              className="w-full text-base outline-none resize-none min-h-[120px] mb-2"
              style={{
                background: 'rgba(255, 255, 255, 0.05)',
                color: '#ffffff',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '12px',
                padding: '12px',
              }}
            />
            <div className="flex items-center justify-between mb-4">
              <p className="text-white/40 text-xs">
                This will be shared anonymously
              </p>
              <p className="text-white/40 text-xs">
                {newPrayer.length}/{CHARACTER_LIMIT}
              </p>
            </div>
            <button
              onClick={handleSubmitPrayer}
              disabled={!newPrayer.trim() || submitting}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? 'Sharing…' : 'Submit Prayer'}
            </button>
            {submitError ? (
              <p className="mt-3 text-xs text-red-300">{submitError}</p>
            ) : null}
            <button
              onClick={() => {
                setShowShareModal(false)
                setNewPrayer('')
                setSubmitError('')
              }}
              className="w-full mt-3 text-white/50 text-sm py-2 hover:text-white/70 transition-colors border border-transparent hover:border-white/10 rounded-lg"
            >
              Cancel
            </button>
            </div>
          </>,
          document.body,
        )
        : null}

      {/* Report Modal */}
      {showReportModal && typeof document !== 'undefined'
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
              onClick={closeReportModal}
            />
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className="glass w-full max-w-md rounded-t-3xl p-6 border-t border-white/10"
              style={{
                position: 'fixed',
                left: '50%',
                bottom: '80px',
                transform: 'translateX(-50%)',
                zIndex: 10051,
                maxHeight: 'calc(100vh - 120px)',
                overflowY: 'auto',
                background: 'rgba(10, 15, 40, 0.97)',
              }}
            >
            <h2 className="text-gold-accent text-lg font-bold mb-2 text-center">
              Report Prayer Post
            </h2>
            <p className="text-white/60 text-sm text-center mb-4">
              Select a reason for reporting this content.
            </p>
            <div className="space-y-2 mb-4">
              {REPORT_REASONS.map((reason) => (
                <button
                  key={reason}
                  type="button"
                  onClick={() => setReportReason(reason)}
                  className={`w-full text-left rounded-xl px-4 py-3 border transition-colors ${
                    reportReason === reason
                      ? 'border-[#D4A843] bg-[#D4A843]/20 text-[#D4A843]'
                      : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
                  }`}
                >
                  {reason}
                </button>
              ))}
            </div>
            {reportError ? (
              <p className="text-xs text-red-300 mb-3">{reportError}</p>
            ) : null}
            <button
              type="button"
              onClick={handleSubmitReport}
              disabled={reportSubmitting || !user?.id}
              className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {reportSubmitting ? 'Submitting…' : 'Submit Report'}
            </button>
            <button
              type="button"
              onClick={closeReportModal}
              className="w-full mt-3 text-white/50 text-sm py-2 hover:text-white/70 transition-colors border border-transparent hover:border-white/10 rounded-lg"
            >
              Cancel
            </button>
            </div>
          </>,
          document.body,
        )
        : null}

      {/* Moderation Modal */}
      {showModerationModal && typeof document !== 'undefined'
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
              onClick={closeModerationModal}
            />
            <div
              role="dialog"
              aria-modal="true"
              onClick={(e) => e.stopPropagation()}
              className="glass w-full max-w-md rounded-t-3xl p-6 border-t border-white/10"
              style={{
                position: 'fixed',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                zIndex: 10051,
                width: 'min(90vw, 390px)',
                maxHeight: '85vh',
                overflowY: 'auto',
                background: 'rgba(10, 15, 40, 0.97)',
              }}
            >
              <h2 className="text-gold-accent text-lg font-bold mb-2 text-center">
                Moderate User
              </h2>
              <p className="text-white/70 text-sm text-center mb-4">
                {moderationTarget?.profiles?.username || 'This user'}
              </p>

              <p className="text-white/70 text-xs mb-2">Mute duration</p>
              <div className="space-y-2 mb-4">
                {MUTE_OPTIONS.map((opt) => (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setMuteDurationId(opt.id)}
                    className={`w-full text-left rounded-xl px-4 py-3 border transition-colors ${
                      muteDurationId === opt.id
                        ? 'border-[#D4A843] bg-[#D4A843]/20 text-[#D4A843]'
                        : 'border-white/15 bg-white/5 text-white/80 hover:bg-white/10'
                    }`}
                  >
                    {opt.label}
                  </button>
                ))}
              </div>

              {moderationError ? <p className="text-xs text-red-300 mb-3">{moderationError}</p> : null}

              <button
                type="button"
                onClick={handleMuteUser}
                disabled={moderating}
                className="btn-primary w-full disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {moderating ? 'Applying…' : 'Mute'}
              </button>

              {canBanUsers ? (
                <button
                  type="button"
                  onClick={handleBanUser}
                  disabled={moderating}
                  className="w-full mt-3 rounded-xl border border-red-300/60 py-2 text-sm text-red-200 hover:bg-red-500/10 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  Ban
                </button>
              ) : null}

              <button
                type="button"
                onClick={closeModerationModal}
                className="w-full mt-3 text-white/50 text-sm py-2 hover:text-white/70 transition-colors border border-transparent hover:border-white/10 rounded-lg"
              >
                Cancel
              </button>
            </div>
          </>,
          document.body,
        )
        : null}

      {/* Toast Notification */}
      {showToast && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50">
          <div className="glass px-6 py-3 rounded-full border border-[#D4A843]/50 bg-[#D4A843]/20">
            <p className="text-gold-accent text-sm font-semibold">
              Your prayer has been lifted up 🕊️
            </p>
          </div>
        </div>
      )}
      {showReportToast && (
        <div className="fixed top-24 left-1/2 transform -translate-x-1/2 z-50">
          <div className="glass px-6 py-3 rounded-full border border-[#D4A843]/50 bg-[#D4A843]/20">
            <p className="text-gold-accent text-sm font-semibold">
              Report submitted. Thank you.
            </p>
          </div>
        </div>
      )}
    </div>
  )
}
