import { useEffect } from 'react'

/**
 * Brief overlay when the user saves their first journal entry ever. Auto-dismiss after 3s.
 */
export default function FirstJournalEntryCelebration({ open, onClose }) {
  useEffect(() => {
    if (!open) return
    const id = setTimeout(() => onClose?.(), 3000)
    return () => clearTimeout(id)
  }, [open, onClose])

  if (!open) return null

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-live="polite"
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 2500,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '24px',
        background: 'rgba(10, 15, 30, 0.92)',
        animation: 'fadeIn 0.35s ease',
      }}
      onClick={() => onClose?.()}
    >
      <style>{`
        @keyframes firstEntryConfettiFall {
          0% { transform: translateY(-12px) rotate(0deg); opacity: 1; }
          100% { transform: translateY(100vh) rotate(720deg); opacity: 0.35; }
        }
      `}</style>
      <div
        style={{ position: 'absolute', inset: 0, overflow: 'hidden', pointerEvents: 'none' }}
        aria-hidden
      >
        {[12, 28, 44, 58, 72, 18, 65, 38, 52, 82].map((left, i) => (
          <span
            key={i}
            style={{
              position: 'absolute',
              left: `${left}%`,
              top: '-8px',
              fontSize: '14px',
              animation: `firstEntryConfettiFall ${2.4 + (i % 3) * 0.2}s linear ${i * 0.08}s forwards`,
            }}
          >
            {i % 2 === 0 ? '✨' : '🎉'}
          </span>
        ))}
      </div>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          position: 'relative',
          maxWidth: '320px',
          textAlign: 'center',
          padding: '28px 24px',
          borderRadius: '20px',
          background: 'rgba(26, 26, 46, 0.95)',
          border: '1px solid rgba(212, 168, 67, 0.45)',
          boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: '17px',
            lineHeight: 1.5,
            color: 'var(--text-primary)',
            fontWeight: 600,
          }}
        >
          You wrote your first entry! 🙏 Keep seeking Him daily.
        </p>
      </div>
    </div>
  )
}
