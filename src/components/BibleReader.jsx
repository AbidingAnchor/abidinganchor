import { useEffect, useState } from 'react'

export default function BibleReader({ open, onClose }) {
  const [verses, setVerses] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!open) return
    
    fetch('https://cdn.jsdelivr.net/gh/wldeh/bible-api/bibles/en-kjv/books/genesis/chapters/1.json')
      .then(r => r.json())
      .then(json => {
        setVerses(json.data)
        setLoading(false)
      })
      .catch(err => {
        console.error('Error loading verses:', err)
        setLoading(false)
      })
  }, [open])

  if (!open) return null

  return (
    <div style={{ position: 'relative', minHeight: '100vh', background: '#0a1a3e' }}>
      {/* Top Bar */}
      <div style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        zIndex: 100,
        background: 'rgba(10, 26, 62, 0.95)',
        backdropFilter: 'blur(16px)',
        WebkitBackdropFilter: 'blur(16px)',
        padding: '12px 20px',
        borderBottom: '1px solid rgba(212, 168, 67, 0.2)'
      }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '16px', maxWidth: '680px', margin: '0 auto' }}>
          <button
            type="button"
            onClick={onClose}
            style={{
              position: 'absolute',
              left: '20px',
              background: 'none',
              border: 'none',
              color: '#D4A843',
              fontSize: '16px',
              fontWeight: 600,
              cursor: 'pointer',
              padding: '4px 8px'
            }}
          >
            ←
          </button>

          <div style={{ color: '#FFFFFF', fontSize: '18px', fontWeight: 700 }}>
            Genesis
          </div>

          <span style={{ color: 'rgba(255,255,255,0.5)' }}> </span>

          <div style={{ color: '#D4A843', fontSize: '18px', fontWeight: 700 }}>
            Chapter 1
          </div>

          <div style={{
            position: 'absolute',
            right: '20px',
            color: '#D4A843',
            fontSize: '13px',
            fontWeight: 600
          }}>
            KJV
          </div>
        </div>
      </div>

      {/* Content */}
      <div style={{ 
        paddingTop: '80px', 
        paddingBottom: '100px', 
        padding: '24px 20px', 
        maxWidth: '680px', 
        margin: '0 auto'
      }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: '40px' }}>
            <div style={{ fontSize: '32px', marginBottom: '16px' }}>✝</div>
            <p style={{ color: 'rgba(255,255,255,0.6)' }}>Loading scripture...</p>
          </div>
        ) : (
          <div>
            {/* Chapter Title */}
            <h2 style={{
              color: '#D4A843',
              fontSize: '24px',
              fontWeight: 700,
              marginBottom: '32px',
              textAlign: 'center'
            }}>
              Genesis 1
            </h2>
            
            {/* Verse Text - Continuous Flow */}
            <div style={{
              padding: '20px',
              color: 'white',
              fontSize: '18px',
              lineHeight: '1.8',
              fontFamily: 'Georgia, serif'
            }}>
              <p>
                {verses.map(v => (
                  <span key={v.verse}>
                    <sup style={{ color: '#D4A843', fontSize: '0.7em', marginRight: '2px' }}>
                      {v.verse}
                    </sup>
                    {v.text}{' '}
                  </span>
                ))}
              </p>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
