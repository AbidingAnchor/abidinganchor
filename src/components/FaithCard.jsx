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
}

export default function FaithCard({
  verseReference = '',
  verseText = '',
  userReflection = '',
  scale = 0.25,
  cardStyle = 'celestial',
  contentFont = 'serif',
  textColorChoice = 'white',
}) {
  const bodyFont = CONTENT_FONTS[contentFont] ?? CONTENT_FONTS.serif
  const userTextColor = TEXT_COLOR_CHOICES[textColorChoice] ?? TEXT_COLOR_CHOICES.white

  const getCardStyle = () => {
    switch (cardStyle) {
      case 'celestial':
        return {
          background: 'radial-gradient(ellipse at top, #0f1729 0%, #070d1a 100%)',
          starOpacity: 0.6,
          borderColor: '#D4A843',
          borderWidth: '4px',
          textColor: '#FFFFFF',
          accentColor: '#D4A843',
          showStars: true,
        }
      case 'dawn':
        return {
          background: 'linear-gradient(135deg, #1a0533 0%, #3d1a6e 50%, #D4A843 100%)',
          starOpacity: 0,
          borderColor: '#D4A843',
          borderWidth: '4px',
          textColor: '#FFFFFF',
          accentColor: '#D4A843',
          showStars: false,
        }
      case 'scripture':
        return {
          background: 'linear-gradient(180deg, #0d1f0f 0%, #1a3d1e 100%)',
          starOpacity: 0,
          borderColor: '#D4A843',
          borderWidth: '4px',
          textColor: '#F5F5DC',
          accentColor: '#D4A843',
          showStars: false,
        }
      case 'midnight':
        return {
          background: '#000000',
          starOpacity: 0,
          borderColor: '#D4A843',
          borderWidth: '2px',
          textColor: '#FFFFFF',
          accentColor: '#D4A843',
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
          background: 'linear-gradient(180deg, #051937 0%, #0c2461 35%, #145a5a 70%, #0d7377 100%)',
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
          background: 'linear-gradient(180deg, #0f1f14 0%, #1b3d2f 45%, #2d4a3a 78%, #3d2918 100%)',
          starOpacity: 0,
          borderColor: '#a3b18a',
          borderWidth: '4px',
          textColor: '#F5F5DC',
          accentColor: '#c9a227',
          showStars: false,
        }
      default:
        return {
          background: 'radial-gradient(ellipse at top, #0f1729 0%, #070d1a 100%)',
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
  const currentStyle = { ...baseStyle, textColor: userTextColor }

  return (
    <div 
      style={{
        width: '1080px',
        height: '1080px',
        background: currentStyle.background,
        border: `${currentStyle.borderWidth}px solid ${currentStyle.borderColor}`,
        borderRadius: '24px',
        padding: '60px',
        position: 'relative',
        overflow: 'hidden',
        transform: `scale(${scale})`,
        transformOrigin: 'top center',
        boxShadow: '0 25px 80px rgba(0, 0, 0, 0.5)',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'space-between',
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

      {/* Top watermark */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        marginTop: '20px',
      }}>
        <p style={{
          fontFamily: CONTENT_FONTS.elegant,
          fontSize: '24px',
          fontWeight: 700,
          color: currentStyle.accentColor,
          letterSpacing: '0.15em',
          textTransform: 'uppercase',
          margin: 0,
          textShadow: '0 2px 10px rgba(212, 168, 67, 0.4)',
        }}>
          🕊️ AbidingAnchor
        </p>
      </div>

      {/* Main content */}
      <div style={{
        position: 'relative',
        zIndex: 1,
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
          <p style={{
            fontFamily: bodyFont,
            fontSize: '36px',
            fontStyle: contentFont === 'elegant' ? 'normal' : 'italic',
            color: currentStyle.textColor,
            marginBottom: '40px',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.35)',
          }}>
            {verseReference}
          </p>
        )}

        {/* Verse text */}
        {verseText && (
          <p style={{
            fontFamily: bodyFont,
            fontSize: '42px',
            fontWeight: contentFont === 'modern' ? 600 : 500,
            color: currentStyle.textColor,
            lineHeight: '1.5',
            marginBottom: '50px',
            textShadow: '0 2px 10px rgba(0, 0, 0, 0.5)',
          }}>
            {verseText}
          </p>
        )}

        {/* Gold divider line */}
        <div style={{
          width: '200px',
          height: '2px',
          background: `linear-gradient(90deg, transparent, ${currentStyle.accentColor}, transparent)`,
          margin: '20px 0',
          boxShadow: '0 0 10px rgba(212, 168, 67, 0.5)',
        }} />

        {/* User reflection/prayer */}
        {userReflection && (
          <p style={{
            fontFamily: bodyFont,
            fontSize: '32px',
            fontStyle: contentFont === 'elegant' ? 'normal' : 'italic',
            color: currentStyle.textColor,
            lineHeight: '1.6',
            maxWidth: '800px',
            textShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
          }}>
            {userReflection}
          </p>
        )}
      </div>

      {/* Bottom watermark */}
      <div style={{
        position: 'relative',
        zIndex: 1,
        textAlign: 'center',
        marginBottom: '20px',
      }}>
        <p style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: '18px',
          fontWeight: 500,
          color: currentStyle.accentColor,
          letterSpacing: '0.05em',
          margin: 0,
          opacity: 0.7,
        }}>
          abidinganchor.vercel.app
        </p>
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
