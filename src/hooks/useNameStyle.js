import { useMemo } from 'react'

const SHIMMER_KEYFRAMES = `
  @keyframes shimmer-gold {
    0%   { background-position: 200% center; }
    100% { background-position: -200% center; }
  }
`

export function useNameStyle(supporterTier) {
  return useMemo(() => {
    const isDayTheme = document.documentElement.getAttribute('data-theme') === 'day' ||
                       document.body.classList.contains('theme-day') ||
                       document.body.classList.contains('theme-morning') ||
                       document.body.classList.contains('theme-afternoon');

    if (supporterTier === 'lifetime') {
      return {
        background: 'linear-gradient(90deg, #8B6200, #D4A843, #FFE08A, #D4A843, #8B6200)',
        backgroundSize: '200% auto',
        WebkitBackgroundClip: 'text',
        WebkitTextFillColor: 'transparent',
        backgroundClip: 'text',
        animation: 'shimmer-gold 1.5s linear infinite',
      }
    } else if (supporterTier === 'monthly') {
      return {
        color: isDayTheme ? '#4A4A6A' : '#93c5fd',
      }
    } else {
      return {
        color: isDayTheme ? '#B8860B' : 'rgba(255,255,255,0.9)',
      }
    }
  }, [supporterTier])
}

export { SHIMMER_KEYFRAMES }
