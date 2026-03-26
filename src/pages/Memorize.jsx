import { useMemo, useState } from 'react'

const memoryVerses = [
  { reference: 'John 3:16', text: 'For God so loved the world, that he gave his one and only Son, that whoever believes in him should not perish, but have eternal life.' },
  { reference: 'Philippians 4:13', text: 'I can do all things through Christ, who strengthens me.' },
  { reference: 'Proverbs 3:5', text: 'Trust in the Lord with all your heart, and do not lean on your own understanding.' },
  { reference: 'Psalm 23:1', text: 'The Lord is my shepherd; I shall not want.' },
  { reference: 'Romans 8:28', text: 'We know that all things work together for good for those who love God.' },
  { reference: 'Joshua 1:9', text: 'Be strong and courageous. Do not be afraid, for the Lord your God is with you.' },
  { reference: '2 Timothy 1:7', text: 'God did not give us a spirit of fear, but of power, love, and self-control.' },
  { reference: 'Isaiah 41:10', text: 'Do not be afraid, for I am with you. I will strengthen you. I will help you.' },
  { reference: 'Matthew 11:28', text: 'Come to me, all you who labor and are heavily burdened, and I will give you rest.' },
  { reference: '1 Peter 5:7', text: 'Casting all your worries on him, because he cares for you.' },
]

function hideWords(text, ratio) {
  const words = text.split(' ')
  const hideCount = Math.floor(words.length * ratio)
  const hidden = new Set()
  while (hidden.size < hideCount) hidden.add(Math.floor(Math.random() * words.length))
  return words.map((w, i) => (hidden.has(i) ? '___' : w))
}

export default function Memorize() {
  const [selected, setSelected] = useState(memoryVerses[0])
  const [customText, setCustomText] = useState('')
  const [customRef, setCustomRef] = useState('')
  const [round, setRound] = useState(0)
  const [revealed, setRevealed] = useState({})
  const [completed, setCompleted] = useState(false)

  const sourceText = customText.trim() ? customText.trim() : selected.text
  const sourceRef = customText.trim() ? customRef || 'Custom Verse' : selected.reference
  const ratios = [0, 0.25, 0.5, 0.75, 1]
  const tokens = useMemo(() => hideWords(sourceText, ratios[round]), [sourceText, round])

  const saveMemorized = () => {
    const existing = JSON.parse(localStorage.getItem('abidinganchor-memorized') || '[]')
    localStorage.setItem('abidinganchor-memorized', JSON.stringify([{ reference: sourceRef, text: sourceText }, ...existing]))
  }

  const nextRound = () => {
    if (round >= 4) {
      setCompleted(true)
      return
    }
    setRound((r) => r + 1)
    setRevealed({})
  }

  return (
    <div style={{ position: 'relative', minHeight: '100vh', overflow: 'hidden' }}>
      <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '220px', paddingBottom: '100px', maxWidth: '680px', margin: '0 auto', width: '100%' }}>
        <section className="space-y-4">
          <header>
            <h1 className="text-3xl font-bold" style={{ color: '#D4A843' }}>📖 Memorize</h1>
            <p className="text-white/85">Hide His Word in your heart</p>
          </header>

          <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md space-y-3">
            <div className="flex flex-wrap gap-2">
              {memoryVerses.map((v) => (
                <button key={v.reference} type="button" onClick={() => { setSelected(v); setCustomText(''); setRound(0); setCompleted(false) }} className="rounded-full border border-[#D4A843] px-3 py-1 text-xs text-[#D4A843]">
                  {v.reference}
                </button>
              ))}
            </div>
            <input value={customRef} onChange={(e) => setCustomRef(e.target.value)} placeholder="Or custom reference" className="w-full rounded-xl border border-white/20 bg-black/10 p-2 text-white placeholder:text-white/60" />
            <textarea value={customText} onChange={(e) => setCustomText(e.target.value)} rows={3} placeholder="Paste any verse..." className="w-full rounded-xl border border-white/20 bg-black/10 p-2 text-white placeholder:text-white/60" />
          </article>

          <article className="rounded-2xl border border-white/20 bg-white/10 p-4 backdrop-blur-md">
            <p className="text-sm text-[#D4A843]">{sourceRef}</p>
            <div className="mt-3 flex flex-wrap gap-2 leading-8 text-white">
              {tokens.map((token, i) => (
                <button key={`${token}-${i}`} type="button" onClick={() => setRevealed((r) => ({ ...r, [i]: true }))} className="rounded px-1">
                  {token === '___' && !revealed[i] ? '___' : sourceText.split(' ')[i]}
                </button>
              ))}
            </div>
            <div className="mt-4 flex gap-2">
              <button type="button" onClick={nextRound} className="rounded-lg px-3 py-1.5 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
                I got it! ✓
              </button>
              <button type="button" onClick={() => { setRound(0); setRevealed({}); }} className="rounded-lg border border-white/30 px-3 py-1.5 text-sm text-white">
                Show full verse
              </button>
            </div>
          </article>

          {completed && (
            <article className="rounded-2xl border border-[#D4A843] bg-white/10 p-4 text-center text-white backdrop-blur-md">
              <p className="text-lg text-[#D4A843]">You hid His Word in your heart! Psalm 119:11 💛</p>
              <button type="button" onClick={saveMemorized} className="mt-3 rounded-lg border border-[#D4A843] px-3 py-1.5 text-sm text-[#D4A843]">
                Add to Memorized List
              </button>
            </article>
          )}
        </section>
      </div>
    </div>
  )
}
