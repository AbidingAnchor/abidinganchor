import { useMemo } from 'react'

const SHIMMER_KEYFRAMES = `
  @keyframes shimmer-gold {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
`

export function useNameStyle(supporterTier) {
  return useMemo(() => {
    if (supporterTier === 'lifetime') {
      return {
        background: 'linear-gradient(90deg, #b8860b, #ffd700, #ffec8b, #ffd700, #b8860b)',
        backgroundSize: '200%',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'shimmer-gold 2s infinite linear',
      }
    } else if (supporterTier === 'monthly') {
      return {
        color: '#93c5fd',
      }
    } else {
      return {
        color: 'rgba(255,255,255,0.9)',
      }
    }
  }, [supporterTier])
}

export { SHIMMER_KEYFRAMES }
