import { useTranslation } from 'react-i18next'
import { WEEK_DAY_SHORT } from '../hooks/useStreakTracker'

/**
 * @param {object} props
 * @param {string[]} props.activeDays Short names present this week (e.g. 'Mon', 'Tue')
 * @param {number} [props.consecutiveStreak] Consecutive calendar-day streak from profiles.reading_streak (preferred over activeDays.length for the counter)
 */
export default function DailyStreakCard({ activeDays = [], consecutiveStreak }) {
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

  const streakCount =
    typeof consecutiveStreak === 'number' && Number.isFinite(consecutiveStreak)
      ? Math.max(0, Math.floor(consecutiveStreak))
      : activeDays.length
  const streakMessage =
    streakCount === 0
      ? t('home.streakSubZero')
      : t('home.streakDay', { n: streakCount })

  const set = new Set(activeDays)
  const todayIndex = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1

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
            const isToday = index === todayIndex

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
                    color: 'rgba(255,255,255,0.5)',
                    fontSize: '11px',
                    fontWeight: 600,
                  }}
                >
                  {dayLabels[index]}
                </span>
                {isLit ? (
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: '#D4A843',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  >
                    <span style={{ fontSize: '16px', lineHeight: 1, color: 'white' }} aria-hidden>
                      ✓
                    </span>
                  </div>
                ) : isToday ? (
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'transparent',
                      border: '2px solid #D4A843',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: '36px',
                      height: '36px',
                      borderRadius: '50%',
                      background: 'rgba(255,255,255,0.08)',
                      display: 'flex',
                      alignItems: 'center',
                      justifyContent: 'center',
                      flexShrink: 0,
                    }}
                  />
                )}
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}
