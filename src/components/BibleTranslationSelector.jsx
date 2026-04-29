import { useState } from 'react'
import { POPULAR_BIBLES, saveBibleId } from '../services/bibleApi'

export default function BibleTranslationSelector({ isOpen, onClose, currentBibleId, onSelect, bibles }) {
  const [searchQuery, setSearchQuery] = useState('')

  if (!isOpen) return null

  const bibleList = (bibles ?? POPULAR_BIBLES).filter((b) => b.id)

  const groupedBibles = bibleList.reduce((acc, bible) => {
    if (!acc[bible.language]) {
      acc[bible.language] = []
    }
    acc[bible.language].push(bible)
    return acc
  }, {})

  const filteredBibles = bibleList.filter(bible =>
    bible.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    bible.abbr.toLowerCase().includes(searchQuery.toLowerCase())
  )

  const handleSelect = (bible) => {
    onSelect(bible.id)
    saveBibleId(bible.id)
    onClose()
  }

  return (
    <>
      <div 
        onClick={onClose}
        className="glass-scrim"
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: 200,
        }}
      />
      <div className="glass-panel" style={{
        position: 'fixed',
        bottom: 0,
        left: 0,
        right: 0,
        zIndex: 201,
        borderRadius: '24px 24px 0 0',
        borderTop: '1px solid rgba(255,255,255,0.1)',
        padding: '24px 20px 32px',
        maxHeight: '80vh',
        overflowY: 'auto',
        animation: 'slideUp 0.3s ease-out'
      }}>
        <div style={{ maxWidth: '680px', margin: '0 auto' }}>
          <div style={{
            width: '40px',
            height: '4px',
            background: 'rgba(255,255,255,0.2)',
            borderRadius: '2px',
            margin: '0 auto 24px'
          }} />

          <h2 style={{ 
            color: '#F0C040', 
            fontSize: '20px', 
            fontWeight: 700, 
            marginBottom: '20px',
            textAlign: 'center'
          }}>
            Choose Translation
          </h2>

          {/* Search Bar */}
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search translations..."
            style={{
              background: 'rgba(255,255,255,0.08)',
              border: '1px solid rgba(240,192,64,0.3)',
              borderRadius: '12px',
              color: 'white',
              padding: '12px 16px',
              width: '100%',
              marginBottom: '24px',
              fontSize: '16px',
              outline: 'none'
            }}
          />

          {/* Bible List */}
          {searchQuery ? (
            // Show filtered results
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              {filteredBibles.map((bible) => (
                <button
                  key={bible.id}
                  type="button"
                  onClick={() => !bible.disabled && handleSelect(bible)}
                  disabled={bible.disabled}
                  style={{
                    background: bible.disabled ? 'rgba(255,255,255,0.03)' : 'none',
                    border: 'none',
                    borderBottom: '1px solid rgba(255,255,255,0.06)',
                    color: bible.disabled ? 'rgba(255,255,255,0.3)' : '#FFFFFF',
                    fontSize: '16px',
                    fontWeight: 600,
                    cursor: bible.disabled ? 'not-allowed' : 'pointer',
                    padding: '16px 4px',
                    textAlign: 'left',
                    width: '100%',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    transition: 'background 0.2s ease',
                    opacity: bible.disabled ? 0.5 : 1
                  }}
                  onMouseEnter={(e) => {
                    if (!bible.disabled) {
                      e.currentTarget.style.background = 'rgba(240,192,64,0.1)'
                      e.currentTarget.style.color = '#F0C040'
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!bible.disabled) {
                      e.currentTarget.style.background = 'none'
                      e.currentTarget.style.color = '#FFFFFF'
                    }
                  }}
                >
                  <span>{bible.name}</span>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <span style={{ color: bible.disabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 400 }}>
                      {bible.abbr}
                    </span>
                    {currentBibleId === bible.id && !bible.disabled && (
                      <span style={{ color: '#F0C040', fontSize: '18px' }}>✓</span>
                    )}
                  </div>
                </button>
              ))}
              {filteredBibles.length === 0 && (
                <p style={{ color: 'rgba(255,255,255,0.5)', textAlign: 'center', padding: '24px' }}>
                  No translations found
                </p>
              )}
            </div>
          ) : (
            // Show grouped by language
            Object.entries(groupedBibles).map(([language, bibles]) => (
              <div key={language}>
                <h3 style={{
                  color: '#F0C040',
                  fontSize: '12px',
                  fontWeight: 700,
                  letterSpacing: '0.08em',
                  textTransform: 'uppercase',
                  paddingTop: '16px',
                  paddingBottom: '8px',
                  margin: 0
                }}>
                  {language}
                </h3>
                {bibles.map((bible) => (
                  <button
                    key={bible.id}
                    type="button"
                    onClick={() => !bible.disabled && handleSelect(bible)}
                    disabled={bible.disabled}
                    style={{
                      background: bible.disabled ? 'rgba(255,255,255,0.03)' : 'none',
                      border: 'none',
                      borderBottom: '1px solid rgba(255,255,255,0.06)',
                      color: bible.disabled ? 'rgba(255,255,255,0.3)' : '#FFFFFF',
                      fontSize: '16px',
                      fontWeight: 600,
                      cursor: bible.disabled ? 'not-allowed' : 'pointer',
                      padding: '16px 4px',
                      textAlign: 'left',
                      width: '100%',
                      display: 'flex',
                      justifyContent: 'space-between',
                      alignItems: 'center',
                      transition: 'background 0.2s ease',
                      opacity: bible.disabled ? 0.5 : 1
                    }}
                    onMouseEnter={(e) => {
                      if (!bible.disabled) {
                        e.currentTarget.style.background = 'rgba(240,192,64,0.1)'
                        e.currentTarget.style.color = '#F0C040'
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (!bible.disabled) {
                        e.currentTarget.style.background = 'none'
                        e.currentTarget.style.color = '#FFFFFF'
                      }
                    }}
                  >
                    <span>{bible.name}</span>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                      <span style={{ color: bible.disabled ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.4)', fontSize: '13px', fontWeight: 400 }}>
                        {bible.abbr}
                      </span>
                      {currentBibleId === bible.id && !bible.disabled && (
                        <span style={{ color: '#F0C040', fontSize: '18px' }}>✓</span>
                      )}
                    </div>
                  </button>
                ))}
              </div>
            ))
          )}
        </div>
      </div>
      <style>{`
        @keyframes slideUp {
          from {
            transform: translateY(100%);
          }
          to {
            transform: translateY(0);
          }
        }
      `}</style>
    </>
  )
}
