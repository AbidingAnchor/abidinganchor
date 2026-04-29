import { useTranslation } from 'react-i18next'
import { WEEK_DAY_SHORT } from '../hooks/useStreakTracker'

/**
 * @param {object} props
 * @param {string[]} props.activeDays Short names present this week (e.g. 'Mon', 'Tue')
 * @param {number} [props.consecutiveStreak] Consecutive calendar-day streak from profiles.reading_streak (preferred over activeDays.length for the counter)
 */
export default function DailyStreakCard({ activeDays = [], consecutiveStreak }) {
  const { t } = useTranslation()

  // Week starts on Sunday: Sun, Mon, Tue, Wed, Thu, Fri, Sat
  const dayLabels = [
    t('home.weekdaySun'),
    t('home.weekdayMon'),
    t('home.weekdayTue'),
    t('home.weekdayWed'),
    t('home.weekdayThu'),
    t('home.weekdayFri'),
    t('home.weekdaySat'),
  ]

  // Calculate the current week starting from the most recent Sunday
  const today = new Date()
  const dayOfWeek = today.getDay() // 0=Sun, 6=Sat
  const sunday = new Date(today)
  sunday.setDate(today.getDate() - dayOfWeek)
  sunday.setHours(0, 0, 0, 0)

  // Get the actual date for each day of this week (0=Sun to 6=Sat)
 const weekDates = Array.from({ length: 7 }, (_, i) => {
    const date = new Date(sunday)
    date.setDate(sunday.getDate() + i)
    return date
  })

  // Get today's index in Sunday-started week (0=Sun, 6=Sat)
  const todayIndex = dayOfWeek

  // Check if a specific date is in the active days (by date string)
  // Also prevents future days from showing as gold
  const isDateActive = (date) => {
    const dayName = WEEK_DAY_SHORT[date.getDay()] // 'Sun', 'Mon', etc.
    const dateStr = date.toISOString().split('T')[0] // YYYY-MM-DD
    const todayStr = today.toISOString().split('T')[0] // YYYY-MM-DD
    
    // Only show as active if:
    // 1. The day name is in activeDays
    // 2. The date is not in the future
    // 3. If it's today, it's allowed to be active
    const isNotFuture = dateStr <= todayStr
    return activeDays.includes(dayName) && isNotFuture
  }

  // Calculate consecutive streak starting from most recent active day going backwards
  // Streak resets to 0 on Sunday at midnight, and also resets if a day is missed
  const calculateConsecutiveStreak = () => {
    // Reset to 0 on Sunday (new week starts)
    if (dayOfWeek === 0) { // Sunday
      return 0
    }

    // Count consecutive days going backwards from today
    // Only break if a day is NOT active (gap in streak)
    let streak = 0
    for (let i = todayIndex; i >= 0; i--) {
      const date = weekDates[i]
      const dayName = WEEK_DAY_SHORT[date.getDay()]
      const isActive = activeDays.includes(dayName)
      
      if (isActive) {
        streak++
      } else {
        // Gap found, stop counting
        break
      }
    }
    return streak
  }

  const streakCount = calculateConsecutiveStreak()
  const streakMessage =
    streakCount === 0
      ? t('home.streakSubZero')
      : t('home.streakDay', { n: streakCount })

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
          {weekDates.map((date, index) => {
            const isLit = isDateActive(date)
            const isToday = index === todayIndex

            return (
              <div
                key={index}
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
                      background: 'transparent',
                      border: '2px solid #D4A843',
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
