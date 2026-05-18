import { useTranslation } from 'react-i18next'
import { WEEK_DAY_SHORT } from '../hooks/useStreakTracker'

/**
 * @param {object} props
 * @param {string[]} props.activeDays Short names present this week (e.g. 'Mon', 'Tue')
 * @param {number} [props.consecutiveStreak] Consecutive calendar-day streak from profiles.reading_streak.
 */
export default function DailyStreakCard({ activeDays = [], consecutiveStreak }) {
  const { t } = useTranslation()
  const dayLabels = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat']

  const today = new Date()
  const dayOfWeek = today.getDay()
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - dayOfWeek)
  sunday.setHours(0, 0, 0, 0)

  const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sunday)
    date.setDate(sunday.getDate() + i)
    return date
  })

  const todayIndex = dayOfWeek

  const isDateActive = (date) => {
    const dayName = WEEK_DAY_SHORT[date.getDay()]
    const dateStr = date.toISOString().split('T')[0]
    const todayStr = today.toISOString().split('T')[0]
    return activeDays.includes(dayName) && dateStr <= todayStr
  }

  const calculateConsecutiveStreak = () => {
    if (dayOfWeek === 0) return 0

    let streak = 0
    for (let i = todayIndex; i >= 0; i--) {
      const date = weekDates[i]
      const dayName = WEEK_DAY_SHORT[date.getDay()]
      if (activeDays.includes(dayName)) streak++
      else break
    }
    return streak
  }

  const streakCount = Number.isFinite(Number(consecutiveStreak))
    ? Math.max(0, Number(consecutiveStreak))
    : calculateConsecutiveStreak()
  const streakMessage =
    streakCount === 0
      ? t('home.streakSubZero')
      : t('home.streakDay', { n: streakCount })

  return (
    <div
      className="home-gold-glass"
      style={{
        borderRadius: '24px',
      }}
    >
      <div
        className=""
        style={{
          padding: '24px',
          background: 'transparent',
          animation: 'fadeInUp 0.6s ease forwards',
          animationDelay: '0.2s',
        }}
      >
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2
            style={{
              color: 'rgba(251, 191, 36, 0.86)',
              fontSize: '12px',
              letterSpacing: '0.18em',
              fontWeight: 700,
              textTransform: 'uppercase',
              margin: 0,
            }}
          >
            {t('home.dailyStreak')}
          </h2>
          <p
            className="flex items-center gap-1.5"
            style={{
              fontSize: '13px',
              color: '#fbbf24',
              fontWeight: 800,
              margin: 0,
              border: '1px solid rgba(251, 191, 36, 0.35)',
              borderRadius: '999px',
              padding: '6px 10px',
              background: 'transparent',
            }}
          >
            <span style={{ fontSize: '16px', lineHeight: 1 }} aria-hidden>
              🔥
            </span>
            <span>{t('home.dayStreak', { n: streakCount })}</span>
          </p>
        </div>
        <p style={{ marginBottom: '18px', fontSize: '13px', color: 'rgba(229, 231, 235, 0.72)', lineHeight: 1.5 }}>
          {streakMessage}
        </p>
        <div className="flex items-center" style={{ justifyContent: 'space-between', flexWrap: 'nowrap', overflowX: 'auto', gap: '8px' }}>
          {weekDates.map((date, index) => {
            const isLit = isDateActive(date)

            return (
              <div
                key={date.toISOString()}
                style={{
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  minWidth: '34px',
                }}
              >
                <span
                  style={{
                    color: isLit ? 'rgba(251, 191, 36, 0.8)' : 'rgba(255,255,255,0.45)',
                    fontSize: '10px',
                    fontWeight: 600,
                  }}
                >
                  {dayLabels[index]}
                </span>
                <div
                  style={{
                    width: '30px',
                    height: '30px',
                    borderRadius: '50%',
                    background: isLit ? 'linear-gradient(135deg, #f59e0b 0%, #ca8a04 100%)' : 'transparent',
                    border: isLit ? '1px solid rgba(251, 191, 36, 0.5)' : '1px solid rgba(255, 255, 255, 0.2)',
                    boxShadow: isLit ? '0 0 18px rgba(245, 158, 11, 0.35)' : 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    flexShrink: 0,
                  }}
                >
                  {isLit ? (
                    <span style={{ fontSize: '12px', lineHeight: 1, color: '#111827', fontWeight: 800 }} aria-hidden>
                      ✓
                    </span>
                  ) : null}
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
