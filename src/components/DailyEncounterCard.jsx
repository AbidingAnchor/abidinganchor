import { useTranslation } from 'react-i18next'

/**
 * @param {object} props
 * @param {{ text: string, reference: string, reflection: string, prompt: string }} props.encounter
 * @param {() => void} props.onWrite
 * @param {() => void} props.onPray
 * @param {() => void} props.onAskAi
 * @param {() => void} props.onShareImage
 * @param {() => void} props.onQuickSave
 */
export default function DailyEncounterCard({ encounter, onWrite, onPray, onAskAi, onShareImage, onQuickSave }) {
  const { t } = useTranslation()
  const { text, reference, reflection, prompt } = encounter

  return (
    <div style={{ marginBottom: '8px' }}>
      <p
        style={{
          margin: '0 0 12px',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.2em',
          textTransform: 'uppercase',
          color: 'rgba(212, 168, 67, 0.85)',
        }}
      >
        {t('home.dailyEncounterKicker')}
      </p>

      <article
        className="text-white"
        style={{
          background: 'var(--glass-bg)',
          border: '1px solid var(--glass-border)',
          borderRadius: '16px',
          padding: '20px 18px 18px',
          backdropFilter: 'blur(16px)',
          WebkitBackdropFilter: 'blur(16px)',
          boxShadow: '0 4px 28px rgba(5, 12, 40, 0.45), 0 0 1px rgba(212, 168, 67, 0.35)',
          position: 'relative',
          animation: 'fadeInUp 0.6s ease forwards',
          animationDelay: '0.1s',
        }}
      >
        <p
          style={{
            margin: '0 0 18px',
            textAlign: 'center',
            fontSize: '17px',
            lineHeight: 1.75,
            color: 'var(--verse-text)',
            fontStyle: 'italic',
            fontFamily: 'Georgia, "Lora", serif',
          }}
        >
          {text}
        </p>

        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            justifyContent: 'center',
            marginBottom: '18px',
          }}
        >
          <div style={{ flex: 1, height: '1px', maxWidth: '100px', background: 'var(--glass-border)' }} />
          <p
            style={{
              margin: 0,
              color: '#D4A843',
              fontSize: '13px',
              fontWeight: 600,
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            {reference}
          </p>
          <div style={{ flex: 1, height: '1px', maxWidth: '100px', background: 'var(--glass-border)' }} />
        </div>

        <p
          style={{
            margin: '0 0 14px',
            fontSize: '14px',
            lineHeight: 1.55,
            color: 'rgba(255, 255, 255, 0.82)',
            textAlign: 'center',
            fontWeight: 500,
          }}
        >
          {reflection}
        </p>

        <p
          style={{
            margin: '0 0 22px',
            fontSize: '14px',
            lineHeight: 1.5,
            color: 'rgba(212, 168, 67, 0.95)',
            textAlign: 'center',
            fontStyle: 'italic',
            fontFamily: 'Georgia, serif',
          }}
        >
          {prompt}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '10px',
          }}
        >
          <button type="button" onClick={onWrite} className="daily-encounter-action-btn">
            <span className="daily-encounter-action-emoji" aria-hidden>
              ✍️
            </span>
            <span className="daily-encounter-action-label">{t('home.encounterWrite')}</span>
          </button>
          <button type="button" onClick={onPray} className="daily-encounter-action-btn">
            <span className="daily-encounter-action-emoji" aria-hidden>
              🙏
            </span>
            <span className="daily-encounter-action-label">{t('home.encounterPray')}</span>
          </button>
          <button type="button" onClick={onAskAi} className="daily-encounter-action-btn">
            <span className="daily-encounter-action-emoji" aria-hidden>
              🤖
            </span>
            <span className="daily-encounter-action-label">{t('home.encounterAskAi')}</span>
          </button>
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-1">
          <button
            type="button"
            onClick={onShareImage}
            className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium text-white/50 hover:text-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded"
            aria-label={t('home.shareAsImage')}
          >
            <span aria-hidden>📤</span>
            {t('home.encounterShareLink')}
          </button>
          <span className="text-white/35 select-none" aria-hidden>
            •
          </span>
          <button
            type="button"
            onClick={onQuickSave}
            className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium text-white/50 hover:text-white/70 focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded"
            aria-label={t('home.encounterQuickSave')}
          >
            <span aria-hidden>🔖</span>
            {t('home.encounterSaveLink')}
          </button>
        </div>
      </article>

      <style>{`
        .daily-encounter-action-btn {
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          gap: 4px;
          min-height: 64px;
          padding: 10px 6px;
          border-radius: 12px;
          border: 1px solid rgba(212, 168, 67, 0.28);
          background: rgba(15, 23, 42, 0.45);
          color: rgba(255, 255, 255, 0.92);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .daily-encounter-action-btn:hover {
          border-color: rgba(212, 168, 67, 0.55);
          box-shadow: 0 0 16px rgba(212, 168, 67, 0.12);
          background: rgba(212, 168, 67, 0.08);
        }
        .daily-encounter-action-emoji {
          font-size: 20px;
          line-height: 1;
        }
        .daily-encounter-action-label {
          font-size: 11px;
          letter-spacing: 0.02em;
        }
      `}</style>
    </div>
  )
}
