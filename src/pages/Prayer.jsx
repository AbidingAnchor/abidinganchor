import { useEffect, useState } from 'react'
import { supabase } from '../lib/supabase'
import { useAuth } from '../context/AuthContext'

export default function Prayer() {
  const { user } = useAuth()
  const [activeTab, setActiveTab] = useState('my-prayers')
  const [showModal, setShowModal] = useState(false)
  const [title, setTitle] = useState('')
  const [content, setContent] = useState('')
  const [entries, setEntries] = useState([])
  const [loading, setLoading] = useState(true)

  const loadPrayers = async () => {
    if (!user?.id) return
    const { data } = await supabase
      .from('prayers')
      .select('*')
      .eq('user_id', user.id)
      .order('created_at', { ascending: false })
    setEntries((data || []).map((row) => ({
      id: row.id,
      title: row.title || '',
      text: row.content,
      date: row.created_at,
      answered: Boolean(row.answered),
    })))
  }

  const addPrayer = async () => {
    if (!content.trim()) return
    await supabase.from('prayers').insert({
      user_id: user.id,
      title: title.trim() || null,
      content: content.trim(),
      answered: false,
    })
    await loadPrayers()
    setTitle('')
    setContent('')
    setShowModal(false)
  }

  const markAsAnswered = async (entry) => {
    await supabase.from('prayers').update({ answered: !entry.answered }).eq('id', entry.id)
    await loadPrayers()
  }

  const deletePrayer = async (entry) => {
    await supabase.from('prayers').delete().eq('id', entry.id)
    await loadPrayers()
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
  }, [user?.id])

  const activePrayers = entries.filter((p) => !p.answered)
  const answeredPrayers = entries.filter((p) => p.answered)

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '200px', paddingBottom: '100px', maxWidth: '390px', margin: '0 auto', width: '100%' }}>
        <h1 style={{ 
          color: '#D4A843', 
          fontSize: '20px', 
          fontWeight: 700, 
          letterSpacing: '0.1em', 
          textAlign: 'center',
          marginBottom: '24px'
        }}>
          PRAYER
        </h1>

        <div style={{
          display: 'flex',
          borderBottom: '1px solid rgba(255,255,255,0.1)',
          marginBottom: '16px'
        }}>
          <button
            type="button"
            onClick={() => setActiveTab('my-prayers')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              color: activeTab === 'my-prayers' ? '#D4A843' : 'rgba(255,255,255,0.45)',
              borderBottom: activeTab === 'my-prayers' ? '2px solid #D4A843' : 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            My Prayers
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('answered')}
            style={{
              flex: 1,
              padding: '12px',
              background: 'none',
              border: 'none',
              color: activeTab === 'answered' ? '#D4A843' : 'rgba(255,255,255,0.45)',
              borderBottom: activeTab === 'answered' ? '2px solid #D4A843' : 'none',
              fontWeight: 600,
              fontSize: '14px',
              cursor: 'pointer'
            }}
          >
            Answered
          </button>
        </div>

        <button
          type="button"
          onClick={() => setShowModal(true)}
          style={{
            background: 'rgba(212,168,67,0.15)',
            border: '1px solid rgba(212,168,67,0.4)',
            borderRadius: '50px',
            color: '#D4A843',
            fontWeight: 600,
            padding: '10px 24px',
            marginBottom: '20px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px'
          }}
        >
          <span>🙏</span>
          <span>Add Prayer</span>
        </button>

        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px', color: 'rgba(255,255,255,0.6)' }}>
            Loading...
          </div>
        ) : activeTab === 'my-prayers' ? (
          activePrayers.length > 0 ? (
            <div>
              {activePrayers.map((entry) => (
                <article
                  key={entry.id}
                  style={{
                    background: 'rgba(8,20,50,0.72)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(212,168,67,0.25)',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '10px',
                    position: 'relative'
                  }}
                >
                  <p style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 600 }}>
                    {entry.title || entry.text.split('\n')[0] || 'Untitled'}
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
                    {entry.text}
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px'
                  }}>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
                      {new Date(entry.date).toLocaleDateString()}
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => markAsAnswered(entry)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '18px',
                          color: 'rgba(212,168,67,0.7)',
                          padding: 0
                        }}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePrayer(entry)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          color: 'rgba(255,255,255,0.35)',
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
              <p style={{ color: '#FFFFFF', fontSize: '16px', marginBottom: '8px' }}>
                No prayers yet
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px', marginBottom: '24px' }}>
                Bring everything before God
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
                Add First Prayer
              </button>
            </div>
          )
        ) : (
          answeredPrayers.length > 0 ? (
            <div>
              {answeredPrayers.map((entry) => (
                <article
                  key={entry.id}
                  style={{
                    background: 'rgba(8,20,50,0.72)',
                    backdropFilter: 'blur(12px)',
                    WebkitBackdropFilter: 'blur(12px)',
                    border: '1px solid rgba(212,168,67,0.25)',
                    borderRadius: '16px',
                    padding: '16px',
                    marginBottom: '10px',
                    position: 'relative'
                  }}
                >
                  <span style={{
                    position: 'absolute',
                    top: '12px',
                    right: '12px',
                    background: 'rgba(212,168,67,0.2)',
                    borderRadius: '20px',
                    padding: '2px 8px',
                    color: '#D4A843',
                    fontSize: '11px',
                    fontWeight: 600
                  }}>
                    Answered ✓
                  </span>
                  <p style={{ color: '#FFFFFF', fontSize: '16px', fontWeight: 600, paddingRight: '80px' }}>
                    {entry.title || entry.text.split('\n')[0] || 'Untitled'}
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
                    {entry.text}
                  </p>
                  <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '12px'
                  }}>
                    <p style={{ color: 'rgba(255,255,255,0.35)', fontSize: '12px' }}>
                      {new Date(entry.date).toLocaleDateString()}
                    </p>
                    <div style={{ display: 'flex', gap: '12px' }}>
                      <button
                        type="button"
                        onClick={() => markAsAnswered(entry)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '18px',
                          color: 'rgba(212,168,67,0.7)',
                          padding: 0
                        }}
                      >
                        ✓
                      </button>
                      <button
                        type="button"
                        onClick={() => deletePrayer(entry)}
                        style={{
                          background: 'none',
                          border: 'none',
                          cursor: 'pointer',
                          fontSize: '16px',
                          color: 'rgba(255,255,255,0.35)',
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
              <p style={{ color: '#FFFFFF', fontSize: '16px', marginBottom: '8px' }}>
                No answered prayers yet
              </p>
              <p style={{ color: 'rgba(255,255,255,0.6)', fontSize: '14px' }}>
                Keep praying and trust in God's timing
              </p>
            </div>
          )
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
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(0,0,0,0.5)',
            }}
            onClick={() => setShowModal(false)}
          />
          <div style={{
            background: 'rgba(8,20,50,0.95)',
            width: '100%',
            maxWidth: '390px',
            borderRadius: '24px 24px 0 0',
            padding: '24px 20px 40px',
            position: 'relative',
            zIndex: 1001
          }}>
            <h2 style={{
              color: '#D4A843',
              fontSize: '18px',
              fontWeight: 700,
              marginBottom: '20px',
              textAlign: 'center'
            }}>
              New Prayer
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
              placeholder="Write your prayer to God..."
              placeholderStyle={{ color: 'rgba(255,255,255,0.5)' }}
              style={{
                background: 'rgba(255,255,255,0.08)',
                border: '1px solid rgba(212,168,67,0.3)',
                borderRadius: '12px',
                color: 'white',
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
              Save Prayer
            </button>
            
            <button
              type="button"
              onClick={() => setShowModal(false)}
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
