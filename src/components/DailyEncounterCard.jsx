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
  const dayTheme = skyPeriod === 'day'

  return (
    <div style={{ marginBottom: '8px' }}>
      <p
        style={{
          margin: '0 0 12px',
          textAlign: 'center',
          fontSize: '11px',
          fontWeight: 600,
          letterSpacing: '0.22em',
          textTransform: 'uppercase',
          color: 'rgba(212, 168, 67, 0.78)',
        }}
      >
        {t('home.dailyEncounterKicker')}
      </p>

      <article
        className="home-gold-glass daily-encounter-card-premium"
        style={{
          borderRadius: '16px',
          padding: '20px 18px 18px',
          position: 'relative',
          animation: 'fadeInUp 0.65s cubic-bezier(0.22, 1, 0.36, 1) forwards',
          animationDelay: '0.12s',
        }}
      >
        <p
          className={`daily-encounter-verse ${dayTheme ? 'daily-encounter-verse-day' : ''}`}
          style={{
            margin: '0 0 18px',
            textAlign: 'center',
            fontSize: '19px',
            lineHeight: 1.72,
            color: dayTheme ? '#1A1A1A' : 'var(--verse-text)',
            fontStyle: 'italic',
            fontFamily: 'Georgia, "Lora", serif',
            fontWeight: 500,
            letterSpacing: '0.01em',
            textShadow: dayTheme ? 'none' : '0 0 20px rgba(212, 168, 67, 0.2)',
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
          className={`daily-encounter-reflection ${dayTheme ? 'daily-encounter-reflection-day' : ''}`}
          style={{
            margin: '0 0 14px',
            fontSize: '14px',
            lineHeight: 1.55,
            color: dayTheme ? '#1A1A1A' : 'rgba(255, 255, 255, 0.88)',
            textAlign: 'center',
            fontWeight: 500,
          }}
        >
          {reflection}
        </p>

        <p
          className={dayTheme ? 'daily-encounter-prompt-day' : ''}
          style={{
            margin: '0 0 22px',
            fontSize: '14px',
            lineHeight: 1.5,
            color: dayTheme ? '#B8881A' : 'rgba(212, 168, 67, 0.95)',
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
            gap: '6px',
            marginBottom: '10px',
          }}
        >
          <button
            type="button"
            onClick={onWrite}
            style={{
              background: dayTheme ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(212,168,67,0.3)',
              borderRadius: '50px',
              padding: '8px 10px',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,168,67,0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.background = dayTheme ? 'rgba(212,168,67,0.1)' : 'rgba(255,255,255,0.07)'}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }} aria-hidden>✍️</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: dayTheme ? '#1A1A2E' : '#ffffff' }}>{t('home.encounterWrite')}</span>
          </button>
          <button
            type="button"
            onClick={onPray}
            style={{
              background: dayTheme ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(212,168,67,0.3)',
              borderRadius: '50px',
              padding: '8px 10px',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,168,67,0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.background = dayTheme ? 'rgba(212,168,67,0.1)' : 'rgba(255,255,255,0.07)'}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }} aria-hidden>🙏</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: dayTheme ? '#1A1A2E' : '#ffffff' }}>{t('home.encounterPray')}</span>
          </button>
          <button
            type="button"
            onClick={onAskAi}
            style={{
              background: dayTheme ? 'rgba(212,168,67,0.15)' : 'rgba(255,255,255,0.07)',
              border: '1px solid rgba(212,168,67,0.3)',
              borderRadius: '50px',
              padding: '8px 10px',
              backdropFilter: 'blur(10px)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              gap: '4px',
              cursor: 'pointer',
              transition: 'all 0.2s ease',
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(212,168,67,0.15)'}
            onMouseLeave={(e) => e.currentTarget.style.background = dayTheme ? 'rgba(212,168,67,0.1)' : 'rgba(255,255,255,0.07)'}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }} aria-hidden>🤖</span>
            <span style={{ fontSize: '11px', fontWeight: 600, color: dayTheme ? '#1A1A2E' : '#ffffff' }}>{t('home.encounterAskAi')}</span>
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
              <p className={`text-xs mb-0 ${dayTheme ? 'text-[#4A4A6A]' : 'text-white/75'}`}>{t('home.presenceComeBack')}</p>
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
                  'w-full rounded-[16px] border-0 py-2.5 px-3 text-sm font-bold',
                  dayTheme ? 'text-[#1A1A2E]' : 'text-white',
                  'bg-[linear-gradient(165deg,#F4E8C8_0%,#E8C56A_18%,#D4A843_50%,#B8860B_88%,#8A6910_100%)]',
                  'transition-all duration-200 ease-out',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/50 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent',
                  presence.ctaSyncing
                    ? 'cursor-wait opacity-95 shadow-[0_4px_16px_rgba(0,0,0,0.35)]'
                    : [
                        'presence-cta-gold-pulse',
                        'hover:brightness-[1.06] active:scale-[0.98] active:brightness-[1.02]',
                      ].join(' '),
                ].join(' ')}
              >
                {presence.ctaSyncing ? t('home.presenceCtaSaving') : t('home.presenceCta')}
              </button>
              {presence.saveError ? (
                <p role="alert" className="text-xs text-center text-red-300 mt-2 mb-0 leading-snug">
                  {presence.saveError}
                </p>
              ) : null}
              <p className={`text-[10px] text-center mt-2 mb-0 leading-snug ${dayTheme ? 'text-[#6A6A8A]' : 'text-white/55'}`}>{t('home.presenceSubtleHint')}</p>
            </>
          )}
        </div>

        <div className="flex flex-wrap items-center justify-center gap-x-2 gap-y-1 pt-1">
          <button
            type="button"
            onClick={onShareImage}
            className={`inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${dayTheme ? 'text-[#4A4A6A] hover:text-[#1A1A2E]' : 'text-white/75 hover:text-white'}`}
            aria-label={t('home.shareAsImage')}
          >
            <span aria-hidden>📤</span>
            {t('home.encounterShareLink')}
          </button>
          <span className={dayTheme ? 'text-[#6A6A8A] select-none' : 'text-white/40 select-none'} aria-hidden>
            •
          </span>
          <button
            type="button"
            onClick={onQuickSave}
            className={`inline-flex items-center gap-1 border-0 bg-transparent p-0 text-xs font-medium rounded focus:outline-none focus-visible:ring-2 focus-visible:ring-[#D4A843]/40 focus-visible:ring-offset-2 focus-visible:ring-offset-transparent ${dayTheme ? 'text-[#4A4A6A] hover:text-[#1A1A2E]' : 'text-white/75 hover:text-white'}`}
            aria-label={t('home.encounterQuickSave')}
          >
            <span aria-hidden>🔖</span>
            {t('home.encounterSaveLink')}
          </button>
        </div>
      </article>

      <style>{`
        .daily-encounter-verse-day {
          color: #1A1A1A !important;
        }
        .daily-encounter-reflection-day {
          color: #1A1A1A !important;
        }
        .daily-encounter-prompt-day {
          color: #5C3A00 !important;
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
