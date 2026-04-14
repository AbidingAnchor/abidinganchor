import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Camera } from '@capacitor/camera'
import FaithCard from '../components/FaithCard'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'

export default function ShareCard() {
  const { user } = useAuth()
  const location = useLocation()
  const cardRef = useRef(null)
  const [verseReference, setVerseReference] = useState('Psalm 23:1')
  const [verseText, setVerseText] = useState('The Lord is my shepherd; I shall not want.')
  const [userReflection, setUserReflection] = useState('This verse reminds me that I am never alone in my journey.')
  const [cardStyle, setCardStyle] = useState('celestial')
  const [contentFont, setContentFont] = useState('serif')
  const [textColorChoice, setTextColorChoice] = useState(null)
  const [generating, setGenerating] = useState(false)
  const [generatedImage, setGeneratedImage] = useState(null)

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
      name: 'Celestial',
      description: 'Dark navy + stars',
      previewBg:
        'radial-gradient(ellipse at top, #1e3a6e 0%, #162955 50%, #0d1f3c 100%)',
      previewStars: true,
      labelColor: '#FFFFFF',
      subColor: 'rgba(255,255,255,0.82)',
      idleBorder: 'rgba(212,168,67,0.35)',
    },
    {
      id: 'dawn',
      name: 'Dawn',
      description: 'Purple to gold gradient',
      previewBg: 'linear-gradient(135deg, #2d1b69 0%, #5a2d82 40%, #c2773a 80%, #e8a84e 100%)',
      labelColor: '#FFFFFF',
      subColor: 'rgba(255,255,255,0.85)',
      idleBorder: 'rgba(255,255,255,0.22)',
    },
    {
      id: 'scripture',
      name: 'Scripture',
      description: 'Dark green, earthy',
      previewBg: 'linear-gradient(180deg, #2d6a4f 0%, #1e4d35 100%)',
      labelColor: '#FFFFFF',
      subColor: 'rgba(255,248,231,0.85)',
      idleBorder: 'rgba(212,168,67,0.35)',
    },
    {
      id: 'midnight',
      name: 'Midnight',
      description: 'Pure black, minimal',
      previewBg: 'linear-gradient(180deg, #000000 0%, #0a0a0f 55%, #000000 100%)',
      labelColor: '#FFFFFF',
      subColor: 'rgba(255,255,255,0.78)',
      idleBorder: 'rgba(212,168,67,0.4)',
    },
    {
      id: 'golden',
      name: 'Golden Hour',
      description: 'Warm gold gradient',
      previewBg: 'linear-gradient(165deg, #fff5e6 0%, #ffd89b 38%, #e8a84e 72%, #c77d2a 100%)',
      labelColor: '#1a1a1a',
      subColor: 'rgba(26,26,26,0.75)',
      idleBorder: 'rgba(139,105,20,0.45)',
    },
    {
      id: 'ocean',
      name: 'Ocean',
      description: 'Deep blue & teal',
      previewBg: 'linear-gradient(180deg, #1a3a6e 0%, #1e6091 50%, #1a8a7a 100%)',
      labelColor: '#FFFFFF',
      subColor: 'rgba(224,255,251,0.88)',
      idleBorder: 'rgba(94,234,212,0.4)',
    },
    {
      id: 'rose',
      name: 'Rose Garden',
      description: 'Soft pink & cream',
      previewBg: 'linear-gradient(170deg, #fffdfb 0%, #fce7f3 40%, #fbcfe8 75%, #f9a8d4 100%)',
      labelColor: '#4a044e',
      subColor: 'rgba(74,4,78,0.72)',
      idleBorder: 'rgba(219,39,119,0.35)',
    },
    {
      id: 'forest',
      name: 'Forest',
      description: 'Deep green & earth',
      previewBg: 'linear-gradient(180deg, #2d6a4f 0%, #3d8b6f 60%, #2a5c44 100%)',
      labelColor: '#FFFFFF',
      subColor: 'rgba(240,253,244,0.88)',
      idleBorder: 'rgba(163,177,138,0.45)',
    },
  ]

  const fontOptions = [
    { id: 'serif', name: 'Serif', description: 'Georgia' },
    { id: 'modern', name: 'Modern', description: 'Inter' },
    { id: 'elegant', name: 'Elegant', description: 'Cinzel' },
    { id: 'handwritten', name: 'Handwritten', description: 'cursive' },
  ]

  const textColorOptions = [
    { id: 'white', label: 'White', swatch: '#FFFFFF' },
    { id: 'gold', label: 'Gold', swatch: '#D4A843' },
    { id: 'cream', label: 'Cream', swatch: '#FFF8E7' },
    { id: 'dark', label: 'Dark', swatch: '#1a1a1a' },
    { id: 'red', label: 'Red', swatch: '#E53E3E' },
    { id: 'blue', label: 'Blue', swatch: '#3B82F6' },
    { id: 'purple', label: 'Purple', swatch: '#8B5CF6' },
    { id: 'green', label: 'Green', swatch: '#10B981' },
    { id: 'pink', label: 'Pink', swatch: '#EC4899' },
    { id: 'orange', label: 'Orange', swatch: '#F97316' },
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
        title: 'Sharing from AbidingAnchor 🕊️',
        text: 'Check out this faith card from AbidingAnchor',
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
      alert('There was an error sharing your card. Please try again.')
      setGenerating(false)
    }
  }

  const handleSaveToGallery = async () => {
    if (!generatedImage) {
      // Generate image first if not already generated
      await handleGenerateAndShare()
      return
    }
    
    try {
      setGenerating(true)
      
      // Convert base64 to blob
      const response = await fetch(generatedImage)
      const blob = await response.blob()
      const base64Data = await blobToBase64(blob)
      
      // Request permissions and save to gallery
      const permissions = await Camera.requestPermissions({ permissions: ['photos'] })
      
      if (!permissions.photos) {
        alert('Photo permissions are needed to save the card to your gallery.')
        setGenerating(false)
        return
      }
      
      // Save to external storage (gallery)
      const timestamp = new Date().getTime()
      const fileName = `faith-card-${timestamp}.png`
      await Filesystem.writeFile({
        path: fileName,
        data: base64Data,
        directory: Directory.External,
      })
      
      alert('Card saved to your gallery! 🕊️')
      setGenerating(false)
    } catch (error) {
      console.error('Error saving to gallery:', error)
      if (error.message?.includes('permission')) {
        alert('Photo permissions are needed to save the card to your gallery. Please enable them in your device settings.')
      } else {
        alert('There was an error saving the card. Please try again.')
      }
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

  return (
    <div className="content-scroll px-4 pt-6 pb-40" style={{ minHeight: 'auto' }}>
      {/* Screen Title */}
      <div className="text-center mb-4">
        <h1 className="text-page-title text-gold-accent mb-2">
          Share Your Faith 🕊️
        </h1>
        <p className="text-white/80 italic text-sm">
          Let your light shine. Matthew 5:16
        </p>
      </div>

      {/* FaithCard Preview — fixed height clips scaled card excess */}
      <div className="flex justify-center mb-4" style={{ height: '450px', overflow: 'hidden' }}>
        <div ref={cardRef} style={{ transform: 'scale(0.38)', transformOrigin: 'top center', flexShrink: 0 }}>
          <FaithCard
            verseReference={verseReference}
            verseText={verseText}
            userReflection={userReflection}
            cardStyle={cardStyle}
            contentFont={contentFont}
            textColorChoice={textColorChoice}
          />
        </div>
      </div>

      {/* Loading State */}
      {generating && (
        <div className="glass p-4 rounded-2xl text-center mb-2">
          <p className="text-gold-accent text-lg font-semibold mb-2">
            Preparing your card... 🙏
          </p>
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-[#D4A843]/30 border-t-[#D4A843] animate-spin" />
        </div>
      )}

      {/* Card Style Options - 2x2 grid */}
      <div className="mb-2">
        <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--section-title)' }}>
          Card Style
        </p>
        <div className="grid grid-cols-2 gap-3">
          {cardStyles.map((style) => {
            const selected = cardStyle === style.id
            const starDots =
              'radial-gradient(1px 1px at 18% 28%, rgba(255,255,255,0.45), transparent), radial-gradient(1px 1px at 72% 22%, rgba(255,255,255,0.35), transparent), radial-gradient(1px 1px at 45% 62%, rgba(255,255,255,0.3), transparent), radial-gradient(1px 1px at 88% 78%, rgba(255,255,255,0.25), transparent)'
            return (
              <button
                key={style.id}
                type="button"
                onClick={() => setCardStyle(style.id)}
                className="relative overflow-hidden rounded-xl border-2 p-4 text-left transition-all min-h-[5.5rem] shadow-md hover:brightness-[1.03] active:scale-[0.99]"
                style={{
                  borderColor: selected ? '#D4A843' : style.idleBorder,
                  background: style.previewBg,
                  boxShadow: selected
                    ? '0 0 0 2px rgba(212,168,67,0.45), 0 8px 24px rgba(0,0,0,0.35)'
                    : '0 4px 14px rgba(0,0,0,0.2)',
                }}
              >
                {style.previewStars ? (
                  <div
                    className="pointer-events-none absolute inset-0 opacity-[0.55]"
                    style={{
                      backgroundImage: starDots,
                      backgroundSize: '120% 120%',
                    }}
                    aria-hidden
                  />
                ) : null}
                <div className="relative z-[1]" style={{ textShadow: style.labelColor === '#FFFFFF' ? '0 1px 3px rgba(0,0,0,0.65)' : '0 1px 2px rgba(255,255,255,0.5)' }}>
                  <div style={{ color: style.labelColor, fontWeight: 600, marginBottom: '4px', fontSize: '15px' }}>
                    {style.name}
                  </div>
                  <div style={{ color: style.subColor, fontSize: '12px', lineHeight: 1.35 }}>
                    {style.description}
                  </div>
                </div>
              </button>
            )
          })}
        </div>
      </div>

      {/* Font */}
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--section-title)' }}>
          Font
        </p>
        <div className="grid grid-cols-2 gap-3">
          {fontOptions.map((f) => (
            <button
              key={f.id}
              type="button"
              onClick={() => setContentFont(f.id)}
              className={`
                p-4 rounded-xl border-2 transition-all text-left
                ${contentFont === f.id
                  ? 'border-[#D4A843] bg-[#D4A843]/10 shadow-[0_0_20px_rgba(212,168,67,0.3)]'
                  : 'hover:border-white/20'
                }
              `}
              style={{
                borderColor: contentFont === f.id ? 'var(--gold-border)' : 'var(--glass-border)',
                background: contentFont === f.id ? 'rgba(212,168,67,0.1)' : 'var(--card-parchment)',
              }}
            >
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>{f.name}</p>
              <p style={{ color: 'var(--text-primary)', fontSize: '12px', opacity: 0.7 }}>{f.description}</p>
            </button>
          ))}
        </div>
      </div>

      {/* Text color */}
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--section-title)' }}>
          Text Color
        </p>
        <div className="flex flex-wrap gap-4 justify-center sm:justify-start">
          {textColorOptions.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setTextColorChoice(c.id)}
              className="flex flex-col items-center gap-2 min-w-[4.5rem]"
              aria-label={`Text color ${c.label}`}
              aria-pressed={textColorChoice === c.id}
            >
              <span
                className="rounded-full border-2 transition-all shadow-md"
                style={{
                  width: '44px',
                  height: '44px',
                  background: c.swatch,
                  borderColor: textColorChoice === c.id ? 'var(--gold-border)' : 'var(--glass-border)',
                  boxShadow: textColorChoice === c.id ? '0 0 0 3px rgba(212,168,67,0.35)' : undefined,
                }}
              />
              <span className="text-xs" style={{ color: 'var(--text-primary)', opacity: 0.85 }}>
                {c.label}
              </span>
            </button>
          ))}
        </div>
      </div>

      {/* Customization Fields */}
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--section-title)' }}>
          Customize
        </p>
        
        {/* Verse Reference */}
        <div className="mb-3">
          <label className="text-sm mb-2 block" style={{ color: 'var(--text-primary)' }}>Verse Reference</label>
          <input
            type="text"
            value={verseReference}
            onChange={(e) => setVerseReference(e.target.value)}
            placeholder="e.g., Psalm 23:1"
            className="w-full rounded-xl p-3 text-base outline-none transition-all"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        {/* Verse Text */}
        <div className="mb-3">
          <label className="text-sm mb-2 block" style={{ color: 'var(--text-primary)' }}>Verse Text</label>
          <textarea
            value={verseText}
            onChange={(e) => setVerseText(e.target.value)}
            placeholder="Enter the scripture verse..."
            rows={3}
            className="w-full rounded-xl p-3 text-base outline-none resize-none transition-all"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        {/* Personal Reflection */}
        <div className="mb-4">
          <label className="text-sm mb-2 block" style={{ color: 'var(--text-primary)' }}>Personal Reflection (optional)</label>
          <textarea
            value={userReflection}
            onChange={(e) => setUserReflection(e.target.value)}
            placeholder="What does this verse mean to you?"
            rows={3}
            className="w-full rounded-xl p-3 text-base outline-none resize-none transition-all"
            style={{
              background: 'var(--input-bg)',
              border: '1px solid var(--input-border)',
              color: 'var(--text-primary)'
            }}
          />
        </div>

        {/* Generate & Share Button */}
        <button 
          onClick={handleGenerateAndShare}
          disabled={generating}
          className="btn-primary w-full gold-glow-pulse disabled:opacity-50 disabled:cursor-not-allowed mb-3"
        >
          {generating ? 'Generating...' : 'Generate & Share'}
        </button>

        {/* Save to Gallery Button */}
        <button 
          onClick={handleSaveToGallery}
          disabled={generating}
          className="w-full py-3 rounded-xl border-none text-[#0a1a3e] font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          style={{
            background: 'linear-gradient(135deg, #D4A843, #f0c060)',
            borderRadius: '12px',
          }}
        >
          Save to Gallery
        </button>
      </div>
    </div>
  )
}
