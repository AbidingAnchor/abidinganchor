import { useTranslation } from 'react-i18next'
import { WEEK_DAY_SHORT, getShortDayName } from '../hooks/useStreakTracker'

/**
 * @param {object} props
 * @param {string[]} props.activeDays Short names present this week (e.g. 'Mon', 'Tue')
 */
export default function DailyStreakCard({ activeDays = [] }) {
  const { t } = useTranslation()

  const dayLabels = [
    t('home.weekdayMon'),
    t('home.weekdayTue'),
    t('home.weekdayWed'),
    t('home.weekdayThu'),
    t('home.weekdayFri'),
    t('home.weekdaySat'),
    t('home.weekdaySun'),
  ]

  const streakCount = activeDays.length
  const streakMessage =
    streakCount >= 1 && streakCount <= 5
      ? t(`home.streak${streakCount}`)
      : t('home.streakDay', { n: streakCount })

  const set = new Set(activeDays)
  const todayShort = getShortDayName()

  return (
    <>
      <style>{`
        @keyframes flamePulse {
          0%, 100% {
            filter: drop-shadow(0 0 8px rgba(212,168,67,0.8));
            transform: scale(1);
          }
          50% {
            filter: drop-shadow(0 0 20px rgba(212,168,67,1.0));
            transform: scale(1.15);
          }
        }
      `}</style>
      <div style={{ marginBottom: '28px' }}>
        <div
          className={`home-gold-glass rounded-[20px] p-5 ${streakCount >= 7 ? 'home-gold-glass--streak-hot' : ''}`}
          style={{
            animation: 'fadeInUp 0.6s ease forwards',
            animationDelay: '0.2s',
          }}
        >
          <div className="mb-4 flex items-center justify-between">
            <h2
              style={{
                color: 'var(--section-title)',
                fontSize: '13px',
                letterSpacing: '0.12em',
                fontWeight: 500,
                textTransform: 'uppercase',
              }}
            >
              {t('home.dailyStreak')}
            </h2>
            <p style={{ fontSize: '14px', color: 'var(--section-title)', fontWeight: 700 }}>
              {t('home.dayStreak', { n: streakCount })}
            </p>
          </div>
          <p style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
            {streakMessage}
          </p>
          <div className="flex items-center justify-between gap-2" style={{ overflowX: 'auto' }}>
            {WEEK_DAY_SHORT.map((key, index) => {
              const isLit = set.has(key)
              const isTodayDot = key === todayShort
              const flameStyle =
                isLit && isTodayDot
                  ? {
                      fontSize: '36px',
                      color: '#D4A843',
                      filter: 'drop-shadow(0 0 8px rgba(212,168,67,0.8))',
                      animation: 'flamePulse 2s ease-in-out infinite',
                    }
                  : isLit
                    ? {
                        fontSize: '28px',
                        color: '#D4A843',
                        filter: 'drop-shadow(0 0 8px rgba(212,168,67,0.8))',
                      }
                    : {
                        width: '28px',
                        height: '28px',
                        borderRadius: '50%',
                        background: 'rgba(150,150,150,0.25)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                      }
              return (
                <div
                  key={key}
                  style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '6px',
                  }}
                >
                  <span
                    style={{
                      color: 'var(--label-text)',
                      fontSize: '11px',
                      fontWeight: 600,
                    }}
                  >
                    {dayLabels[index]}
                  </span>
                  <div style={flameStyle}>{isLit ? '🔥' : null}</div>
                </div>
              )
            })}
          </div>
        </div>
      </div>
    </>
  )
}
