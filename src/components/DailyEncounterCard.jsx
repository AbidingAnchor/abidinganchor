import { useTranslation } from 'react-i18next'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'

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
  const skyPeriod = useThemeBackgroundType()
  const dayTheme = skyPeriod === 'day' || skyPeriod === 'morning' || skyPeriod === 'afternoon'

  const glassButtonBase = {
    borderRadius: '999px',
    padding: '10px 10px',
    backdropFilter: 'blur(10px)',
    WebkitBackdropFilter: 'blur(10px)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '4px',
    cursor: 'pointer',
    transition: 'transform 0.18s ease, filter 0.18s ease, border-color 0.18s ease',
  }

  const handlePressIn = (e) => {
    e.currentTarget.style.transform = 'translateY(-1px)'
  }

  const handlePressOut = (e) => {
    e.currentTarget.style.transform = 'translateY(0)'
  }

  return (
    <div style={{ marginBottom: '12px' }}>
      <article
        className="daily-encounter-card-premium"
        style={{
          background: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(12px)',
          WebkitBackdropFilter: 'blur(12px)',
          border: '1px solid rgba(255, 255, 255, 0.08)',
          borderRadius: '24px',
          padding: '24px',
          position: 'relative',
          overflow: 'hidden',
          boxShadow: 'none',
          animation: 'fadeInUp 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards',
          animationDelay: '0.12s',
        }}
      >
        <p
          style={{
            margin: '0 0 18px',
            textAlign: 'center',
            fontSize: '11px',
            fontWeight: 700,
            letterSpacing: '0.24em',
            textTransform: 'uppercase',
            color: 'rgba(251, 191, 36, 0.82)',
          }}
        >
          {t('home.dailyEncounterKicker')}
        </p>

        <p
          className={`daily-encounter-verse ${dayTheme ? 'daily-encounter-verse-day' : ''}`}
          style={{
            margin: '0 0 18px',
            textAlign: 'center',
            fontSize: '22px',
            lineHeight: 1.85,
            color: '#ffffff',
            fontStyle: 'italic',
            fontFamily: 'Georgia, "Lora", serif',
            fontWeight: 500,
            letterSpacing: '0.01em',
            textShadow: '0 0 20px rgba(212, 168, 67, 0.18)',
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
            marginBottom: '20px',
          }}
        >
          <div style={{ flex: 1, height: '1px', maxWidth: '110px', background: 'linear-gradient(90deg, transparent, rgba(212, 168, 67, 0.45))' }} />
          <p
            style={{
              margin: 0,
              color: '#fbbf24',
              fontSize: '13px',
              fontWeight: 700,
              fontFamily: 'Georgia, serif',
              letterSpacing: '0.08em',
              whiteSpace: 'nowrap',
            }}
          >
            {reference}
          </p>
          <div style={{ flex: 1, height: '1px', maxWidth: '110px', background: 'linear-gradient(90deg, rgba(212, 168, 67, 0.45), transparent)' }} />
        </div>

        <p
          className={`daily-encounter-reflection ${dayTheme ? 'daily-encounter-reflection-day' : ''}`}
          style={{
            margin: '0 0 14px',
            fontSize: '14px',
            lineHeight: 1.65,
            color: 'rgba(209, 213, 219, 0.95)',
            textAlign: 'center',
            fontStyle: 'italic',
            fontWeight: 400,
          }}
        >
          {reflection}
        </p>

        <p
          className={dayTheme ? 'daily-encounter-prompt-day' : ''}
          style={{
            margin: '0 0 22px',
            fontSize: '15px',
            lineHeight: 1.5,
            color: 'rgba(251, 191, 36, 0.95)',
            textAlign: 'center',
            fontStyle: 'italic',
            fontFamily: 'Georgia, serif',
          }}
        >
          {prompt}
        </p>

        <p
          className="text-center text-[12px] font-semibold tracking-wide text-[#fbbf24] mb-3"
          style={{ textShadow: '0 0 20px rgba(212, 168, 67, 0.16)' }}
        >
          {presence.currentStreak > 0
            ? `🔥 ${t('home.presenceStreakLine', { n: presence.currentStreak }).replace(/^✨\s*/, '')}`
            : t('home.presenceStreakHint')}
        </p>

        <div
          style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(3, 1fr)',
            gap: '8px',
            marginBottom: '12px',
          }}
        >
          <button
            type="button"
            onClick={onWrite}
            style={{
              ...glassButtonBase,
              background: 'linear-gradient(135deg, #f59e0b 0%, #ca8a04 100%)',
              border: 'none',
              boxShadow: '0 8px 20px rgba(245, 158, 11, 0.25)',
            }}
            onMouseEnter={handlePressIn}
            onMouseLeave={handlePressOut}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }} aria-hidden>✍️</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#111827' }}>{t('home.encounterWrite')}</span>
          </button>
          <button
            type="button"
            onClick={onPray}
            style={{
              ...glassButtonBase,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(251, 191, 36, 0.45)',
            }}
            onMouseEnter={handlePressIn}
            onMouseLeave={handlePressOut}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }} aria-hidden>🙏</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#fbbf24' }}>{t('home.encounterPray')}</span>
          </button>
          <button
            type="button"
            onClick={onAskAi}
            style={{
              ...glassButtonBase,
              background: 'rgba(255,255,255,0.06)',
              border: '1px solid rgba(129, 140, 248, 0.55)',
            }}
            onMouseEnter={handlePressIn}
            onMouseLeave={handlePressOut}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }} aria-hidden>🤖</span>
            <span style={{ fontSize: '12px', fontWeight: 700, color: '#c4b5fd' }}>{t('home.encounterAskAi')}</span>
          </button>
        </div>

        <div
          className="daily-encounter-presence-box rounded-xl px-3 py-3 mb-2 transition-all duration-500"
          style={{
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255,255,255,0.1)',
            borderLeft: `3px solid rgba(251, 191, 36, ${presence.completedToday ? 0.9 : 0.55})`,
            animation: presence.justCompleted ? 'presenceCompleteGlow 1.4s ease-out' : undefined,
          }}
        >
          {presence.completedToday ? (
            <div className="text-center">
              <p className="text-sm font-semibold text-[#fbbf24] mb-1">{t('home.presenceDoneLine')}</p>
              <p className="text-xs mb-0 text-white/65">{t('home.presenceComeBack')}</p>
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
                  'w-full rounded-[16px] border-0 py-2.5 px-3 text-sm font-bold text-[#111827]',
                  'bg-[linear-gradient(165deg,#F4E8C8_0%,#E8C56A_18%,#D4A843_50%,#B8860B_88%,#8A6910_100%)]',
                  'transition-all duration-200 ease-out',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                  presence.ctaSyncing
                    ? 'cursor-wait opacity-95 shadow-[0_4px_16px_rgba(0,0,0,0.35)]'
                    : 'presence-cta-gold-pulse hover:brightness-[1.06] active:scale-[0.98] active:brightness-[1.02]',
                ].join(' ')}
              >
                {presence.ctaSyncing ? t('home.presenceCtaSaving') : t('home.presenceCta')}
              </button>
              {presence.saveError ? (
                <p role="alert" className="text-xs text-center text-red-300 mt-2 mb-0 leading-snug">
                  {presence.saveError}
                </p>
              ) : null}
              <p className="text-[10px] text-center mt-2 mb-0 leading-snug text-white/55">{t('home.presenceSubtleHint')}</p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-3 gap-y-1 border-t border-white/10 pt-3 mt-3">
          <button
            type="button"
            onClick={onShareImage}
            className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium rounded text-white/55 hover:text-[#fbbf24] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            aria-label={t('home.shareAsImage')}
          >
            <span aria-hidden>📤</span>
            {t('home.encounterShareLink')}
          </button>
          <span className="text-white/25 select-none" aria-hidden>
            •
          </span>
          <button
            type="button"
            onClick={onQuickSave}
            className="inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium rounded text-white/55 hover:text-[#fbbf24] focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent"
            aria-label={t('home.encounterQuickSave')}
          >
            <span aria-hidden>🔖</span>
            {t('home.encounterSaveLink')}
          </button>
        </div>
      </article>

      <style>{`
        .daily-encounter-verse-day {
          color: #ffffff !important;
        }
        .daily-encounter-reflection-day {
          color: rgba(229, 231, 235, 0.96) !important;
        }
        .daily-encounter-prompt-day {
          color: rgba(251, 191, 36, 0.95) !important;
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
