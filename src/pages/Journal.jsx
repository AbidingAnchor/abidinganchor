import { useEffect, useState } from 'react'
import { deleteJournalEntry, getJournalEntries, saveToJournal } from '../utils/journal'
import { useAuth } from '../context/AuthContext'

const MOOD_TAGS = ['Grateful', 'Hopeful', 'Struggling', 'Peaceful', 'Convicted', 'Joyful']

function normalizeEntry(entry) {
  const savedDate = entry.created_at ? new Date(entry.created_at).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  }) : new Date().toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  })
  return {
    id: String(entry.id),
    reference: entry.verse_reference || '',
    note: entry.content || '',
    date: savedDate,
    mood: entry.mood || '',
  }
}

function Journal() {
  const { user } = useAuth()
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [reference, setReference] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [selectedMood, setSelectedMood] = useState('')
  const [writingStreak, setWritingStreak] = useState(0)

  useEffect(() => {
    let active = true
    const load = async () => {
      if (!user?.id) return
      setLoading(true)
      const data = await getJournalEntries(user.id)
      if (!active) return
      setEntries((data || []).map(normalizeEntry))
      
      // Calculate writing streak
      const entriesWithDates = (data || []).map(e => ({
        date: new Date(e.created_at).toISOString().slice(0, 10)
      }))
      const uniqueDates = [...new Set(entriesWithDates.map(e => e.date))].sort().reverse()
      
      let streak = 0
      const today = new Date().toISOString().slice(0, 10)
      const yesterday = new Date(Date.now() - 86400000).toISOString().slice(0, 10)
      
      if (uniqueDates.length > 0) {
        const mostRecent = uniqueDates[0]
        if (mostRecent === today || mostRecent === yesterday) {
          streak = 1
          for (let i = 1; i < uniqueDates.length; i++) {
            const current = new Date(uniqueDates[i])
            const prev = new Date(uniqueDates[i - 1])
            const diffDays = Math.floor((prev - current) / (1000 * 60 * 60 * 24))
            if (diffDays === 1) {
              streak++
            } else {
              break
            }
          }
        }
      }
      
      setWritingStreak(streak)
      setLoading(false)
    }
    load()
    return () => { active = false }
  }, [user?.id])

  const handleSaveEntry = async () => {
    if (!content.trim()) return
    
    setSaving(true)
    
    const today = new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    })
    
    const isDuplicate = entries.some(entry => 
      entry.note.trim() === content.trim() && entry.date === today
    )
    
    if (isDuplicate) {
      alert('You already have an entry with this content today.')
      setSaving(false)
      return
    }
    
    const newEntry = await saveToJournal({
      verse: reference.trim() ? content.trim() : null,
      reference: reference.trim() || null,
      note: content.trim(),
      tags: ['Reflection'],
      userId: user?.id,
      mood: selectedMood || null,
    })
    
    setSaving(false)
    
    if (!newEntry) return
    setEntries((prev) => [normalizeEntry(newEntry), ...prev])
    setTitle('')
    setContent('')
    setReference('')
    setSelectedMood('')
    setShowModal(false)
  }

  const handleDeleteEntry = async (entry) => {
    await deleteJournalEntry(entry.id)
    const nextEntries = await getJournalEntries(user?.id)
    setEntries((nextEntries || []).map(normalizeEntry))
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div
        className="content-scroll"
        style={{ padding: '0 16px', paddingTop: '200px', paddingBottom: '100px', maxWidth: '390px', margin: '0 auto', width: '100%' }}
      >
        <h1 style={{ 
          color: '#D4A843', 
          fontSize: '20px', 
          fontWeight: 700, 
          letterSpacing: '0.1em', 
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          MY JOURNAL
        </h1>

        <div className="glass-panel" style={{
          border: '1px solid rgba(212,168,67,0.2)',
          borderRadius: '16px',
          padding: '16px',
          marginBottom: '20px',
          display: 'flex',
          alignItems: 'center',
          gap: '12px'
        }}>
          <span style={{ fontSize: '24px' }}>🔥</span>
          <div>
            <p style={{ 
              color: '#D4A843', 
              fontSize: '14px', 
              fontWeight: 600, 
              marginBottom: '2px' 
            }}>
              {writingStreak > 0 ? `${writingStreak} Day Writing Streak` : 'Start your writing streak today'}
            </p>
            <p style={{ color: 'rgba(255,255,255,0.5)', fontSize: '11px' }}>
              {writingStreak > 0 ? 'Keep up the great work!' : 'Write your first entry to begin'}
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            width: '100%',
            background: '#D4A843',
            color: '#0a1a3e',
            fontWeight: 700,
            borderRadius: '50px',
            padding: '14px',
            marginBottom: '20px',
            border: 'none',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
            fontSize: '16px'
          }}
        >
          <span>✏️</span>
          <span>New Entry</span>
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.6)' }}>
            Loading...
          </div>
        ) : entries.length > 0 ? (
          <div>
            {entries.map((entry) => (
              <article
                key={entry.id}
                className="glass-panel"
                style={{
                  border: '1px solid rgba(212,168,67,0.2)',
                  borderRadius: '16px',
                  padding: '16px',
                  marginBottom: '12px'
                }}
              >
                <p style={{
                  color: '#D4A843',
                  fontSize: '11px',
                  fontWeight: 600,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase'
                }}>
                  {entry.date}
                </p>
                <p style={{
                  color: '#FFFFFF',
                  fontSize: '17px',
                  fontWeight: 600,
                  marginTop: '4px'
                }}>
                  {entry.note.split('\n')[0] || 'Untitled'}
                </p>
                <p style={{
                  color: 'rgba(255,255,255,0.65)',
                  fontSize: '14px',
                  marginTop: '4px',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical'
                }}>
                  {entry.note}
                </p>
                <div style={{
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  marginTop: '12px'
                }}>
                  <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
                    {entry.mood && (
                      <span style={{
                        background: 'rgba(212,168,67,0.15)',
                        color: '#D4A843',
                        borderRadius: '20px',
                        fontSize: '11px',
                        padding: '3px 10px',
                        fontWeight: 600
                      }}>
                        {entry.mood}
                      </span>
                    )}
                    {entry.reference && (
                      <span style={{
                        background: 'rgba(212,168,67,0.15)',
                        color: '#D4A843',
                        borderRadius: '20px',
                        fontSize: '12px',
                        padding: '3px 10px'
                      }}>
                        {entry.reference}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDeleteEntry(entry)}
                    style={{
                      background: 'none',
                      border: 'none',
                      cursor: 'pointer',
                      fontSize: '16px',
                      color: 'rgba(255,255,255,0.4)',
                      padding: 0
                    }}
                  >
                    🗑️
                  </button>
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
            <p style={{ color: '#FFFFFF', fontSize: '16px', marginBottom: '8px' }}>
              Your journal is empty
            </p>
            <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '24px' }}>
              Start capturing what God is speaking to you
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
              Write First Entry
            </button>
          </div>
        )}
      </div>

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
            onClick={() => {
              setShowModal(false)
              setSelectedMood('')
            }}
          />
          <div className="glass-panel" style={{
            width: '100%',
            maxWidth: '390px',
            borderRadius: '24px 24px 0 0',
            padding: '24px 20px 40px',
            position: 'relative',
            zIndex: 1001,
            borderTop: '1px solid rgba(255,255,255,0.1)',
          }}>
            <h2 style={{
              color: '#D4A843',
              fontSize: '18px',
              fontWeight: 700,
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              New Journal Entry
            </h2>
            
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title (optional)"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(212,168,67,0.3)',
                borderRadius: '12px',
                color: 'white',
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
              placeholder="Write your reflection, prayer, or thoughts..."
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(212,168,67,0.3)',
                borderRadius: '12px',
                color: 'white',
                padding: '12px 16px',
                width: '100%',
                minHeight: '180px',
                marginBottom: '16px',
                fontSize: '16px',
                outline: 'none',
                resize: 'none'
              }}
            />
            
            <input
              type="text"
              value={reference}
              onChange={(e) => setReference(e.target.value)}
              placeholder="Scripture reference (e.g. John 3:16)"
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(212,168,67,0.3)',
                borderRadius: '12px',
                color: 'white',
                padding: '12px 16px',
                width: '100%',
                marginBottom: '16px',
                fontSize: '16px',
                outline: 'none'
              }}
            />
            
            <p style={{
              color: 'rgba(255,255,255,0.7)',
              fontSize: '12px',
              fontWeight: 600,
              marginBottom: '8px',
              textTransform: 'uppercase',
              letterSpacing: '0.08em'
            }}>
              How are you feeling?
            </p>
            <div style={{
              display: 'flex',
              flexWrap: 'wrap',
              gap: '8px',
              marginBottom: '20px'
            }}>
              {MOOD_TAGS.map((mood) => (
                <button
                  key={mood}
                  type="button"
                  onClick={() => setSelectedMood(selectedMood === mood ? '' : mood)}
                  className="glass-panel"
                  style={{
                    background: selectedMood === mood 
                      ? 'rgba(212,168,67,0.12)' 
                      : undefined,
                    border: selectedMood === mood 
                      ? '1px solid #D4A843' 
                      : '1px solid rgba(255,255,255,0.08)',
                    borderRadius: '50px',
                    padding: '8px 16px',
                    color: selectedMood === mood ? '#D4A843' : 'rgba(255,255,255,0.6)',
                    fontSize: '13px',
                    fontWeight: 600,
                    cursor: 'pointer',
                    transition: 'all 0.2s ease'
                  }}
                >
                  {mood}
                </button>
              ))}
            </div>
            
            <button
              type="button"
              onClick={handleSaveEntry}
              disabled={saving}
              style={{
                background: saving ? 'rgba(212,168,67,0.5)' : '#D4A843',
                color: '#0a1a3e',
                fontWeight: 700,
                borderRadius: '50px',
                padding: '14px',
                width: '100%',
                border: 'none',
                cursor: saving ? 'not-allowed' : 'pointer',
                fontSize: '16px',
                marginBottom: '12px',
                opacity: saving ? 0.7 : 1
              }}
            >
              {saving ? 'Saving...' : 'Save Entry'}
            </button>
            
            <button
              type="button"
              onClick={() => {
                setShowModal(false)
                setSelectedMood('')
              }}
              style={{
                background: 'none',
                color: 'rgba(255,255,255,0.5)',
                border: 'none',
                cursor: 'pointer',
                fontSize: '14px',
                width: '100%',
                padding: '8px'
              }}
            >
              Cancel
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

export default Journal
