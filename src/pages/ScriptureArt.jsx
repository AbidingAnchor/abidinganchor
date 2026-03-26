import { useEffect, useMemo, useRef, useState } from 'react'

const GALLERY_KEY = 'abidinganchor-art-gallery'

const popularVerses = [
  { ref: 'John 3:16', text: 'For God so loved the world that he gave his one and only Son...' },
  { ref: 'Philippians 4:13', text: 'I can do all this through him who gives me strength.' },
  { ref: 'Romans 8:28', text: 'And we know that in all things God works for the good of those who love him.' },
  { ref: 'Psalm 23:1', text: 'The LORD is my shepherd, I lack nothing.' },
  { ref: 'Proverbs 3:5-6', text: 'Trust in the LORD with all your heart and lean not on your own understanding...' },
  { ref: 'Isaiah 41:10', text: 'Do not fear, for I am with you; do not be dismayed, for I am your God.' },
  { ref: 'Jeremiah 29:11', text: 'For I know the plans I have for you, declares the LORD...' },
  { ref: 'Psalm 46:1', text: 'God is our refuge and strength, an ever-present help in trouble.' },
  { ref: 'Matthew 11:28', text: 'Come to me, all you who are weary and burdened, and I will give you rest.' },
  { ref: '2 Timothy 1:7', text: 'For the Spirit God gave us does not make us timid, but gives us power, love and self-discipline.' },
  { ref: 'Hebrews 11:1', text: 'Now faith is confidence in what we hope for and assurance about what we do not see.' },
  { ref: 'Psalm 121:1-2', text: 'I lift up my eyes to the mountains—where does my help come from?' },
  { ref: 'Romans 12:2', text: 'Be transformed by the renewing of your mind.' },
  { ref: 'Galatians 5:22-23', text: 'The fruit of the Spirit is love, joy, peace, forbearance, kindness, goodness, faithfulness...' },
  { ref: 'Ephesians 2:8-9', text: 'For it is by grace you have been saved, through faith...' },
  { ref: 'John 14:27', text: 'Peace I leave with you; my peace I give you.' },
  { ref: 'Psalm 34:8', text: 'Taste and see that the LORD is good.' },
  { ref: 'Psalm 119:105', text: 'Your word is a lamp for my feet, a light on my path.' },
  { ref: 'Joshua 1:9', text: 'Be strong and courageous. Do not be afraid; do not be discouraged.' },
  { ref: 'Isaiah 40:31', text: 'Those who hope in the LORD will renew their strength.' },
  { ref: '1 Corinthians 13:13', text: 'And now these three remain: faith, hope and love.' },
  { ref: 'Romans 15:13', text: 'May the God of hope fill you with all joy and peace as you trust in him.' },
  { ref: 'Matthew 6:33', text: 'Seek first his kingdom and his righteousness.' },
  { ref: 'James 1:5', text: 'If any of you lacks wisdom, you should ask God.' },
  { ref: 'Psalm 37:4', text: 'Take delight in the LORD, and he will give you the desires of your heart.' },
  { ref: 'Micah 6:8', text: 'Act justly and to love mercy and to walk humbly with your God.' },
  { ref: 'Lamentations 3:22-23', text: 'His compassions never fail. They are new every morning.' },
  { ref: 'Deuteronomy 31:6', text: 'Be strong and courageous. Do not be afraid or terrified.' },
  { ref: 'John 8:12', text: 'I am the light of the world. Whoever follows me will never walk in darkness.' },
  { ref: '1 Peter 5:7', text: 'Cast all your anxiety on him because he cares for you.' },
]

const themes = {
  'Night Sky': ['#0d1f4e', '#24113a'],
  'Golden Dawn': ['#5b3c00', '#a56600'],
  'Ocean Deep': ['#0a3a45', '#0d1f4e'],
  Forest: ['#0d2e1d', '#1f6f45'],
  Sunset: ['#8a3d05', '#3c1d57'],
  'Pure Dark': ['#0a0a0d', '#0a0a0d'],
}

const textColors = ['#FFFFFF', '#D4A843', '#f6efd9']

function readGallery() {
  try {
    return JSON.parse(localStorage.getItem(GALLERY_KEY) || '[]')
  } catch {
    return []
  }
}

export default function ScriptureArt() {
  const canvasRef = useRef(null)
  const [verse, setVerse] = useState('Peace I leave with you; my peace I give you.')
  const [reference, setReference] = useState('John 14:27')
  const [theme, setTheme] = useState('Night Sky')
  const [fontStyle, setFontStyle] = useState('Serif')
  const [textColor, setTextColor] = useState('#FFFFFF')
  const [showCross, setShowCross] = useState(true)
  const [showPicker, setShowPicker] = useState(false)
  const [gallery, setGallery] = useState(() => readGallery())

  const fontFamily = useMemo(() => {
    if (fontStyle === 'Sans-serif') return 'Inter, system-ui, sans-serif'
    if (fontStyle === 'Elegant Script') return '"Lora", serif'
    return '"Lora", serif'
  }, [fontStyle])

  useEffect(() => {
    const canvas = canvasRef.current
    const ctx = canvas.getContext('2d')
    const [start, end] = themes[theme]
    const gradient = ctx.createLinearGradient(0, 0, canvas.width, canvas.height)
    gradient.addColorStop(0, start)
    gradient.addColorStop(1, end)
    ctx.fillStyle = gradient
    ctx.fillRect(0, 0, canvas.width, canvas.height)

    if (showCross) {
      ctx.globalAlpha = 0.1
      ctx.fillStyle = '#D4A843'
      ctx.fillRect(canvas.width / 2 - 14, 180, 28, 220)
      ctx.fillRect(canvas.width / 2 - 85, 250, 170, 26)
      ctx.globalAlpha = 1
    }

    ctx.strokeStyle = 'rgba(212,168,67,0.35)'
    ctx.lineWidth = 4
    ctx.strokeRect(40, 40, canvas.width - 80, canvas.height - 80)

    const words = verse.trim().split(/\s+/)
    const lines = []
    let line = ''
    ctx.font = `56px ${fontFamily}`
    for (const w of words) {
      const test = line ? `${line} ${w}` : w
      if (ctx.measureText(test).width > canvas.width - 180) {
        lines.push(line)
        line = w
      } else {
        line = test
      }
    }
    if (line) lines.push(line)

    ctx.fillStyle = textColor
    ctx.textAlign = 'center'
    ctx.font = `56px ${fontFamily}`
    const top = 360
    lines.forEach((ln, i) => ctx.fillText(ln, canvas.width / 2, top + i * 74))

    ctx.font = `700 42px ${fontFamily}`
    ctx.fillStyle = '#D4A843'
    ctx.fillText(reference || 'Scripture', canvas.width / 2, top + lines.length * 74 + 54)
  }, [fontFamily, reference, showCross, textColor, theme, verse])

  const download = () => {
    const link = document.createElement('a')
    link.href = canvasRef.current.toDataURL('image/png')
    link.download = 'abidinganchor-verse.png'
    link.click()
  }

  const copyImage = async () => {
    const blob = await new Promise((resolve) => canvasRef.current.toBlob(resolve, 'image/png'))
    if (!blob || !navigator.clipboard?.write) return
    await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })])
  }

  const saveGallery = () => {
    const item = {
      id: Date.now(),
      image: canvasRef.current.toDataURL('image/png'),
      reference: reference || 'Scripture',
    }
    const next = [item, ...gallery].slice(0, 12)
    setGallery(next)
    localStorage.setItem(GALLERY_KEY, JSON.stringify(next))
  }

  return (
    <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '110px', paddingBottom: '110px', maxWidth: '680px', margin: '0 auto' }}>
      <h1 className="text-2xl font-bold text-white"><span style={{ color: '#D4A843' }}>🎨</span> Scripture Art</h1>

      <section className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md">
        <textarea value={verse} onChange={(e) => setVerse(e.target.value)} rows={4} className="w-full rounded-xl border border-white/20 bg-black/20 p-3 text-sm text-white" />
        <input value={reference} onChange={(e) => setReference(e.target.value)} className="mt-2 w-full rounded-xl border border-white/20 bg-black/20 p-3 text-sm text-white" placeholder="John 3:16" />
        <button type="button" onClick={() => setShowPicker(true)} className="mt-2 rounded-lg border border-[#D4A843] px-3 py-2 text-sm text-[#D4A843]">Pick a verse</button>
      </section>

      <section className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md">
        <p className="text-xs uppercase tracking-[0.12em] text-white/75">Background Theme</p>
        <div className="mt-2 flex flex-wrap gap-2">
          {Object.keys(themes).map((k) => (
            <button key={k} type="button" onClick={() => setTheme(k)} className="rounded-full border px-3 py-1 text-xs" style={{ borderColor: theme === k ? '#D4A843' : 'rgba(255,255,255,0.3)', color: theme === k ? '#D4A843' : '#fff' }}>
              {k}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs uppercase tracking-[0.12em] text-white/75">Font Style</p>
        <div className="mt-2 flex gap-2">
          {['Serif', 'Sans-serif', 'Elegant Script'].map((f) => (
            <button key={f} type="button" onClick={() => setFontStyle(f)} className="rounded-lg border px-3 py-1 text-xs" style={{ borderColor: fontStyle === f ? '#D4A843' : 'rgba(255,255,255,0.3)', color: fontStyle === f ? '#D4A843' : '#fff' }}>
              {f}
            </button>
          ))}
        </div>

        <p className="mt-4 text-xs uppercase tracking-[0.12em] text-white/75">Text Color</p>
        <div className="mt-2 flex gap-2">
          {textColors.map((c) => (
            <button key={c} type="button" onClick={() => setTextColor(c)} className="h-7 w-7 rounded-full border" style={{ background: c, borderColor: textColor === c ? '#D4A843' : 'rgba(255,255,255,0.3)' }} />
          ))}
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm text-white/90">
          <input type="checkbox" checked={showCross} onChange={(e) => setShowCross(e.target.checked)} />
          Decorative cross watermark
        </label>
      </section>

      <section className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md">
        <canvas ref={canvasRef} width={1080} height={1080} style={{ width: '100%', borderRadius: '12px' }} />
        <div className="mt-3 flex gap-2">
          <button type="button" onClick={download} className="rounded-xl px-3 py-2 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>Download Image</button>
          <button type="button" onClick={copyImage} className="rounded-xl border border-white/30 px-3 py-2 text-sm text-white">Copy to Clipboard</button>
          <button type="button" onClick={saveGallery} className="rounded-xl border border-[#D4A843]/60 px-3 py-2 text-sm text-[#D4A843]">Save to Gallery</button>
        </div>
      </section>

      <section className="mt-4 rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md">
        <p className="text-sm font-semibold text-[#D4A843]">Saved Gallery</p>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {gallery.map((item) => (
            <img key={item.id} src={item.image} alt={item.reference} className="h-24 w-full rounded-md object-cover" />
          ))}
        </div>
      </section>

      {showPicker ? (
        <div className="fixed inset-0 z-50 bg-black/60 p-4">
          <div className="mx-auto mt-20 max-h-[70vh] max-w-[680px] overflow-auto rounded-2xl border border-white/25 bg-[#0d1f4e] p-4 text-white">
            <div className="mb-2 flex items-center justify-between">
              <p className="font-semibold text-[#D4A843]">Pick a Verse</p>
              <button type="button" onClick={() => setShowPicker(false)}>✕</button>
            </div>
            <div className="space-y-2">
              {popularVerses.map((v) => (
                <button
                  key={v.ref}
                  type="button"
                  onClick={() => {
                    setVerse(v.text)
                    setReference(v.ref)
                    setShowPicker(false)
                  }}
                  className="w-full rounded-xl border border-white/20 bg-white/10 p-3 text-left"
                >
                  <p className="text-xs text-[#D4A843]">{v.ref}</p>
                  <p className="text-sm text-white/90">{v.text}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
