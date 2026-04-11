import { useMemo, useState } from 'react'

export default function DevotionalReader({
  devotional,
  isFavorite,
  isCompleted,
  onToggleFavorite,
  onComplete,
  onBack,
}) {
  const [copied, setCopied] = useState(false)
  const [justCompleted, setJustCompleted] = useState(false)

  const encouragement = useMemo(() => {
    if (!isCompleted && !justCompleted) return null
    return {
      reference: 'Psalm 119:105',
      text: 'Your word is a lamp for my feet, a light on my path.',
    }
  }, [isCompleted, justCompleted])

  const handleShare = async () => {
    const text = `${devotional.title}\n${devotional.scripture}\n"${devotional.verse}"`
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 1500)
    } catch {
      setCopied(false)
    }
  }

  const handleComplete = () => {
    onComplete()
    setJustCompleted(true)
  }

  return (
    <div className="content-scroll" style={{ padding: '0 16px', paddingTop: '140px', paddingBottom: '130px', maxWidth: '680px', margin: '0 auto' }}>
      <style>
        {`
          @keyframes devotional-shimmer {
            0% { box-shadow: 0 0 0 rgba(212,168,67,0); }
            50% { box-shadow: 0 0 30px rgba(212,168,67,0.35); }
            100% { box-shadow: 0 0 0 rgba(212,168,67,0); }
          }
        `}
      </style>
      <div className="mb-4 flex items-center justify-between">
        <button type="button" onClick={onBack} className="rounded-lg border border-white/30 px-3 py-1 text-sm text-white/85">
          ← Back
        </button>
        <span className="rounded-full border border-[#D4A843]/70 px-3 py-1 text-xs font-semibold uppercase tracking-[0.12em] text-[#D4A843]">
          {devotional.topic}
        </span>
      </div>

      <article
        className="glass-panel rounded-3xl p-5 text-white"
        style={{ animation: justCompleted ? 'devotional-shimmer 900ms ease' : 'none' }}
      >
        <h1 className="text-2xl font-bold" style={{ color: '#D4A843' }}>{devotional.title}</h1>
        <p className="mt-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/80">{devotional.scripture}</p>

        <div className="glass-panel mt-5 rounded-2xl border border-[#D4A843]/35 p-4">
          <p className="text-3xl leading-none text-[#D4A843]">"</p>
          <p className="mt-2 text-lg italic leading-relaxed [font-family:'Lora',serif] text-white/95">{devotional.verse}</p>
          <p className="mt-1 text-right text-3xl leading-none text-[#D4A843]">"</p>
        </div>

        <section className="mt-6 space-y-5">
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>📖 Reflection</h2>
            {devotional.reflection.split('\n\n').map((p) => (
              <p key={p.slice(0, 24)} className="mt-2 text-sm leading-relaxed text-white/90">{p}</p>
            ))}
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>🙏 Prayer</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/90">{devotional.prayer}</p>
          </div>
          <div>
            <h2 className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>✏️ Application</h2>
            <p className="mt-2 text-sm leading-relaxed text-white/90">{devotional.application}</p>
          </div>
        </section>
      </article>

      {encouragement ? (
        <div className="glass-panel mt-4 rounded-2xl border border-[#D4A843]/45 p-4 text-center text-white">
          <p className="text-sm font-semibold text-[#D4A843]">You&apos;ve completed today&apos;s devotional</p>
          <p className="mt-2 text-sm italic text-white/90">{encouragement.text}</p>
          <p className="mt-1 text-xs uppercase tracking-[0.12em] text-white/70">{encouragement.reference}</p>
        </div>
      ) : null}

      <div
        className="glass-panel fixed left-1/2 z-40 flex w-[min(680px,calc(100%-24px))] -translate-x-1/2 items-center gap-2 rounded-2xl p-3"
        style={{ bottom: '86px' }}
      >
        <button type="button" onClick={onToggleFavorite} className="flex-1 rounded-xl border border-white/25 px-3 py-2 text-sm text-white">
          {isFavorite ? '❤️ Saved' : '🤍 Save'}
        </button>
        <button type="button" onClick={handleShare} className="flex-1 rounded-xl border border-[#D4A843]/60 px-3 py-2 text-sm text-[#D4A843]">
          {copied ? 'Copied!' : '📤 Share'}
        </button>
        <button type="button" onClick={handleComplete} className="flex-1 rounded-xl px-3 py-2 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
          {isCompleted ? '✅ Completed' : '✅ Mark Complete'}
        </button>
      </div>
    </div>
  )
}
