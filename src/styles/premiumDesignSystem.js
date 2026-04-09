// Premium Design System for AbidingAnchor
export const premiumColors = {
  gold: '#D4A843',
  goldLight: '#F4D03F',
  goldDark: '#B8860B',
  navy: '#0d1f4e',
  navyDark: '#0a1638',
  skyMorning: '#87CEEB',
  skyDay: '#4A90E2',
  skySunset: '#FF6B6B',
  skyNight: '#0C1445',
  white: '#FFFFFF',
  whiteTransparent: 'rgba(255, 255, 255, 0.9)',
  glass: 'rgba(255, 255, 255, 0.08)',
  glassBorder: 'rgba(255, 255, 255, 0.15)',
  textPrimary: '#FFFFFF',
  textSecondary: 'rgba(255, 255, 255, 0.8)',
  textMuted: 'rgba(255, 255, 255, 0.6)',
  shadow: 'rgba(0, 0, 0, 0.25)',
  glow: 'rgba(212, 168, 67, 0.3)'
}

export const glassmorphism = {
  background: premiumColors.glass,
  backdropFilter: 'blur(20px)',
  WebkitBackdropFilter: 'blur(20px)',
  border: `1px solid ${premiumColors.glassBorder}`,
  boxShadow: `0 8px 32px ${premiumColors.shadow}`
}

export const premiumCard = {
  ...glassmorphism,
  borderRadius: '20px',
  padding: '24px',
  transition: 'all 0.3s ease',
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 12px 40px ${premiumColors.shadow}`
  }
}

export const premiumButton = {
  background: `linear-gradient(135deg, ${premiumColors.gold} 0%, ${premiumColors.goldLight} 100%)`,
  color: premiumColors.navy,
  border: 'none',
  borderRadius: '50px',
  padding: '12px 24px',
  fontWeight: '600',
  fontSize: '14px',
  cursor: 'pointer',
  transition: 'all 0.3s ease',
  boxShadow: `0 4px 15px ${premiumColors.glow}`,
  '&:hover': {
    transform: 'translateY(-2px)',
    boxShadow: `0 6px 20px ${premiumColors.glow}`,
    background: `linear-gradient(135deg, ${premiumColors.goldLight} 0%, ${premiumColors.gold} 100%)`
  },
  '&:active': {
    transform: 'translateY(0px)'
  }
}

export const typography = {
  h1: {
    fontSize: '32px',
    fontWeight: '700',
    color: premiumColors.textPrimary,
    marginBottom: '16px',
    textShadow: '0 2px 8px rgba(0,0,0,0.3)'
  },
  h2: {
    fontSize: '24px',
    fontWeight: '600',
    color: premiumColors.textPrimary,
    marginBottom: '12px',
    textShadow: '0 1px 4px rgba(0,0,0,0.2)'
  },
  h3: {
    fontSize: '20px',
    fontWeight: '600',
    color: premiumColors.textPrimary,
    marginBottom: '8px'
  },
  body: {
    fontSize: '16px',
    color: premiumColors.textSecondary,
    lineHeight: '1.6',
    marginBottom: '12px'
  },
  caption: {
    fontSize: '14px',
    color: premiumColors.textMuted,
    lineHeight: '1.4'
  },
  small: {
    fontSize: '12px',
    color: premiumColors.textMuted,
    lineHeight: '1.3'
  }
}

export const animations = {
  fadeIn: {
    animation: 'fadeIn 0.6s ease-in-out'
  },
  slideUp: {
    animation: 'slideUp 0.5s ease-out'
  },
  slideIn: {
    animation: 'slideIn 0.4s ease-out'
  },
  pulse: {
    animation: 'pulse 2s infinite'
  },
  float: {
    animation: 'float 6s ease-in-out infinite'
  }
}

export const spacing = {
  xs: '4px',
  sm: '8px',
  md: '16px',
  lg: '24px',
  xl: '32px',
  xxl: '48px'
}

export const breakpoints = {
  mobile: '480px',
  tablet: '768px',
  desktop: '1024px',
  wide: '1440px'
}

// CSS-in-JS animation keyframes
export const keyframes = `
  @keyframes fadeIn {
    from { opacity: 0; }
    to { opacity: 1; }
  }
  
  @keyframes slideUp {
    from { 
      opacity: 0; 
      transform: translateY(20px); 
    }
    to { 
      opacity: 1; 
      transform: translateY(0); 
    }
  }
  
  @keyframes slideIn {
    from { 
      opacity: 0; 
      transform: translateX(-20px); 
    }
    to { 
      opacity: 1; 
      transform: translateX(0); 
    }
  }
  
  @keyframes pulse {
    0%, 100% { opacity: 1; }
    50% { opacity: 0.7; }
  }
  
  @keyframes float {
    0%, 100% { transform: translateY(0px); }
    50% { transform: translateY(-10px); }
  }
  
  @keyframes shimmer {
    0% { background-position: -200% 0; }
    100% { background-position: 200% 0; }
  }
`

export const premiumGradients = {
  gold: `linear-gradient(135deg, ${premiumColors.gold} 0%, ${premiumColors.goldLight} 100%)`,
  goldReverse: `linear-gradient(135deg, ${premiumColors.goldLight} 0%, ${premiumColors.gold} 100%)`,
  sky: `linear-gradient(180deg, ${premiumColors.skyDay} 0%, ${premiumColors.skyMorning} 100%)`,
  sunset: `linear-gradient(180deg, ${premiumColors.skySunset} 0%, ${premiumColors.gold} 100%)`,
  night: `linear-gradient(180deg, ${premiumColors.skyNight} 0%, ${premiumColors.navy} 100%)`
}

export const premiumShadows = {
  soft: `0 4px 16px ${premiumColors.shadow}`,
  medium: `0 8px 32px ${premiumColors.shadow}`,
  large: `0 16px 64px ${premiumColors.shadow}`,
  gold: `0 4px 20px ${premiumColors.glow}`,
  goldLarge: `0 8px 32px ${premiumColors.glow}`
}
