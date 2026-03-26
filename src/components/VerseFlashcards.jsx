import { useMemo, useState } from 'react'

const KEY = 'abidinganchor-verse-progress'

function readProgress() {
  try {
    const raw = localStorage.getItem(KEY)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeProgress(obj) {
  localStorage.setItem(KEY, JSON.stringify(obj))
}

const VERSES = [
  { id: 'faith-heb-11-1', category: 'Faith', ref: 'Hebrews 11:1', text: 'Now faith is assurance of things hoped for, proof of things not seen.' },
  { id: 'faith-2cor-5-7', category: 'Faith', ref: '2 Corinthians 5:7', text: 'For we walk by faith, not by sight.' },
  { id: 'faith-rom-10-17', category: 'Faith', ref: 'Romans 10:17', text: 'So faith comes by hearing, and hearing by the word of God.' },
  { id: 'hope-heb-6-19', category: 'Hope', ref: 'Hebrews 6:19', text: 'This hope we have as an anchor of the soul, sure and steadfast.' },
  { id: 'hope-rom-15-13', category: 'Hope', ref: 'Romans 15:13', text: 'Now may the God of hope fill you with all joy and peace in believing.' },
  { id: 'hope-lam-3-24', category: 'Hope', ref: 'Lamentations 3:24', text: 'The Lord is my portion, says my soul. Therefore I will hope in him.' },
  { id: 'love-jn-3-16', category: 'Love', ref: 'John 3:16', text: 'For God so loved the world, that he gave his one and only Son...' },
  { id: 'love-1cor-13-4', category: 'Love', ref: '1 Corinthians 13:4', text: 'Love is patient and is kind. Love does not envy. Love does not brag, is not proud.' },
  { id: 'love-1jn-4-19', category: 'Love', ref: '1 John 4:19', text: 'We love him, because he first loved us.' },
  { id: 'strength-phil-4-13', category: 'Strength', ref: 'Philippians 4:13', text: 'I can do all things through Christ, who strengthens me.' },
  { id: 'strength-isa-41-10', category: 'Strength', ref: 'Isaiah 41:10', text: 'Do not be afraid, for I am with you... I will strengthen you.' },
  { id: 'strength-ps-46-1', category: 'Strength', ref: 'Psalm 46:1', text: 'God is our refuge and strength, a very present help in trouble.' },
  { id: 'peace-jn-14-27', category: 'Peace', ref: 'John 14:27', text: 'Peace I leave with you. My peace I give to you.' },
  { id: 'peace-phil-4-7', category: 'Peace', ref: 'Philippians 4:7', text: 'The peace of God... will guard your hearts and your thoughts in Christ Jesus.' },
  { id: 'peace-isa-26-3', category: 'Peace', ref: 'Isaiah 26:3', text: 'You will keep whoever is steadfast in perfect peace, because they trust in you.' },
  { id: 'salv-eph-2-8', category: 'Salvation', ref: 'Ephesians 2:8', text: 'For by grace you have been saved through faith... it is the gift of God.' },
  { id: 'salv-rom-10-9', category: 'Salvation', ref: 'Romans 10:9', text: 'If you will confess with your mouth Jesus as Lord... you will be saved.' },
  { id: 'salv-acts-4-12', category: 'Salvation', ref: 'Acts 4:12', text: 'There is salvation in no one else...' },
  { id: 'hope-jer-29-11', category: 'Hope', ref: 'Jeremiah 29:11', text: 'For I know the thoughts that I think toward you... to give you hope and a future.' },
  { id: 'faith-mk-11-24', category: 'Faith', ref: 'Mark 11:24', text: 'Whatever things you ask in prayer, believe that you receive them...' },
  { id: 'peace-ps-4-8', category: 'Peace', ref: 'Psalm 4:8', text: 'In peace I will both lay myself down and sleep...' },
  { id: 'strength-josh-1-9', category: 'Strength', ref: 'Joshua 1:9', text: 'Be strong and courageous. Do not be afraid...' },
  { id: 'love-jn-15-12', category: 'Love', ref: 'John 15:12', text: 'This is my commandment, that you love one another...' },
  { id: 'salv-jn-1-12', category: 'Salvation', ref: 'John 1:12', text: 'But as many as received him... he gave the right to become children of God.' },
  { id: 'peace-col-3-15', category: 'Peace', ref: 'Colossians 3:15', text: 'Let the peace of God rule in your hearts...' },
  { id: 'hope-ps-42-11', category: 'Hope', ref: 'Psalm 42:11', text: 'Why are you in despair, my soul? Hope in God.' },
  { id: 'faith-gal-2-20', category: 'Faith', ref: 'Galatians 2:20', text: 'I have been crucified with Christ... Christ lives in me.' },
  { id: 'strength-2cor-12-9', category: 'Strength', ref: '2 Corinthians 12:9', text: 'My grace is sufficient for you, for my power is made perfect in weakness.' },
  { id: 'salv-jn-14-6', category: 'Salvation', ref: 'John 14:6', text: 'I am the way, the truth, and the life. No one comes to the Father except through me.' },
  { id: 'love-rom-8-38', category: 'Love', ref: 'Romans 8:38-39', text: 'Nothing... will be able to separate us from the love of God...' },
]

function ProgressRing({ percent }) {
  const r = 18
  const c = 2 * Math.PI * r
  const dash = (percent / 100) * c
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} stroke="rgba(255,255,255,0.18)" strokeWidth="4" fill="none" />
      <circle
        cx="22"
        cy="22"
        r={r}
        stroke="#D4A843"
        strokeWidth="4"
        fill="none"
        strokeDasharray={`${dash} ${c - dash}`}
        strokeLinecap="round"
        transform="rotate(-90 22 22)"
      />
      <text x="22" y="26" textAnchor="middle" fontSize="10" fill="rgba(255,255,255,0.85)" fontWeight="700">
        {Math.round(percent)}%
      </text>
    </svg>
  )
}

export default function VerseFlashcards({ onExit, onMemorizedChange }) {
  const [progress, setProgress] = useState(() => readProgress())
  const [category, setCategory] = useState('All')
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [checkFlash, setCheckFlash] = useState(false)

  const categories = useMemo(() => ['All', ...Array.from(new Set(VERSES.map((v) => v.category)))], [])
  const filtered = useMemo(() => (category === 'All' ? VERSES : VERSES.filter((v) => v.category === category)), [category])

  const memorizedCount = useMemo(
    () => Object.values(progress).filter((p) => p?.memorized).length,
    [progress],
  )
  const percent = (memorizedCount / VERSES.length) * 100

  const current = filtered[idx % filtered.length]
  const currentProg = progress[current.id]?.memorized

  const mark = (memorized) => {
    const next = {
      ...progress,
      [current.id]: { memorized, updatedAt: new Date().toISOString(), ref: current.ref, category: current.category },
    }
    setProgress(next)
    writeProgress(next)
    if (memorized) {
      setCheckFlash(true)
      setTimeout(() => setCheckFlash(false), 600)
    }
    onMemorizedChange?.(next)
    setFlipped(false)
    setIdx((i) => i + 1)
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md">
      <style>
        {`
          .flip-wrap { perspective: 1200px; }
          .flip-card { transform-style: preserve-3d; transition: transform 520ms ease; }
          .flip-card.flipped { transform: rotateY(180deg); }
          .flip-face { backface-visibility: hidden; }
          .flip-back { transform: rotateY(180deg); }
          @keyframes check-pop { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.08);opacity:1} 100%{transform:scale(1);opacity:1} }
        `}
      </style>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>
          📖 Verse Flashcards
        </p>
        <button type="button" onClick={onExit} className="text-xs text-white/70">
          ← Back
        </button>
      </div>

      <div className="mb-3 flex items-center justify-between gap-2 rounded-xl border border-white/15 bg-black/10 p-3">
        <div className="flex items-center gap-2">
          <ProgressRing percent={percent} />
          <div>
            <p className="text-sm font-semibold text-white">Progress</p>
            <p className="text-xs text-white/70">
              {memorizedCount} memorized • {VERSES.length} total
            </p>
          </div>
        </div>
        <select
          value={category}
          onChange={(e) => {
            setCategory(e.target.value)
            setIdx(0)
            setFlipped(false)
          }}
          className="rounded-lg border border-white/20 bg-black/20 px-2 py-2 text-xs text-white"
        >
          {categories.map((c) => (
            <option key={c} value={c}>
              {c}
            </option>
          ))}
        </select>
      </div>

      <div className="flip-wrap relative">
        {checkFlash ? (
          <div
            aria-hidden="true"
            style={{
              position: 'absolute',
              top: '10px',
              right: '10px',
              zIndex: 5,
              background: 'rgba(212,168,67,0.18)',
              border: '1px solid rgba(212,168,67,0.55)',
              borderRadius: '999px',
              padding: '8px 10px',
              color: '#D4A843',
              fontWeight: 800,
              animation: 'check-pop 600ms ease',
            }}
          >
            ✓ Memorized
          </div>
        ) : null}

        <button
          type="button"
          onClick={() => setFlipped((f) => !f)}
          className={`flip-card w-full rounded-2xl border border-white/15 bg-black/10 p-0 text-left ${flipped ? 'flipped' : ''}`}
          style={{ minHeight: '220px' }}
        >
          <div className="flip-face rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Tap to flip</p>
            <p className="mt-2 text-xl font-bold" style={{ color: '#D4A843' }}>
              {current.ref}
            </p>
            <p className="mt-2 text-sm text-white/75">{current.category}</p>
            <p className="mt-4 text-xs text-white/60">{currentProg ? 'Status: Memorized' : 'Status: Still Learning'}</p>
          </div>
          <div className="flip-face flip-back rounded-2xl p-5">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">Tap to flip back</p>
            <p className="mt-3 text-lg text-white [font-family:'Lora',serif] italic">{current.text}</p>
          </div>
        </button>
      </div>

      <div className="mt-3 grid grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => mark(false)}
          className="rounded-xl border border-white/20 bg-white/5 px-4 py-3 text-sm font-semibold text-white"
        >
          Still Learning
        </button>
        <button
          type="button"
          onClick={() => mark(true)}
          className="rounded-xl px-4 py-3 text-sm font-semibold text-[#1a1a1a]"
          style={{ background: '#D4A843' }}
        >
          Memorized ✓
        </button>
      </div>

      <div className="mt-2 flex items-center justify-between text-xs text-white/70">
        <button type="button" onClick={() => { setIdx((i) => (i - 1 + filtered.length) % filtered.length); setFlipped(false) }}>
          ← Prev
        </button>
        <span>
          Card {((idx % filtered.length) + 1)} / {filtered.length}
        </span>
        <button type="button" onClick={() => { setIdx((i) => (i + 1) % filtered.length); setFlipped(false) }}>
          Next →
        </button>
      </div>
    </div>
  )
}

