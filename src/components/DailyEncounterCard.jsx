import { useTranslation } from 'react-i18next'

/**
 * @param {object} props
 * @param {{ text: string, reference: string, reflection: string, prompt: string }} props.encounter
 * @param {() => void} props.onWrite
 * @param {() => void} props.onPray
 * @param {() => void} props.onAskAi
 * @param {() => void} props.onShareImage
 * @param {() => void} props.onQuickSave
 * @param {{ completedToday: boolean, currentStreak: number, justCompleted?: boolean, ctaSyncing?: boolean, saveError?: string | null }} props.presence
 * @param {() => void | Promise<void>} props.onPresenceComplete
 */
export default function DailyEncounterCard({
  encounter,
  onWrite,
  onPray,
  onAskAi,
  onShareImage,
  onQuickSave,
  presence = { completedToday: false, currentStreak: 0, justCompleted: false, ctaSyncing: false, saveError: null },
  onPresenceComplete = () => {},
}) {
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
        className="home-gold-glass"
        style={{
          borderRadius: '16px',
          padding: '20px 18px 18px',
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
            color: 'rgba(255, 255, 255, 0.88)',
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

        <p
          className="text-center text-[11px] font-medium tracking-wide text-[#D4A843]/75 mb-3"
          style={{ textShadow: '0 0 20px rgba(212, 168, 67, 0.12)' }}
        >
          {presence.currentStreak > 0
            ? t('home.presenceStreakLine', { n: presence.currentStreak })
            : t('home.presenceStreakHint')}
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

        <div
          className={[
            'daily-encounter-presence-box rounded-xl border px-3 py-3 mb-2 transition-all duration-500',
            presence.justCompleted
              ? 'border-[#D4A843]/55 bg-[rgba(212,168,67,0.07)] shadow-[0_0_24px_rgba(212,168,67,0.18)]'
              : 'border-[#c9b896]/55 bg-[rgba(28,24,18,0.04)]',
          ].join(' ')}
          style={
            presence.justCompleted
              ? { animation: 'presenceCompleteGlow 1.4s ease-out' }
              : undefined
          }
        >
          {presence.completedToday ? (
            <div className="text-center">
              <p className="text-sm font-semibold text-[#8B6200] mb-1">{t('home.presenceDoneLine')}</p>
              <p className="text-xs text-white/75 mb-0">
                {presence.justCompleted
                  ? t('home.presenceStreakSaved')
                  : t('home.presenceComeBack')}
              </p>
            </div>
          ) : (
            <>
              <button
                type="button"
                disabled={presence.ctaSyncing}
                aria-busy={presence.ctaSyncing ? 'true' : undefined}
                onClick={() => {
                  if (presence.ctaSyncing) return
                  void Promise.resolve(onPresenceComplete()).catch(() => {})
                }}
                className={[
                  'w-full rounded-lg border py-2.5 px-3 text-sm font-semibold text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] transition focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/40',
                  presence.ctaSyncing
                    ? 'cursor-wait border-[#D4A843]/75 bg-[linear-gradient(180deg,rgba(212,168,67,0.42),rgba(212,168,67,0.2))] shadow-[0_0_20px_rgba(212,168,67,0.25)] opacity-95'
                    : 'border-[#D4A843]/45 bg-[rgba(255,255,255,0.1)] hover:border-[#D4A843]/65 hover:bg-[rgba(212,168,67,0.18)] hover:shadow-[0_0_18px_rgba(212,168,67,0.2)]',
                ].join(' ')}
              >
                {presence.ctaSyncing ? t('home.presenceCtaSaving') : t('home.presenceCta')}
              </button>
              {presence.saveError ? (
                <p role="alert" className="text-xs text-center text-red-300 mt-2 mb-0 leading-snug">
                  {presence.saveError}
                </p>
              ) : null}
              <p className="text-[10px] text-center text-white/55 mt-2 mb-0 leading-snug">{t('home.presenceSubtleHint')}</p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-1">
          <button
            type="button"
            onClick={onShareImage}
            className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium text-white/75 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded"
            aria-label={t('home.shareAsImage')}
          >
            <span aria-hidden>📤</span>
            {t('home.encounterShareLink')}
          </button>
          <span className="text-white/40 select-none" aria-hidden>
            •
          </span>
          <button
            type="button"
            onClick={onQuickSave}
            className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium text-white/75 hover:text-white focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent rounded"
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
          border: 1px solid rgba(212, 168, 67, 0.35);
          background: rgba(255, 255, 255, 0.08);
          color: rgba(255, 255, 255, 0.95);
          font-size: 12px;
          font-weight: 600;
          cursor: pointer;
          transition: border-color 0.2s ease, box-shadow 0.2s ease, background 0.2s ease;
        }
        .daily-encounter-action-btn:hover {
          border-color: rgba(212, 168, 67, 0.55);
          box-shadow: 0 0 16px rgba(212, 168, 67, 0.15);
          background: rgba(212, 168, 67, 0.14);
        }
        .daily-encounter-action-emoji {
          font-size: 20px;
          line-height: 1;
        }
        .daily-encounter-action-label {
          font-size: 11px;
          letter-spacing: 0.02em;
        }
        @keyframes presenceCompleteGlow {
          0% { box-shadow: 0 0 0 rgba(212, 168, 67, 0); }
          40% { box-shadow: 0 0 28px rgba(212, 168, 67, 0.35); }
          100% { box-shadow: 0 0 16px rgba(212, 168, 67, 0.15); }
        }
      `}</style>
    </div>
  )
}
