import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { useTranslation } from 'react-i18next'
import { toPng } from 'html-to-image'
import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Camera } from '@capacitor/camera'
import FaithCard from '../components/FaithCard'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'
import SaveToast from '../components/SaveToast'

export default function ShareCard() {
  const { t } = useTranslation()
  const { user } = useAuth()
  const location = useLocation()
  const cardRef = useRef(null)
  const exportRef = useRef(null)
  const [verseReference, setVerseReference] = useState('Psalm 23:1')
  const [verseText, setVerseText] = useState('The Lord is my shepherd; I shall not want.')
  const [userReflection, setUserReflection] = useState('This verse reminds me that I am never alone in my journey.')
  const [cardStyle, setCardStyle] = useState('celestial')
  const [contentFont, setContentFont] = useState('serif')
  const [textColorChoice, setTextColorChoice] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState(null)
  const [sizePreset, setSizePreset] = useState('square')
  const [toastTrigger, setToastTrigger] = useState(0)
  const [toastMessage, setToastMessage] = useState('')

  useEffect(() => {
    if (location.state) {
      const { verseReference, verseText, userReflection } = location.state
      if (verseReference) setVerseReference(verseReference)
      if (verseText) setVerseText(verseText)
      if (userReflection) setUserReflection(userReflection)
    }
  }, [location.state])

  /** Preview tiles mirror FaithCard backgrounds so choices read at a glance */
  const cardStyles = [
    {
      id: 'celestial',
      name: t('shareCard.celestial'),
      description: t('shareCard.celestialDesc'),
      previewBg:
        'radial-gradient(ellipse at top, #1e3a6e 0%, #162955 50%, #0d1f3c 100%)',
      previewStars: true,
      labelColor: '#FFFFFF',
      subColor: 'rgba(255,255,255,0.82)',
      idleBorder: 'rgba(212,168,67,0.35)',
    },
    {
      id: 'dawn',
      name: t('shareCard.dawn'),
      description: t('shareCard.dawnDesc'),
      previewBg: 'linear-gradient(135deg, #2d1b69 0%, #5a2d82 40%, #c2773a 80%, #e8a84e 100%)',
      labelColor: '#FFFFFF',
      subColor: 'rgba(255,255,255,0.85)',
      idleBorder: 'rgba(255,255,255,0.22)',
    },
    {
      id: 'scripture',
      name: t('shareCard.scripture'),
      description: t('shareCard.scriptureDesc'),
      previewBg: 'linear-gradient(180deg, #2d6a4f 0%, #1e4d35 100%)',
      labelColor: '#FFFFFF',
      subColor: 'rgba(255,248,231,0.85)',
      idleBorder: 'rgba(212,168,67,0.35)',
    },
    {
      id: 'ember',
      name: 'Ember',
      description: 'Dark charcoal with deep red glow',
      previewBg: 'linear-gradient(135deg, #1c1917 0%, #3b0f0f 50%, #450a0a 100%)',
      labelColor: '#FFFFFF',
      subColor: 'rgba(255,255,255,0.78)',
      idleBorder: 'rgba(239,68,68,0.4)',
    },
    {
      id: 'golden',
      name: t('shareCard.goldenHour'),
      description: t('shareCard.goldenHourDesc'),
      previewBg: 'linear-gradient(165deg, #fff5e6 0%, #ffd89b 38%, #e8a84e 72%, #c77d2a 100%)',
      labelColor: '#1a1a1a',
      subColor: 'rgba(26,26,26,0.75)',
      idleBorder: 'rgba(139,105,20,0.45)',
    },
    {
      id: 'ocean',
      name: t('shareCard.ocean'),
      description: t('shareCard.oceanDesc'),
      previewBg: 'linear-gradient(180deg, #1a3a6e 0%, #1e6091 50%, #1a8a7a 100%)',
      labelColor: '#FFFFFF',
      subColor: 'rgba(224,255,251,0.88)',
      idleBorder: 'rgba(94,234,212,0.4)',
    },
    {
      id: 'rose',
      name: t('shareCard.roseGarden'),
      description: t('shareCard.roseGardenDesc'),
      previewBg: 'linear-gradient(170deg, #fffdfb 0%, #fce7f3 40%, #fbcfe8 75%, #f9a8d4 100%)',
      labelColor: '#4a044e',
      subColor: 'rgba(74,4,78,0.72)',
      idleBorder: 'rgba(219,39,119,0.35)',
    },
    {
      id: 'forest',
      name: t('shareCard.forest'),
      description: t('shareCard.forestDesc'),
      previewBg: 'linear-gradient(180deg, #2d6a4f 0%, #3d8b6f 60%, #2a5c44 100%)',
      labelColor: '#FFFFFF',
      subColor: 'rgba(240,253,244,0.88)',
      idleBorder: 'rgba(163,177,138,0.45)',
    },
  ]

  const fontOptions = [
    { id: 'serif', name: t('shareCard.fontSerif'), description: t('shareCard.fontSerifDesc') },
    { id: 'modern', name: t('shareCard.fontModern'), description: t('shareCard.fontModernDesc') },
    { id: 'elegant', name: t('shareCard.fontElegant'), description: t('shareCard.fontElegantDesc') },
    { id: 'handwritten', name: t('shareCard.fontHandwritten'), description: t('shareCard.fontHandwrittenDesc') },
  ]

  const textColorOptions = [
    { id: 'white', label: t('shareCard.colorWhite'), swatch: '#FFFFFF' },
    { id: 'gold', label: t('shareCard.colorGold'), swatch: '#D4A843' },
    { id: 'cream', label: t('shareCard.colorCream'), swatch: '#FFF8E7' },
    { id: 'dark', label: t('shareCard.colorDark'), swatch: '#1a1a1a' },
    { id: 'red', label: t('shareCard.colorRed'), swatch: '#E53E3E' },
    { id: 'blue', label: t('shareCard.colorBlue'), swatch: '#3B82F6' },
    { id: 'purple', label: t('shareCard.colorPurple'), swatch: '#8B5CF6' },
    { id: 'green', label: t('shareCard.colorGreen'), swatch: '#10B981' },
    { id: 'pink', label: t('shareCard.colorPink'), swatch: '#EC4899' },
    { id: 'orange', label: t('shareCard.colorOrange'), swatch: '#F97316' },
  ]

  const handleGenerateAndShare = async () => {
    if (!cardRef.current) return
    
    try {
      setGenerating(true)
      
      // Generate PNG from the FaithCard component
      const dataUrl = await toPng(cardRef.current, {
        width: 1080,
        height: 1080,
        quality: 1,
        pixelRatio: 1,
      })
      
      setGeneratedImage(dataUrl)
      
      // Convert base64 to blob for sharing
      const response = await fetch(dataUrl)
      const blob = await response.blob()
      const file = new File([blob], 'faith-card.png', { type: 'image/png' })
      
      // Share using Capacitor Share API
      await Share.share({
        title: t('shareCard.shareTitle'),
        text: t('shareCard.shareText'),
        files: [file],
      })

      try {
        localStorage.setItem(userStorageKey(user?.id, 'verse-card-shared'), '1')
      } catch {
        /* ignore */
      }

      setGenerating(false)
    } catch (error) {
      console.error('Error generating or sharing card:', error)
      alert(t('shareCard.shareError'))
      setGenerating(false)
    }
  }

  const handleSaveToGallery = async () => {
    if (!exportRef.current) return
    try {
      setGenerating(true)
      const dataUrl = await toPng(exportRef.current, { width: 1080, height: 1080, quality: 1, pixelRatio: 1 })
      const base64Data = dataUrl.split(',')[1]
      const fileName = `abiding-anchor-${Date.now()}.png`
      const writeResult = await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.Documents,
      })
      await Share.share({
        title: 'My Faith Card',
        url: writeResult.uri,
        dialogTitle: 'Save or Share your faith card',
      })
      setGeneratedImage(dataUrl)
      setToastMessage('Card saved! 🙏')
      setToastTrigger((n) => n + 1)
      try { localStorage.setItem(userStorageKey(user?.id, 'verse-card-shared'), '1') } catch { /* ignore */ }
    } catch (error) {
      if (error?.message?.includes('cancel') || error?.message?.includes('Cancel') || error?.errorMessage?.includes('cancel')) {
        /* user dismissed share sheet — not a real error */
        setGenerating(false)
        return
      }
      console.error('Error saving to gallery:', error)
      setToastMessage(t('shareCard.saveError'))
      setToastTrigger((n) => n + 1)
    } finally {
      setGenerating(false)
    }
  }

  const blobToBase64 = (blob) => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader()
      reader.onloadend = () => resolve(reader.result.split(',')[1])
      reader.onerror = reject
      reader.readAsDataURL(blob)
    })
  }

  const sizePresets = [
    { id: 'square', label: 'Square', aspect: '1 / 1' },
    { id: 'story', label: 'Story', aspect: '9 / 16' },
    { id: 'twitter', label: 'Twitter', aspect: '16 / 9' },
  ]

  const starDots =
    'radial-gradient(1px 1px at 18% 28%, rgba(255,255,255,0.45), transparent), ' +
    'radial-gradient(1px 1px at 72% 22%, rgba(255,255,255,0.35), transparent), ' +
    'radial-gradient(1px 1px at 45% 62%, rgba(255,255,255,0.3), transparent), ' +
    'radial-gradient(1px 1px at 88% 78%, rgba(255,255,255,0.25), transparent)'

  const fontFamilyMap = {
    serif: "'Georgia', serif",
    modern: "'Inter', system-ui, sans-serif",
    elegant: "'Cinzel', Georgia, serif",
    handwritten: "'Segoe Print', cursive",
  }

  const sectionLabel = {
    color: '#D4A843',
    fontSize: '11px',
    fontWeight: 700,
    letterSpacing: '0.14em',
    textTransform: 'uppercase',
    margin: '0 0 14px 0',
  }

  const glassInput = {
    width: '100%',
    borderRadius: '14px',
    padding: '13px 16px',
    fontSize: '15px',
    outline: 'none',
    border: '1.5px solid rgba(212,168,67,0.3)',
    background: 'rgba(255,255,255,0.05)',
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    color: '#ffffff',
    resize: 'none',
    transition: 'border-color 0.2s ease, box-shadow 0.2s ease',
    boxSizing: 'border-box',
  }

  return (
    <div className="content-scroll" style={{ width: '100%', maxWidth: '100%', overflowX: 'hidden', boxSizing: 'border-box', padding: '20px 16px 80px' }}>
      <style>{`
        .sc-input:focus { border-color: rgba(251,191,36,0.5) !important; box-shadow: 0 0 12px rgba(251,191,36,0.2) !important; }
        .sc-style-card { transition: transform 0.15s ease, box-shadow 0.15s ease; }
        .sc-style-card:hover { transform: translateY(-2px); }
        .sc-font-card { transition: all 0.15s ease; }
        .sc-font-card:hover { border-color: rgba(212,168,67,0.45) !important; }
        .sc-color-btn { transition: transform 0.15s ease; }
        .sc-color-btn:hover { transform: scale(1.08); }
        .sc-preset-btn { transition: all 0.15s ease; }
      `}</style>

      {/* ── Header ── */}
      <div style={{ marginBottom: '24px', position: 'relative' }}>
        <div style={{
          position: 'absolute', top: '-16px', left: '50%', transform: 'translateX(-50%)',
          width: '240px', height: '90px',
          background: 'radial-gradient(ellipse, rgba(212,168,67,0.1) 0%, transparent 70%)',
          pointerEvents: 'none',
        }} />
        <h1 style={{ color: '#ffffff', fontSize: '30px', fontWeight: 800, margin: '0 0 5px 0', letterSpacing: '-0.4px' }}>
          {t('shareCard.title')}
        </h1>
        <p style={{ color: 'rgba(251,191,36,0.7)', fontSize: '14px', fontStyle: 'italic', margin: 0 }}>
          {t('shareCard.subtitle')}
        </p>
      </div>

      {/* ── Live Preview Card ── */}
      <div style={{
        width: '100%',
        display: 'flex',
        justifyContent: 'center',
        paddingLeft: '16px',
        paddingRight: '16px',
        boxSizing: 'border-box',
        marginTop: '16px',
        marginBottom: '16px',
      }}>
        <div
          ref={cardRef}
          style={{
            width: '100%',
            maxWidth: '300px',
          }}
        >
          <FaithCard
            verseReference={verseReference}
            verseText={verseText}
            userReflection={userReflection}
            cardStyle={cardStyle}
            contentFont={contentFont}
            textColorChoice={textColorChoice}
            previewMode
          />
        </div>
      </div>

      {/* ── Size Presets ── */}
      <div style={{ display: 'flex', gap: '8px', marginBottom: '24px', justifyContent: 'center' }}>
        {sizePresets.map((p) => (
          <button
            key={p.id}
            type="button"
            className="sc-preset-btn"
            onClick={() => setSizePreset(p.id)}
            style={{
              borderRadius: '50px',
              padding: '7px 18px',
              fontSize: '12px',
              fontWeight: 600,
              background: sizePreset === p.id ? 'linear-gradient(135deg,#D4A843,#F0C040)' : 'rgba(255,255,255,0.06)',
              border: sizePreset === p.id ? 'none' : '1px solid rgba(255,255,255,0.12)',
              color: sizePreset === p.id ? '#1A1200' : 'rgba(255,255,255,0.7)',
              cursor: 'pointer',
            }}
          >
            {p.label}
          </button>
        ))}
      </div>

      {/* ── Generating spinner ── */}
      {generating && (
        <div className="home-gold-glass" style={{ borderRadius: '16px', padding: '16px', textAlign: 'center', marginBottom: '20px' }}>
          <p style={{ color: '#D4A843', fontWeight: 600, marginBottom: '10px' }}>{t('shareCard.preparing')}</p>
          <div style={{ width: '36px', height: '36px', margin: '0 auto', borderRadius: '50%', border: '3px solid rgba(212,168,67,0.25)', borderTopColor: '#D4A843', animation: 'spin 0.8s linear infinite' }} />
        </div>
      )}

      {/* ── Card Style ── */}
      <div style={{ marginBottom: '24px' }}>
        <p style={sectionLabel}>{t('shareCard.cardStyle')}</p>
        <div style={{ display: 'flex', gap: '12px', overflowX: 'auto', paddingBottom: '4px' }}>
          {cardStyles.map((style) => {
            const selected = cardStyle === style.id
            return (
              <button
                key={style.id}
                type="button"
                className="sc-style-card"
                onClick={() => setCardStyle(style.id)}
                style={{
                  flexShrink: 0,
                  width: '90px',
                  borderRadius: '14px',
                  overflow: 'hidden',
                  border: selected ? '2px solid #D4A843' : '2px solid rgba(255,255,255,0.1)',
                  boxShadow: selected ? '0 0 14px rgba(212,168,67,0.4)' : 'none',
                  background: 'none',
                  cursor: 'pointer',
                  padding: 0,
                  transition: 'all 0.15s ease',
                }}
              >
                <div style={{
                  height: '64px',
                  background: style.previewBg,
                  position: 'relative',
                }}>
                  {style.previewStars && (
                    <div style={{
                      position: 'absolute', inset: 0, opacity: 0.55,
                      backgroundImage: starDots, backgroundSize: '120% 120%',
                    }} />
                  )}
                </div>
                <div style={{
                  padding: '6px 8px 8px',
                  background: 'rgba(255,255,255,0.04)',
                  backdropFilter: 'blur(8px)',
                }}>
                  <p style={{ color: '#ffffff', fontSize: '11px', fontWeight: 600, margin: 0, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
                    {style.name}
                  </p>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Font ── */}
      <div style={{ marginBottom: '24px' }}>
        <p style={sectionLabel}>{t('shareCard.font')}</p>
        <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '4px' }}>
          {fontOptions.map((f) => {
            const selected = contentFont === f.id
            return (
              <button
                key={f.id}
                type="button"
                className="sc-font-card home-gold-glass"
                onClick={() => setContentFont(f.id)}
                style={{
                  flexShrink: 0,
                  borderRadius: '14px',
                  padding: '14px 18px',
                  border: selected ? '2px solid #D4A843' : '2px solid rgba(255,255,255,0.1)',
                  boxShadow: selected ? '0 0 12px rgba(212,168,67,0.35)' : 'none',
                  cursor: 'pointer',
                  background: selected ? 'rgba(212,168,67,0.08)' : undefined,
                  textAlign: 'center',
                  minWidth: '90px',
                  transition: 'all 0.15s ease',
                }}
              >
                <p style={{
                  fontFamily: fontFamilyMap[f.id],
                  fontSize: '17px',
                  color: selected ? '#D4A843' : '#ffffff',
                  margin: '0 0 2px 0',
                  fontWeight: 600,
                }}>
                  {f.name}
                </p>
                <p style={{ color: 'rgba(255,255,255,0.45)', fontSize: '10px', margin: 0 }}>{f.description}</p>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Text Color ── */}
      <div style={{ marginBottom: '24px' }}>
        <p style={sectionLabel}>{t('shareCard.textColor')}</p>
        <div style={{ display: 'flex', gap: '14px', overflowX: 'auto', paddingBottom: '4px', alignItems: 'flex-end' }}>
          {textColorOptions.map((c) => {
            const selected = textColorChoice === c.id
            return (
              <button
                key={c.id}
                type="button"
                className="sc-color-btn"
                onClick={() => setTextColorChoice(c.id)}
                aria-label={t('shareCard.textColorAria', { color: c.label })}
                aria-pressed={selected}
                style={{
                  flexShrink: 0,
                  display: 'flex',
                  flexDirection: 'column',
                  alignItems: 'center',
                  gap: '6px',
                  background: 'none',
                  border: 'none',
                  cursor: 'pointer',
                  padding: 0,
                }}
              >
                <span style={{
                  display: 'block',
                  width: '40px',
                  height: '40px',
                  borderRadius: '50%',
                  background: c.swatch,
                  border: selected ? '2.5px solid #D4A843' : '2px solid rgba(255,255,255,0.15)',
                  boxShadow: selected ? '0 0 0 3px rgba(212,168,67,0.3)' : 'none',
                  transition: 'all 0.15s ease',
                }} />
                <span style={{ color: 'rgba(255,255,255,0.6)', fontSize: '10px', whiteSpace: 'nowrap' }}>{c.label}</span>
              </button>
            )
          })}
        </div>
      </div>

      {/* ── Customize ── */}
      <div style={{ marginBottom: '24px' }}>
        <p style={sectionLabel}>{t('shareCard.customize')}</p>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>
            {t('shareCard.verseReference')}
          </label>
          <input
            type="text"
            value={verseReference}
            onChange={(e) => setVerseReference(e.target.value)}
            placeholder={t('shareCard.verseReferencePlaceholder')}
            className="sc-input"
            style={glassInput}
          />
        </div>

        <div style={{ marginBottom: '12px' }}>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>
            {t('shareCard.verseText')}
          </label>
          <textarea
            value={verseText}
            onChange={(e) => setVerseText(e.target.value)}
            placeholder={t('shareCard.verseTextPlaceholder')}
            rows={3}
            className="sc-input"
            style={glassInput}
          />
        </div>

        <div style={{ marginBottom: '20px' }}>
          <label style={{ color: 'rgba(255,255,255,0.6)', fontSize: '12px', fontWeight: 600, display: 'block', marginBottom: '6px', letterSpacing: '0.05em' }}>
            {t('shareCard.personalReflection')}
          </label>
          <textarea
            value={userReflection}
            onChange={(e) => setUserReflection(e.target.value)}
            placeholder={t('shareCard.reflectionPlaceholder')}
            rows={3}
            className="sc-input"
            style={glassInput}
          />
        </div>

        {/* Generate & Share */}
        <button
          type="button"
          onClick={handleGenerateAndShare}
          disabled={generating}
          style={{
            width: '100%',
            borderRadius: '50px',
            padding: '15px',
            fontSize: '15px',
            fontWeight: 700,
            background: 'linear-gradient(135deg,#D4A843,#F0C040)',
            border: 'none',
            color: '#1A1200',
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.6 : 1,
            marginBottom: '12px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>↑</span>
          {generating ? t('shareCard.generating') : t('shareCard.generateAndShare')}
        </button>

        {/* Save to Gallery */}
        <button
          type="button"
          onClick={handleSaveToGallery}
          disabled={generating}
          style={{
            width: '100%',
            borderRadius: '50px',
            padding: '15px',
            fontSize: '15px',
            fontWeight: 700,
            background: 'rgba(255,255,255,0.06)',
            border: '1.5px solid rgba(212,168,67,0.4)',
            color: '#D4A843',
            cursor: generating ? 'not-allowed' : 'pointer',
            opacity: generating ? 0.6 : 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '8px',
          }}
        >
          <span>⬇</span>
          {t('shareCard.saveToGallery')}
        </button>
      </div>

      {/* Hidden full-res export card — never visible, captured by toPng for Save to Gallery */}
      <div
        ref={exportRef}
        style={{
          position: 'absolute',
          top: 0,
          left: '-9999px',
          width: '1080px',
          height: '1080px',
          pointerEvents: 'none',
          opacity: 0,
          zIndex: -1,
        }}
        aria-hidden="true"
      >
        <FaithCard
          verseReference={verseReference}
          verseText={verseText}
          userReflection={userReflection}
          cardStyle={cardStyle}
          contentFont={contentFont}
          textColorChoice={textColorChoice}
        />
      </div>

      <SaveToast trigger={toastTrigger} message={toastMessage} />
    </div>
  )
}
