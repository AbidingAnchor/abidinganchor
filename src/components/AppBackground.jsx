import { useEffect, useState } from 'react'

// Generate stars once at module level
const NIGHT_STARS = Array.from({ length: 50 }).map(() => ({
  width: Math.random() * 2 + 1,
  height: Math.random() * 2 + 1,
  top: Math.random() * 70,
  left: Math.random() * 100,
  opacity: Math.random() * 0.5 + 0.3,
  duration: Math.random() * 3 + 2
}))

function getTimePeriod(hour) {
  if (hour >= 20 || hour < 5) return 'night'
  if (hour >= 5 && hour < 11) return 'morning'
  if (hour >= 11 && hour < 17) return 'day'
  return 'sunset'
}

function getGradientForPeriod(period) {
  switch (period) {
    case 'night':
      return 'linear-gradient(to bottom, #060f26, #0a1a3e)'
    case 'morning':
      return 'linear-gradient(to bottom, #1a1a2e, #ff6b35, #ffa552)'
    case 'day':
      return 'linear-gradient(to bottom, #1a3a5c, #2e6b9e, #4a9edd)'
    case 'sunset':
      return 'linear-gradient(to bottom, #0d0d1a, #4a1942, #c0392b, #e67e22)'
    default:
      return 'linear-gradient(to bottom, #060f26, #0a1a3e)'
  }
}

export default function AppBackground() {
  const [timePeriod, setTimePeriod] = useState(() => getTimePeriod(new Date().getHours()))

  useEffect(() => {
    const interval = setInterval(() => {
      const hour = new Date().getHours()
      const newPeriod = getTimePeriod(hour)
      setTimePeriod(newPeriod)
    }, 60000) // Update every 60 seconds

    return () => clearInterval(interval)
  }, [])

  const gradient = getGradientForPeriod(timePeriod)
  const isNight = timePeriod === 'night'

  return (
    <>
      <style>{`
        @keyframes twinkle {
          0%, 100% { opacity: 0.3; }
          50% { opacity: 0.8; }
        }
      `}</style>
      <div
        style={{
          position: 'fixed',
          inset: 0,
          zIndex: -1,
          background: gradient,
          pointerEvents: 'none'
        }}
        aria-hidden="true"
      >
        {/* Stars and Moon - Only render during night */}
        {isNight && (
          <>
            {/* Stars */}
            {NIGHT_STARS.map((star, i) => (
              <div
                key={i}
                style={{
                  position: 'absolute',
                  width: star.width,
                  height: star.height,
                  background: '#fff',
                  borderRadius: '50%',
                  top: `${star.top}%`,
                  left: `${star.left}%`,
                  opacity: star.opacity,
                  animation: `twinkle ${star.duration}s ease-in-out infinite`,
                  zIndex: 1
                }}
              />
            ))}
            
            {/* Moon */}
            <div style={{
              position: 'absolute',
              top: '8%',
              right: '10%',
              width: '50px',
              height: '50px',
              background: 'radial-gradient(circle at 30% 30%, #fffbe6 0%, #f0d060 100%)',
              borderRadius: '50%',
              boxShadow: '0 0 30px rgba(255, 230, 160, 0.6), 0 0 60px rgba(255, 230, 160, 0.3)',
              zIndex: 1
            }} />
          </>
        )}
      </div>
    </>
  )
}
