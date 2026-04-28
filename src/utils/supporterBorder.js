export function getAvatarBorderStyle(supporterTier, profileBorder) {
  if (!supporterTier || supporterTier === 'free') return {}

  if (supporterTier === 'monthly') {
    return {
      boxShadow: '0 0 10px 3px rgba(147, 197, 253, 0.6)',
      animation: 'supporter-pulse-blue 2s infinite',
    }
  }

  if (supporterTier === 'lifetime') {
    switch (profileBorder) {
      case 'none':
        return {}
      case 'crown':
        return { boxShadow: '0 0 12px 4px rgba(255, 215, 0, 0.7)', animation: 'supporter-pulse-gold 2s infinite' }
      case 'fire':
        return { boxShadow: '0 0 12px 4px rgba(255, 100, 30, 0.7)', animation: 'supporter-pulse-fire 2s infinite' }
      case 'rainbow':
        return { animation: 'supporter-rainbow-border 3s infinite' }
      case 'stars':
        return { boxShadow: '0 0 12px 4px rgba(200, 150, 255, 0.7)', animation: 'supporter-pulse-stars 2s infinite' }
      default:
        return { boxShadow: '0 0 12px 4px rgba(255, 215, 0, 0.7)', animation: 'supporter-pulse-gold 2s infinite' }
    }
  }

  return {}
}

export const SUPPORTER_BORDER_KEYFRAMES = `
  @keyframes supporter-pulse-blue {
    0%, 100% { box-shadow: 0 0 10px 3px rgba(147, 197, 253, 0.6); }
    50% { box-shadow: 0 0 20px 6px rgba(147, 197, 253, 0.9); }
  }
  @keyframes supporter-pulse-gold {
    0%, 100% { box-shadow: 0 0 10px 3px rgba(255, 215, 0, 0.6); }
    50% { box-shadow: 0 0 20px 6px rgba(255, 215, 0, 0.9); }
  }
  @keyframes supporter-pulse-fire {
    0%, 100% { box-shadow: 0 0 10px 3px rgba(255, 100, 30, 0.6); }
    50% { box-shadow: 0 0 20px 6px rgba(255, 100, 30, 0.9); }
  }
  @keyframes supporter-rainbow-border {
    0%   { box-shadow: 0 0 0 3px hsl(0, 100%, 60%); }
    16%  { box-shadow: 0 0 0 3px hsl(60, 100%, 60%); }
    33%  { box-shadow: 0 0 0 3px hsl(120, 100%, 60%); }
    50%  { box-shadow: 0 0 0 3px hsl(180, 100%, 60%); }
    66%  { box-shadow: 0 0 0 3px hsl(240, 100%, 60%); }
    83%  { box-shadow: 0 0 0 3px hsl(300, 100%, 60%); }
    100% { box-shadow: 0 0 0 3px hsl(360, 100%, 60%); }
  }
  @keyframes supporter-pulse-stars {
    0%, 100% { box-shadow: 0 0 10px 3px rgba(200, 150, 255, 0.6); }
    50% { box-shadow: 0 0 20px 6px rgba(200, 150, 255, 0.9); }
  }
`
