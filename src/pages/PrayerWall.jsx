import { useState, useEffect } from 'react'
import { useTranslation } from 'react-i18next'
import { useAuth } from '../context/AuthContext'
import { supabase } from '../lib/supabase'

export default function PrayerWall() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const [prayers, setPrayers] = useState([])
  const [loading, setLoading] = useState(true)
  const [showShareModal, setShowShareModal] = useState(false)
  const [newPrayer, setNewPrayer] = useState('')
  const [submitting, setSubmitting] = useState(false)
  const [showToast, setShowToast] = useState(false)
  const [prayedPrayers, setPrayedPrayers] = useState(new Set())
  const [animatingPrayer, setAnimatingPrayer] = useState(null)
  const CHARACTER_LIMIT = 280

  useEffect(() => {
    fetchPrayers()
    loadPrayedPrayers()
  }, [])

  const loadPrayedPrayers = () => {
    try {
      const saved = localStorage.getItem('prayedPrayers')
      if (saved) {
        setPrayedPrayers(new Set(JSON.parse(saved)))
      }
    } catch (error) {
      console.error('Error loading prayed prayers:', error)
    }
  }

  const savePrayedPrayers = (prayerId) => {
    const updated = new Set(prayedPrayers)
    updated.add(prayerId)
    setPrayedPrayers(updated)
    localStorage.setItem('prayedPrayers', JSON.stringify([...updated]))
  }

  const fetchPrayers = async () => {
    try {
      setLoading(true)
      const { data, error } = await supabase
        .from('prayer_wall')
        .select('*')
        .order('created_at', { ascending: false })
      
      if (error) throw error
      setPrayers(data || [])
    } catch (error) {
      console.error('Error fetching prayers:', error)
    } finally {
      setLoading(false)
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
      
      // Increment in Supabase
      const { error } = await supabase
        .from('prayer_wall')
        .update({ praying_count: supabase.raw('praying_count + 1') })
        .eq('id', prayerId)
      
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
      setPrayers(prev => [data, ...prev])
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

  return (
    <div className="w-full pt-4">
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
        onClick={() => setShowShareModal(true)}
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
          {prayers.map((prayer) => (
            <div
              key={prayer.id}
              className="glass p-5 rounded-2xl"
            >
              <p className="text-gold-accent text-xs font-semibold uppercase tracking-wider mb-2">
                Someone is praying for…
              </p>
              <p className="text-white text-base mb-4 leading-relaxed">
                {prayer.content}
              </p>
              <div className="flex items-center justify-between">
                <p className="text-white/60 text-sm">
                  🙏 {prayer.praying_count || 0} {prayer.praying_count === 1 ? 'person is' : 'people are'} praying
                </p>
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
          ))}
        </div>
      ) : (
        <div className="glass p-8 rounded-2xl text-center">
          <p className="text-white/60 text-sm">
            {t('prayerWall.empty')}
          </p>
        </div>
      )}

      {/* Share Prayer Modal */}
      {showShareModal && (
        <div className="fixed inset-0 z-50 flex items-end justify-center">
          <div
            className="fixed inset-0 glass-scrim"
            onClick={() => {
              setShowShareModal(false)
              setNewPrayer('')
            }}
          />
          <div className="glass relative z-10 w-full max-w-md rounded-t-3xl p-6 border-t border-white/10">
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
              className="w-full bg-white/8 border border-[#D4A843]/30 rounded-xl p-4 text-white text-base outline-none resize-none min-h-[120px] mb-2"
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
            <button
              onClick={() => {
                setShowShareModal(false)
                setNewPrayer('')
              }}
              className="w-full mt-3 text-white/50 text-sm py-2 hover:text-white/70 transition-colors border border-transparent hover:border-white/10 rounded-lg"
            >
              Cancel
            </button>
          </div>
        </div>
      )}

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
    </div>
  )
}
