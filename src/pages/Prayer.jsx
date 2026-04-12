import { useCallback, useEffect, useMemo, useState } from 'react'
import { useTranslation } from 'react-i18next'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

const SPEECH_LANG = { en: 'en-US', es: 'es-ES', pt: 'pt-BR', fr: 'fr-FR', de: 'de-DE' }

export default function Prayer() {
  const { t, i18n } = useTranslation()
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('my-prayers')
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [stats, setStats] = useState({ streak: 0, totalPrayers: 0, answeredPrayers: 0 })
  const [prayerOfTheDay, setPrayerOfTheDay] = useState('')
  const [isListening, setIsListening] = useState(false)
  const [transcript, setTranscript] = useState('')
  const [recognition, setRecognition] = useState(null)

  const prayerPrompts = useMemo(() => {
    const list = t('prayer.prompts', { returnObjects: true })
    return Array.isArray(list) ? list : []
  }, [t, i18n.language])

  // Load stats from Supabase
  useEffect(() => {
    if (!user?.id) return
    let cancelled = false
    ;(async () => {
      try {
        // Fetch streak from profiles
        const { data: profileData, error: _profileError } = await supabase
          .from('profiles')
          .select('reading_streak')
          .eq('id', user.id)
          .single()
        
        // Fetch prayer counts
        const { data: prayersData, error: _prayersError } = await supabase
          .from('prayers')
          .select('id,is_answered')
          .eq('user_id', user.id)
        
        if (cancelled) return
        
        const streak = Number(profileData?.reading_streak) || 0
        const totalPrayers = (prayersData || []).length
        const answeredPrayers = (prayersData || []).filter((p) => p.is_answered).length
        
        setStats({ streak, totalPrayers, answeredPrayers })
      } catch (err) {
        console.error('Error loading stats:', err)
      }
    })()
    return () => { cancelled = true }
  }, [user?.id])

  // Set prayer of the day based on date
  useEffect(() => {
    const dayOfYear = Math.floor((new Date() - new Date(new Date().getFullYear(), 0, 0)) / (1000 * 60 * 60 * 24))
    const list = prayerPrompts
    if (!list.length) return
    setPrayerOfTheDay(list[dayOfYear % list.length])
  }, [prayerPrompts])

  // Initialize speech recognition
  useEffect(() => {
    if (typeof window !== 'undefined' && 'webkitSpeechRecognition' in window) {
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      const rec = new SpeechRecognition()
      rec.continuous = false
      rec.interimResults = true
      const base = (i18n.resolvedLanguage || i18n.language || 'en').toLowerCase().split(/[-_]/)[0]
      rec.lang = SPEECH_LANG[base] || 'en-US'
      
      rec.onresult = (event) => {
        const current = event.resultIndex
        const transcriptText = event.results[current][0].transcript
        setTranscript(transcriptText)
      }
      
      rec.onend = () => {
        setIsListening(false)
      }
      
      rec.onerror = () => {
        setIsListening(false)
      }
      
      setRecognition(rec)
    }
  }, [i18n.language, i18n.resolvedLanguage])

  const loadPrayers = async () => {
    if (!user?.id) return
    try {
      const { data, error } = await supabase
        .from('prayers')
        .select('id,user_id,content,is_answered,created_at')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false })
      if (error) throw error
      setEntries((data || []).map((row) => {
        const raw = row.content || ''
        const parts = raw.split(/\n\n+/)
        const titleFromBody = parts.length > 1 ? parts[0].trim() : ''
        const textFromBody = parts.length > 1 ? parts.slice(1).join('\n\n').trim() : raw.trim()
        return {
          id: row.id,
          title: titleFromBody,
          text: textFromBody,
          date: row.created_at,
          answered: Boolean(row.is_answered),
        }
      }))
    } catch (err) {
      console.error('Error loading prayers:', err)
      setEntries([])
    }
  }

  const addPrayer = useCallback(async () => {
    const prayerContent = transcript.trim() || content.trim()
    if (!prayerContent) return
    try {
      const storedContent = title.trim()
        ? `${title.trim()}\n\n${prayerContent}`
        : prayerContent
      const { error } = await supabase.from('prayers').insert({
        user_id: user.id,
        content: storedContent,
        is_answered: false,
      })
      if (error) throw error
      await loadPrayers()
      setTitle('')
      setContent('')
      setTranscript('')
      setShowModal(false)
    } catch (err) {
      console.error('Error adding prayer:', err)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id, title, content, transcript])

  const markAsAnswered = async (entry) => {
    try {
      const { error } = await supabase.from('prayers').update({ is_answered: !entry.answered }).eq('id', entry.id)
      if (error) throw error
      await loadPrayers()
    } catch (err) {
      console.error('Error marking prayer as answered:', err)
    }
  }

  const deletePrayer = async (entry) => {
    try {
      const { error } = await supabase.from('prayers').delete().eq('id', entry.id)
      if (error) throw error
      await loadPrayers()
    } catch (err) {
      console.error('Error deleting prayer:', err)
    }
  }

  const startListening = () => {
    if (recognition) {
      setTranscript('')
      setIsListening(true)
      recognition.start()
    }
  }

  const stopListening = () => {
    if (recognition && isListening) {
      recognition.stop()
    }
  }

  useEffect(() => {
    let active = true
    const boot = async () => {
      setLoading(true)
      await loadPrayers()
      if (active) setLoading(false)
    }
    boot()
    return () => { active = false }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id])

  const activePrayers = (entries || []).filter((p) => !p.answered)
  const answeredPrayers = (entries || []).filter((p) => p.answered)

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden', background: 'transparent' }}>
      <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '60px', paddingBottom: '120px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        
        {/* Hero Section */}
        <header className="glass-panel" style={{ marginBottom: '20px', position: 'relative', borderRadius: '16px', overflow: 'hidden', minHeight: '160px' }}>
          <div style={{ position: 'relative', zIndex: 2, padding: '24px' }}>
            <p style={{ 
              color: '#D4A843', 
              fontSize: '9px', 
              fontWeight: 600, 
              letterSpacing: '0.15em', 
              textTransform: 'uppercase', 
              marginBottom: '8px' 
            }}>
              {t('prayer.heroKicker')}
            </p>
            <h1 style={{ color: 'var(--text-primary)', fontSize: '26px', fontWeight: 700, marginBottom: '8px', lineHeight: 1.2 }}>
              {t('prayer.heroTitleBefore')}<span style={{ color: '#D4A843' }}>{t('prayer.heroTitleAccent')}</span>
            </h1>
            <p style={{ 
              color: 'var(--text-muted)', 
              fontSize: '11px', 
              fontStyle: 'italic' 
            }}>
              {t('prayer.heroSubtitle')}
            </p>
          </div>
        </header>

        {/* Gold Divider */}
        <div style={{
          height: '1px',
          background: 'linear-gradient(90deg, transparent, rgba(212,168,67,0.3), transparent)',
          marginBottom: '20px'
        }} />

        {/* Stat Pills Row */}
        <div style={{
          display: 'flex',
          gap: '10px',
          marginBottom: '24px'
        }}>
          <div style={{
            flex: 1,
            background: 'rgba(212,168,67,0.12)',
            border: '1px solid rgba(212,168,67,0.3)',
            borderRadius: '12px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <p style={{ color: '#D4A843', fontSize: '18px', fontWeight: 700, marginBottom: '2px' }}>🔥 {stats.streak}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('prayer.statStreak')}</p>
          </div>
          <div style={{
            flex: 1,
            background: 'var(--chip-bg)',
            border: '1px solid var(--chip-border)',
            borderRadius: '12px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <p style={{ color: 'var(--text-primary)', fontSize: '18px', fontWeight: 700, marginBottom: '2px' }}>🙏 {stats.totalPrayers}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('prayer.statTotal')}</p>
          </div>
          <div style={{
            flex: 1,
            background: 'rgba(45,212,191,0.12)',
            border: '1px solid rgba(45,212,191,0.3)',
            borderRadius: '12px',
            padding: '12px',
            textAlign: 'center'
          }}>
            <p style={{ color: '#2dd4bf', fontSize: '18px', fontWeight: 700, marginBottom: '2px' }}>✅ {stats.answeredPrayers}</p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '9px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{t('prayer.statAnswered')}</p>
          </div>
        </div>

        {/* Prayer of the Day Card */}
        <div className="glass-panel" style={{
          border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px',
          position: 'relative'
        }}>
          <div style={{
            position: 'absolute',
            left: 0,
            top: 0,
            bottom: 0,
            width: '3px',
            background: '#D4A843',
            borderRadius: '16px 0 0 16px'
          }} />
          <p style={{ 
            color: '#D4A843', 
            fontSize: '9px', 
            fontWeight: 600, 
            letterSpacing: '0.15em', 
            textTransform: 'uppercase', 
            marginBottom: '12px',
            marginLeft: '12px'
          }}>
            {t('prayer.prayerOfDay')}
          </p>
          <p style={{ 
            color: 'var(--text-primary)', 
            fontSize: '15px', 
            lineHeight: 1.6,
            marginBottom: '16px',
            marginLeft: '12px'
          }}>
            {prayerOfTheDay}
          </p>
          <button
            type="button"
            onClick={() => {
              setContent(prayerOfTheDay)
              setShowModal(true)
            }}
            style={{
              background: 'linear-gradient(135deg, #D4A843 0%, #F4D03F 100%)',
              color: '#0a1a3e',
              border: 'none',
              borderRadius: '50px',
              padding: '10px 20px',
              fontWeight: 600,
              fontSize: '13px',
              cursor: 'pointer',
              marginLeft: '12px',
              boxShadow: '0 4px 15px rgba(212,168,67,0.3)'
            }}
          >
            {t('prayer.prayThis')}
          </button>
        </div>

        {/* Voice to Text Section */}
        <div className="glass-panel" style={{
          border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: '16px',
          padding: '20px',
          marginBottom: '24px'
        }}>
          <button
            type="button"
            onClick={isListening ? stopListening : startListening}
            style={{
              width: '100%',
              background: isListening ? 'rgba(212,168,67,0.3)' : 'linear-gradient(135deg, #D4A843 0%, #F4D03F 100%)',
              color: isListening ? '#D4A843' : '#0a1a3e',
              border: 'none',
              borderRadius: '12px',
              padding: '16px',
              fontWeight: 700,
              fontSize: '16px',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '10px',
              marginBottom: '16px',
              transition: 'all 0.3s ease'
            }}
          >
            <span style={{ fontSize: '24px' }}>🎙️</span>
            <span>{isListening ? t('prayer.listening') : t('prayer.speakPrayer')}</span>
          </button>
          
          {transcript && (
            <>
              <textarea
                value={transcript}
                onChange={(e) => setTranscript(e.target.value)}
                placeholder={t('prayer.transcriptPlaceholder')}
                style={{
                  background: 'var(--input-bg)',
                  border: '1px solid var(--gold-border)',
                  borderRadius: '12px',
                  color: 'var(--text-primary)',
                  padding: '16px',
                  width: '100%',
                  minHeight: '120px',
                  marginBottom: '12px',
                  fontSize: '15px',
                  outline: 'none',
                  resize: 'none',
                  fontFamily: 'inherit'
                }}
              />
              <button
                type="button"
                onClick={addPrayer}
                style={{
                  background: 'linear-gradient(135deg, #D4A843 0%, #F4D03F 100%)',
                  color: '#0a1a3e',
                  fontWeight: 700,
                  borderRadius: '50px',
                  padding: '12px 24px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '14px',
                  width: '100%',
                  boxShadow: '0 4px 15px rgba(212,168,67,0.3)'
                }}
              >
                {t('prayer.savePrayer')}
              </button>
            </>
          )}
        </div>

        {/* Tabs */}
        <div style={{
          display: 'flex',
          borderBottom: '1px solid var(--glass-border)',
          marginBottom: '20px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('my-prayers')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              color: activeTab === 'my-prayers' ? '#D4A843' : 'var(--text-secondary)',
              borderBottom: activeTab === 'my-prayers' ? '2px solid #D4A843' : 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {t('prayer.tabMyPrayers')}
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('answered')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              color: activeTab === 'answered' ? '#D4A843' : 'var(--text-secondary)',
              borderBottom: activeTab === 'answered' ? '2px solid #D4A843' : 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            {t('prayer.tabAnswered')}
          </button>
        </div>

        {/* Prayer Cards */}
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'var(--text-secondary)' }}>
            {t('prayer.loading')}
          </div>
        ) : activeTab === 'my-prayers' ? (
          activePrayers.length > 0 ? (
            <div>
              {activePrayers.map((entry) => (
                <article
                  key={entry.id}
                  className="glass-panel"
                  style={{
                    border: '1px solid var(--glass-border)',
                    borderLeft: '3px solid var(--glass-border)',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '12px',
                    position: 'relative'
                  }}
                >
                  <p style={{ color: 'var(--text-primary)', fontSize: '16px', fontWeight: 600, marginBottom: '8px' }}>
                    {entry.title || entry.text.split('\n')[0] || t('prayer.untitled')}
                  </p>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    marginBottom: '12px',
                    lineHeight: 1.5
                  }}>
                    {entry.text}
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {new Date(entry.date).toLocaleDateString(i18n.language)}
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => markAsAnswered(entry)}
                        style={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          color: '#D4A843',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {t('prayer.markAnswered')}
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePrayer(entry)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          color: 'var(--text-secondary)',
                          padding: 0
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>✝️</p>
              <p style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '8px' }}>
                {t('prayer.emptyMyTitle')}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px', marginBottom: '24px' }}>
                {t('prayer.emptyMySub')}
              </p>
              <button
                type="button"
                onClick={() => setShowModal(true)}
                style={{
                  background: '#D4A843',
                  color: '#0a1a3e',
                  fontWeight: 700,
                  borderRadius: '50px',
                  padding: '14px 32px',
                  border: 'none',
                  cursor: 'pointer',
                  fontSize: '16px'
                }}
              >
                {t('prayer.addFirst')}
              </button>
            </div>
          )
        ) : (
          answeredPrayers.length > 0 ? (
            <div>
              {answeredPrayers.map((entry) => (
                <article
                  key={entry.id}
                  className="glass-panel"
                  style={{
                    border: '1px solid var(--glass-border)',
                    borderLeft: '3px solid var(--glass-border)',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '12px',
                    position: 'relative'
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'var(--glass-bg)',
                    borderRadius: '20px',
                    padding: '2px 8px',
                    color: '#D4A843',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    {t('prayer.answeredBadge')}
                  </span>
                  <p style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 600, marginBottom: '8px', paddingRight: '80px' }}>
                    {entry.title || entry.text.split('\n')[0] || t('prayer.untitled')}
                  </p>
                  <p style={{
                    color: 'var(--text-secondary)',
                    fontSize: '14px',
                    marginBottom: '12px',
                    lineHeight: 1.5
                  }}>
                    {entry.text}
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <p style={{ color: 'var(--text-secondary)', fontSize: '12px' }}>
                      {new Date(entry.date).toLocaleDateString(i18n.language)}
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => markAsAnswered(entry)}
                        style={{
                          background: 'var(--glass-bg)',
                          border: '1px solid var(--glass-border)',
                          color: '#D4A843',
                          borderRadius: '8px',
                          padding: '6px 12px',
                          fontSize: '12px',
                          fontWeight: 600,
                          cursor: 'pointer'
                        }}
                      >
                        {t('prayer.unmark')}
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePrayer(entry)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          color: 'var(--text-secondary)',
                          padding: 0
                        }}
                      >
                        🗑️
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div style={{
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
              justifyContent: 'center',
              padding: '60px 20px',
              textAlign: 'center'
            }}>
              <p style={{ fontSize: '48px', marginBottom: '16px' }}>✝️</p>
              <p style={{ color: 'var(--text-primary)', fontSize: '16px', marginBottom: '8px' }}>
                {t('prayer.emptyAnsweredTitle')}
              </p>
              <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>
                {t('prayer.emptyAnsweredSub')}
              </p>
            </div>
          )
        )}
      </div>

      {/* Add Prayer Modal */}
      {showModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          zIndex: 1000,
          display: 'flex',
          alignItems: 'flex-end',
          justifyContent: 'center'
        }}>
          <div
            className="glass-scrim"
            style={{
              position: 'fixed',
              inset: 0,
            }}
            onClick={() => setShowModal(false)}
          />
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '680px',
            borderRadius: '24px 24px 0 0',
            padding: '24px 20px 40px',
            position: 'relative',
            zIndex: 1001,
            borderTop: '1px solid var(--glass-border)',
          }}>
            <h2 style={{
              color: '#D4A843',
              fontSize: '18px',
              fontWeight: 700,
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              {t('prayer.modalTitle')}
            </h2>
            
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={t('prayer.titlePlaceholder')}
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                color: 'var(--text-secondary)',
                padding: '12px 16px',
                width: '100%',
                marginBottom: '16px',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={t('prayer.bodyPlaceholder')}
              placeholderStyle={{ color: 'var(--text-secondary)' }}
              style={{
                background: 'var(--glass-bg)',
                border: '1px solid var(--glass-border)',
                borderRadius: '12px',
                color: 'var(--text-secondary)',
                padding: '12px 16px',
                width: '100%',
                minHeight: '180px',
                marginBottom: '20px',
                fontSize: '16px',
                outline: 'none',
                resize: 'none'
              }}
            />
            
            <button
              type="button"
              onClick={addPrayer}
              style={{
                background: '#D4A843',
                color: '#0a1a3e',
                fontWeight: 700,
                borderRadius: '50px',
                padding: '14px',
                width: '100%',
                border: 'none',
                cursor: 'pointer',
                fontSize: '16px',
                marginBottom: '12px'
              }}
            >
              {t('prayer.savePrayer')}
            </button>
            
            <button
              type="button"
              onClick={() => setShowModal(false)}
              style={{
                background: 'none',
                color: 'var(--text-muted)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                width: '100%',
                padding: '8px'
              }}
            >
              {t('common.cancel')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}
