const CONTENT_FONTS = {
  serif: "'Georgia', Georgia, 'Times New Roman', serif",
  modern: "'Inter', system-ui, -apple-system, sans-serif",
  elegant: "'Cinzel', Georgia, serif",
  handwritten: "ui-serif, 'Segoe Print', 'Segoe Script', 'Brush Script MT', cursive",
}

const TEXT_COLOR_CHOICES = {
  white: '#FFFFFF',
  gold: '#D4A843',
  cream: '#FFF8E7',
  dark: '#1a1a1a',
  red: '#E53E3E',
  blue: '#3B82F6',
  purple: '#8B5CF6',
  green: '#10B981',
  pink: '#EC4899',
  orange: '#F97316',
}

/** Dark card styles — crisp type, no glow; verse/reflection white, citation gold */
const DARK_THEME = new Set(['celestial', 'midnight', 'scripture', 'forest', 'ocean'])
const DARK_VERSE_REFLECTION_COLOR = '#FFFFFF'
const DARK_REFERENCE_GOLD = '#C9A84C'

const BASE_TEXT_SHADOW = '0 2px 4px rgba(0,0,0,0.9)'

function textShadowForColorChoice(textColorChoice) {
  switch (textColorChoice) {
    case 'gold':
      return '0 0 20px rgba(212,168,67,0.9), 0 2px 4px rgba(0,0,0,0.9)'
    case 'dark':
      return '0 0 3px #fff, 0 2px 4px rgba(0,0,0,0.9)'
    case 'cream':
      return '0 0 15px rgba(255,248,231,0.8), 0 2px 4px rgba(0,0,0,0.9)'
    case 'red':
      return '0 0 20px rgba(229,62,62,0.9), 0 2px 4px rgba(0,0,0,0.9)'
    case 'blue':
      return '0 0 20px rgba(59,130,246,0.9), 0 2px 4px rgba(0,0,0,0.9)'
    case 'purple':
      return '0 0 20px rgba(139,92,246,0.9), 0 2px 4px rgba(0,0,0,0.9)'
    case 'green':
      return '0 0 20px rgba(16,185,129,0.9), 0 2px 4px rgba(0,0,0,0.9)'
    case 'pink':
      return '0 0 20px rgba(236,72,153,0.9), 0 2px 4px rgba(0,0,0,0.9)'
    case 'orange':
      return '0 0 20px rgba(249,115,22,0.9), 0 2px 4px rgba(0,0,0,0.9)'
    case 'white':
    default:
      return BASE_TEXT_SHADOW
  }
}

export default function FaithCard({
  verseReference = '',
  verseText = '',
  userReflection = '',
  cardStyle = 'celestial',
  contentFont = 'serif',
  textColorChoice = null,
}) {
  const bodyFont = CONTENT_FONTS[contentFont] ?? CONTENT_FONTS.serif

  const getCardStyle = () => {
    switch (cardStyle) {
      case 'celestial':
        return {
          background: 'radial-gradient(ellipse at top, #1e3a6e 0%, #162955 50%, #0d1f3c 100%)',
          starOpacity: 0.6,
          borderColor: '#D4A843',
          borderWidth: '4px',
          textColor: '#FFFFFF',
          accentColor: '#D4A843',
          showStars: true,
        }
      case 'dawn':
        return {
          background: 'linear-gradient(135deg, #2d1b69 0%, #5a2d82 40%, #c2773a 80%, #e8a84e 100%)',
          starOpacity: 0,
          borderColor: '#D4A843',
          borderWidth: '4px',
          textColor: '#FFFFFF',
          accentColor: '#D4A843',
          showStars: false,
        }
      case 'scripture':
        return {
          background: 'linear-gradient(180deg, #2d6a4f 0%, #1e4d35 100%)',
          starOpacity: 0,
          borderColor: '#D4A843',
          borderWidth: '4px',
          textColor: '#FFFFFF',
          accentColor: '#D4A843',
          showStars: false,
        }
      case 'ember':
        return {
          background: 'linear-gradient(135deg, #1c1917 0%, #3b0f0f 50%, #450a0a 100%)',
          starOpacity: 0,
          borderColor: '#ef4444',
          borderWidth: '2px',
          textColor: '#FFFFFF',
          accentColor: '#fca5a5',
          showStars: false,
        }
      case 'golden':
        return {
          background: 'linear-gradient(165deg, #fff5e6 0%, #ffd89b 38%, #e8a84e 72%, #c77d2a 100%)',
          starOpacity: 0,
          borderColor: '#B8860B',
          borderWidth: '4px',
          textColor: '#1a1a1a',
          accentColor: '#8B6914',
          showStars: false,
        }
      case 'ocean':
        return {
          background: 'linear-gradient(180deg, #1a3a6e 0%, #1e6091 50%, #1a8a7a 100%)',
          starOpacity: 0,
          borderColor: '#5eead4',
          borderWidth: '4px',
          textColor: '#FFFFFF',
          accentColor: '#5eead4',
          showStars: false,
        }
      case 'rose':
        return {
          background: 'linear-gradient(170deg, #fffdfb 0%, #fce7f3 40%, #fbcfe8 75%, #f9a8d4 100%)',
          starOpacity: 0,
          borderColor: '#db2777',
          borderWidth: '4px',
          textColor: '#4a044e',
          accentColor: '#be185d',
          showStars: false,
        }
      case 'forest':
        return {
          background: 'linear-gradient(180deg, #2d6a4f 0%, #3d8b6f 60%, #2a5c44 100%)',
          starOpacity: 0,
          borderColor: '#a3b18a',
          borderWidth: '4px',
          textColor: '#FFFFFF',
          accentColor: '#c9a227',
          showStars: false,
        }
      default:
        return {
          background: 'radial-gradient(ellipse at top, #1e3a6e 0%, #162955 50%, #0d1f3c 100%)',
          starOpacity: 0.6,
          borderColor: '#D4A843',
          borderWidth: '4px',
          textColor: '#FFFFFF',
          accentColor: '#D4A843',
          showStars: true,
        }
    }
  }

  const baseStyle = getCardStyle()
  const pickedTextColor =
    textColorChoice && TEXT_COLOR_CHOICES[textColorChoice]
      ? TEXT_COLOR_CHOICES[textColorChoice]
      : null

  const isDarkTheme = DARK_THEME.has(cardStyle)
  const previewTextShadow = isDarkTheme ? 'none' : textShadowForColorChoice(textColorChoice)
  const darkFontWeight = isDarkTheme ? 700 : undefined

  /** When user picks a color, verse, reference, and reflection all use it; otherwise theme defaults. */
  const verseReflectionColor = pickedTextColor
    ?? (isDarkTheme ? DARK_VERSE_REFLECTION_COLOR : baseStyle.textColor)
  const referenceColor = pickedTextColor
    ?? (isDarkTheme ? DARK_REFERENCE_GOLD : baseStyle.textColor)

  const currentStyle = { ...baseStyle, textColor: pickedTextColor ?? baseStyle.textColor }

  /** Custom properties so [data-theme="day"] p { color !important } cannot override preview text */
  const faithCardCssVars = {
    '--faith-reference': referenceColor,
    '--faith-body': verseReflectionColor,
    '--faith-accent': currentStyle.accentColor,
  }

  return (
    <div 
      data-faith-card
      style={{
        width: '1080px',
        height: '1080px',
        background: currentStyle.background,
        border: `${currentStyle.borderWidth}px solid ${currentStyle.borderColor}`,
        borderRadius: '24px',
        padding: '60px',
        position: 'relative',
        overflow: 'hidden',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
        ...faithCardCssVars,
      }}
    >
      {/* Star texture overlay - only for Celestial theme */}
      {currentStyle.showStars && (
        <div style={{
          position: 'absolute',
          inset: 0,
          backgroundImage: 'radial-gradient(2px 2px at 20% 30%, rgba(255,255,255,0.3), transparent), radial-gradient(2px 2px at 60% 70%, rgba(255,255,255,0.2), transparent), radial-gradient(1px 1px at 50% 50%, rgba(255,255,255,0.3), transparent), radial-gradient(1px 1px at 80% 10%, rgba(255,255,255,0.2), transparent), radial-gradient(2px 2px at 90% 60%, rgba(255,255,255,0.15), transparent), radial-gradient(1px 1px at 33% 85%, rgba(255,255,255,0.25), transparent), radial-gradient(1px 1px at 15% 45%, rgba(255,255,255,0.2), transparent), radial-gradient(2px 2px at 75% 35%, rgba(255,255,255,0.15), transparent)',
          backgroundSize: '200px 200px',
          backgroundPosition: '0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0, 0 0',
          opacity: currentStyle.starOpacity,
          pointerEvents: 'none',
        }} />
      )}

      {cardStyle === 'midnight' && (
        <div
          style={{
            position: 'absolute',
            inset: 0,
            borderRadius: '24px',
            zIndex: 0,
            pointerEvents: 'none',
            backgroundImage: `
              radial-gradient(ellipse 100% 85% at 22% 18%, rgba(255,255,255,0.05), transparent 58%),
              radial-gradient(ellipse 90% 75% at 78% 82%, rgba(255,255,255,0.05), transparent 55%),
              radial-gradient(ellipse 55% 45% at 50% 48%, rgba(255,255,255,0.04), transparent 72%),
              radial-gradient(1px 1px at 35% 40%, rgba(255,255,255,0.06), transparent),
              radial-gradient(1px 1px at 62% 58%, rgba(255,255,255,0.05), transparent)
            `,
          }}
        />
      )}

      <div
        style={{
          position: 'relative',
          zIndex: 1,
          flex: 1,
          width: '100%',
          minHeight: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        {/* Top watermark */}
        <div style={{
          textAlign: 'center',
          marginTop: '20px',
        }}>
          <p
            className="faith-preview-text-accent"
            style={{
              fontFamily: CONTENT_FONTS.elegant,
              fontSize: '28px',
              fontWeight: 700,
              color: currentStyle.accentColor,
              letterSpacing: '0.15em',
              textTransform: 'uppercase',
              margin: 0,
              textShadow: previewTextShadow,
            }}
          >
            🕊️ AbidingAnchor
          </p>
        </div>

        {/* Main content */}
        <div style={{
          textAlign: 'center',
          maxWidth: '900px',
          flex: 1,
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'center',
          alignItems: 'center',
          padding: '40px 0',
        }}>
          {/* Verse reference */}
          {verseReference && (
            <p
              className="faith-preview-text-ref"
              style={{
                fontFamily: bodyFont,
                fontSize: '48px',
                fontStyle: contentFont === 'elegant' ? 'normal' : 'italic',
                fontWeight: darkFontWeight,
                color: referenceColor,
                marginBottom: '40px',
                textShadow: previewTextShadow,
              }}
            >
              {verseReference}
            </p>
          )}

          {/* Verse text */}
          {verseText && (
            <p
              className="faith-preview-text-body"
              style={{
                fontFamily: bodyFont,
                fontSize: '54px',
                fontWeight: isDarkTheme ? 700 : (contentFont === 'modern' ? 600 : 500),
                color: verseReflectionColor,
                lineHeight: '1.5',
                marginBottom: '50px',
                textShadow: previewTextShadow,
              }}
            >
              {verseText}
            </p>
          )}

          {/* Gold divider line */}
          <div style={{
            width: '200px',
            height: '2px',
            background: `linear-gradient(90deg, transparent, ${currentStyle.accentColor}, transparent)`,
            margin: '20px 0',
            boxShadow: isDarkTheme ? 'none' : '0 0 10px rgba(212, 168, 67, 0.5)',
          }} />

          {/* User reflection/prayer */}
          {userReflection && (
            <p
              className="faith-preview-text-body"
              style={{
                fontFamily: bodyFont,
                fontSize: '40px',
                fontStyle: contentFont === 'elegant' ? 'normal' : 'italic',
                fontWeight: darkFontWeight,
                color: verseReflectionColor,
                lineHeight: '1.6',
                maxWidth: '800px',
                textShadow: previewTextShadow,
              }}
            >
              {userReflection}
            </p>
          )}
        </div>

        {/* Bottom watermark */}
        <div style={{
          textAlign: 'center',
          marginBottom: '20px',
        }}>
        </div>
      </div>

      {/* Decorative corner accents - only show for non-midnight themes */}
      {cardStyle !== 'midnight' && (
        <>
          <div style={{
            position: 'absolute',
            top: '20px',
            left: '20px',
            width: '60px',
            height: '60px',
            borderTop: `${currentStyle.borderWidth}px solid ${currentStyle.borderColor}`,
            borderLeft: `${currentStyle.borderWidth}px solid ${currentStyle.borderColor}`,
            borderTopLeftRadius: '16px',
            opacity: 0.6,
          }} />
          <div style={{
            position: 'absolute',
            top: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderTop: `${currentStyle.borderWidth}px solid ${currentStyle.borderColor}`,
            borderRight: `${currentStyle.borderWidth}px solid ${currentStyle.borderColor}`,
            borderTopRightRadius: '16px',
            opacity: 0.6,
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20px',
            left: '20px',
            width: '60px',
            height: '60px',
            borderBottom: `${currentStyle.borderWidth}px solid ${currentStyle.borderColor}`,
            borderLeft: `${currentStyle.borderWidth}px solid ${currentStyle.borderColor}`,
            borderBottomLeftRadius: '16px',
            opacity: 0.6,
          }} />
          <div style={{
            position: 'absolute',
            bottom: '20px',
            right: '20px',
            width: '60px',
            height: '60px',
            borderBottom: `${currentStyle.borderWidth}px solid ${currentStyle.borderColor}`,
            borderRight: `${currentStyle.borderWidth}px solid ${currentStyle.borderColor}`,
            borderBottomRightRadius: '16px',
            opacity: 0.6,
          }} />
        </>
      )}
    </div>
  )
}
