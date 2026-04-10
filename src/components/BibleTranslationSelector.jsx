import { POPULAR_BIBLES, saveBibleId } from '../services/bibleApi'

export default function BibleTranslationSelector({ isOpen, onClose, currentBibleId, onSelect }) {
  if (!isOpen) return null

  const groupedBibles = POPULAR_BIBLES.reduce((acc, bible) => {
    if (!acc[bible.language]) {
      acc[bible.language] = []
    }
    acc[bible.language].push(bible)
    return acc
  }, {})

  const handleSelect = (bible) => {
    onSelect(bible.id)
    saveBibleId(bible.id)
    onClose()
  }

  return (
    <div style={{
      position: 'fixed',
      inset: 0,
      background: 'rgba(0,0,0,0.7)',
      zIndex: 50,
      display: 'flex',
      alignItems: 'flex-end'
    }}>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.7)',
        }}
        onClick={onClose}
      />
      <div style={{
        position: 'relative',
        background: 'rgba(8,20,50,0.97)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderRadius: '20px 20px 0 0',
        padding: '24px',
        width: '100%',
        maxHeight: '80vh',
        overflowY: 'auto',
        zIndex: 51
      }}>
        <button
          type="button"
          onClick={onClose}
          style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            background: 'none',
            border: 'none',
            color: 'rgba(255,255,255,0.5)',
            fontSize: '20px',
            cursor: 'pointer',
            padding: 0
          }}
        >
          ✕
        </button>

        <h2 style={{
          color: '#D4A843',
          fontSize: '18px',
          fontWeight: 700,
          textAlign: 'center',
          marginBottom: '16px',
          paddingTop: '8px'
        }}>
          Choose Translation
        </h2>

        {Object.entries(groupedBibles).map(([language, bibles]) => (
          <div key={language}>
            <h3 style={{
              color: '#D4A843',
              fontSize: '11px',
              fontWeight: 700,
              letterSpacing: '0.08em',
              textTransform: 'uppercase',
              paddingTop: '16px',
              paddingBottom: '6px',
              margin: 0
            }}>
              {language}
            </h3>
            {bibles.map((bible) => (
              <button
                key={bible.id}
                type="button"
                onClick={() => handleSelect(bible)}
                style={{
                  background: 'none',
                  border: 'none',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  padding: '14px 0',
                  borderBottom: '1px solid rgba(255,255,255,0.08)',
                  cursor: 'pointer',
                  width: '100%'
                }}
              >
                <div style={{ flex: 1, textAlign: 'left' }}>
                  <span style={{
                    color: currentBibleId === bible.id ? '#D4A843' : '#FFFFFF',
                    fontSize: '15px',
                    fontWeight: currentBibleId === bible.id ? 700 : 400
                  }}>
                    {bible.name}
                  </span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <span style={{
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '13px'
                  }}>
                    {bible.abbr}
                  </span>
                  {currentBibleId === bible.id && (
                    <span style={{ color: '#D4A843', fontSize: '18px' }}>✓</span>
                  )}
                </div>
              </button>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
