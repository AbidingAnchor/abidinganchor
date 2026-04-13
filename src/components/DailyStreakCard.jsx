import { useTranslation } from 'react-i18next'
import { WEEK_DAY_SHORT } from '../hooks/useStreakTracker'

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

  return (
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
          <p
            className="flex items-center gap-1.5"
            style={{ fontSize: '14px', color: 'var(--section-title)', fontWeight: 700 }}
          >
            <span style={{ fontSize: '20px', lineHeight: 1 }} aria-hidden>
              🔥
            </span>
            <span>{t('home.dayStreak', { n: streakCount })}</span>
          </p>
        </div>
        <p style={{ marginBottom: '16px', fontSize: '13px', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
          {streakMessage}
        </p>
        <div className="flex items-center justify-between gap-2" style={{ overflowX: 'auto' }}>
          {WEEK_DAY_SHORT.map((key, index) => {
            const isLit = set.has(key)
            const unlitStyle = {
              width: '28px',
              height: '28px',
              borderRadius: '50%',
              background: 'rgba(150,150,150,0.25)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              flexShrink: 0,
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
                {isLit ? (
                  <span style={{ fontSize: '22px', lineHeight: 1 }} aria-hidden>
                    🔥
                  </span>
                ) : (
                  <div style={unlitStyle} />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
