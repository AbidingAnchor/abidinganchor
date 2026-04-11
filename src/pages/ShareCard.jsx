import { useState, useRef, useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import { toPng } from 'html-to-image'
import { Share } from '@capacitor/share'
import { Filesystem, Directory } from '@capacitor/filesystem'
import { Camera } from '@capacitor/camera'
import FaithCard from '../components/FaithCard'

export default function ShareCard() {
  const location = useLocation()
  const cardRef = useRef(null)
  const [verseReference, setVerseReference] = useState('Psalm 23:1')
  const [verseText, setVerseText] = useState('The Lord is my shepherd; I shall not want.')
  const [userReflection, setUserReflection] = useState('This verse reminds me that I am never alone in my journey.')
  const [cardStyle, setCardStyle] = useState('celestial')
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

  const cardStyles = [
    { id: 'celestial', name: 'Celestial', description: 'Dark navy + stars' },
    { id: 'dawn', name: 'Dawn', description: 'Purple to gold gradient' },
    { id: 'scripture', name: 'Scripture', description: 'Dark green, earthy' },
    { id: 'midnight', name: 'Midnight', description: 'Pure black, minimal' },
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

      {/* FaithCard Preview - Larger and more prominent */}
      <div className="flex justify-center mb-4 overflow-hidden">
        <div ref={cardRef} style={{ transform: 'scale(0.4)', transformOrigin: 'top center' }}>
          <FaithCard
            verseReference={verseReference}
            verseText={verseText}
            userReflection={userReflection}
            scale={1}
            cardStyle={cardStyle}
          />
        </div>
      </div>

      {/* Loading State */}
      {generating && (
        <div className="glass p-4 rounded-2xl text-center mb-4">
          <p className="text-gold-accent text-lg font-semibold mb-2">
            Preparing your card... 🙏
          </p>
          <div className="w-12 h-12 mx-auto rounded-full border-4 border-[#D4A843]/30 border-t-[#D4A843] animate-spin" />
        </div>
      )}

      {/* Card Style Options - 2x2 grid */}
      <div className="mb-4">
        <p className="text-sm font-semibold uppercase tracking-wider mb-3" style={{ color: 'var(--section-title)' }}>
          Card Style
        </p>
        <div className="grid grid-cols-2 gap-3">
          {cardStyles.map((style) => (
            <button
              key={style.id}
              onClick={() => setCardStyle(style.id)}
              className={`
                p-4 rounded-xl border-2 transition-all text-left
                ${cardStyle === style.id
                  ? 'border-[#D4A843] bg-[#D4A843]/10 shadow-[0_0_20px_rgba(212,168,67,0.3)]'
                  : 'hover:border-white/20'
                }
              `}
              style={{
                borderColor: cardStyle === style.id ? 'var(--gold-border)' : 'var(--glass-border)',
                background: cardStyle === style.id ? 'rgba(212,168,67,0.1)' : 'var(--glass-bg)'
              }}
            >
              <p style={{ color: 'var(--text-primary)', fontWeight: 600, marginBottom: '4px' }}>{style.name}</p>
              <p style={{ color: 'var(--text-primary)', fontSize: '12px', opacity: 0.7 }}>{style.description}</p>
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
          className="w-full py-3 rounded-xl border border-[#D4A843]/50 text-[#D4A843] font-semibold hover:bg-[#D4A843]/10 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
        >
          Save to Gallery
        </button>
      </div>
    </div>
  )
}
