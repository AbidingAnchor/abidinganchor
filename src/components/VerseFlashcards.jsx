import { useEffect, useMemo, useRef, useState } from 'react'
import ReactDOM from 'react-dom'
import { VERSE_FLASHCARDS, FLASHCARD_FILTER_OPTIONS } from '../data/verseFlashcards'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'
import { useTranslation } from 'react-i18next'

function readProgress(storageKey) {
  try {
    const raw = localStorage.getItem(storageKey)
    return raw ? JSON.parse(raw) : {}
  } catch {
    return {}
  }
}

function writeProgress(storageKey, obj) {
  localStorage.setItem(storageKey, JSON.stringify(obj))
}



function ProgressRing({ percent }) {
  const r = 18
  const c = 2 * Math.PI * r
  const dash = (percent / 100) * c
  return (
    <svg width="44" height="44" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r={r} stroke="#E8D9B8" strokeWidth="4" fill="none" />
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
      <text x="22" y="26" textAnchor="middle" fontSize="10" fill="#D4A843" fontWeight="700">
        {Math.round(percent)}%
      </text>
    </svg>
  )
}

export default function VerseFlashcards({ onExit, onMemorizedChange, fillVertical = false }) {
  const { t } = useTranslation()
  
  const matchesFilter = (verse, filter) => {
    if (filter === 'flashcards.all') return true
    if (filter === 'flashcards.bookGroups.oldTestament') return verse.bookGroup === 'flashcards.bookGroups.oldTestament'
    if (filter === 'flashcards.bookGroups.newTestament') return verse.bookGroup === 'flashcards.bookGroups.newTestament'
    if (filter === 'flashcards.bookGroups.psalms') return verse.bookGroup === 'flashcards.bookGroups.psalms'
    if (filter === 'flashcards.bookGroups.proverbs') return verse.bookGroup === 'flashcards.bookGroups.proverbs'
    if (filter === 'flashcards.themes.faith') return verse.theme === 'flashcards.themes.faith'
    if (filter === 'flashcards.themes.hope') return verse.theme === 'flashcards.themes.hope'
    if (filter === 'flashcards.themes.love') return verse.theme === 'flashcards.themes.love'
    if (filter === 'flashcards.themes.strength') return verse.theme === 'flashcards.themes.strength'
    return true
  }

  const translateFilterOption = (option) => {
    return t(option);
  };

  const { user } = useAuth()
  const progressKey = useMemo(() => userStorageKey(user?.id, 'verse-progress'), [user?.id])
  const [progress, setProgress] = useState({})
  const [category, setCategory] = useState('flashcards.all')
  const [idx, setIdx] = useState(0)
  const [flipped, setFlipped] = useState(false)
  const [checkFlash, setCheckFlash] = useState(false)
  const [filterMenuOpen, setFilterMenuOpen] = useState(false)
  const [buttonPosition, setButtonPosition] = useState(null)
  const filterMenuRef = useRef(null)
  const buttonRef = useRef(null)

  useEffect(() => {
    if (filterMenuOpen && buttonRef.current) {
      const rect = buttonRef.current.getBoundingClientRect()
      setButtonPosition({
        top: rect.bottom + window.scrollY + 8,
        right: window.innerWidth - rect.right,
      })
    } else {
      setButtonPosition(null)
    }
  }, [filterMenuOpen])

  useEffect(() => {
    setProgress(readProgress(progressKey))
  }, [progressKey])

  useEffect(() => {
    if (!filterMenuOpen) return
    const onDoc = (e) => {
      if (
        filterMenuRef.current && !filterMenuRef.current.contains(e.target) &&
        !e.target.closest('[data-filter-portal]')
      ) {
        setFilterMenuOpen(false)
      }
    }
    document.addEventListener('mousedown', onDoc)
    return () => document.removeEventListener('mousedown', onDoc)
  }, [filterMenuOpen])

  const filtered = useMemo(
    () => VERSE_FLASHCARDS.filter((v) => matchesFilter(v, category)),
    [category],
  )

  const memorizedCount = useMemo(
    () => Object.values(progress).filter((p) => p?.memorized).length,
    [progress],
  )
  const percent = (memorizedCount / VERSE_FLASHCARDS.length) * 100

  const safeLen = filtered.length || 1
  const current = filtered[idx % safeLen]
  const currentProg = current ? progress[current.id]?.memorized : false

  if (!current) {
    return (
      <div className="home-gold-glass" style={{ borderRadius: '20px', padding: '16px' }}>
        <p style={{ color: '#D4A843', fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 12px 0' }}>
          📖 {t('flashcards.title')}
        </p>
        <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '14px', margin: '0 0 12px 0' }}>{t('flashcards.noVersesMatch')}</p>
        <button type="button" onClick={onExit} style={{ fontSize: '12px', color: 'rgba(212,168,67,0.8)', background: 'none', border: 'none', cursor: 'pointer' }}>
          ← {t('common.back')}
        </button>
      </div>
    )
  }

  const mark = (memorized) => {
    const next = {
      ...progress,
      [current.id]: {
        memorized,
        updatedAt: new Date().toISOString(),
        ref: current.ref,
        category: current.theme,
        bookGroup: current.bookGroup,
      },
    }
    setProgress(next)
    writeProgress(progressKey, next)
    if (memorized) {
      setCheckFlash(true)
      setTimeout(() => setCheckFlash(false), 600)
    }
    onMemorizedChange?.(next)
    setFlipped(false)
    setIdx((i) => i + 1)
  }

  return (
    <div
      className={`home-gold-glass ${fillVertical ? 'flex min-h-0 w-full max-w-full flex-col' : ''}`}
      style={{ borderRadius: '20px', padding: '16px' }}
    >
      <style>
        {`
          /* ── Flip mechanics (unchanged) ── */
          .flip-wrap { perspective: 1200px; }
          .verse-flip-card {
            transform-style: preserve-3d;
            transition: transform 520ms ease;
            display: block; width: 100%; height: 100%; min-height: 0;
          }
          .verse-flip-card.flipped { transform: rotateY(180deg); }
          .verse-flip-card .flip-face {
            position: absolute; inset: 0;
            backface-visibility: hidden; -webkit-backface-visibility: hidden;
            border-radius: 1rem;
          }
          .verse-flip-card .flip-back { transform: rotateY(180deg); }
          @keyframes check-pop { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.08);opacity:1} 100%{transform:scale(1);opacity:1} }

          /* ── Filter dropdown scroll ── */
          .verse-flashcard-filter-scroll { scrollbar-width: thin; scrollbar-color: rgba(212,168,67,0.5) rgba(255,255,255,0.06); }
          .verse-flashcard-filter-scroll::-webkit-scrollbar { width: 6px; }
          .verse-flashcard-filter-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
          .verse-flashcard-filter-scroll::-webkit-scrollbar-thumb { background: rgba(212,168,67,0.45); border-radius: 4px; }
          .verse-flashcard-filter-option:hover { background: rgba(212,168,67,0.12) !important; }

          /* ── TAP TO FLIP pulse label ── */
          @keyframes fc-pulse { 0%,100%{opacity:0.7} 50%{opacity:1} }
          .fc-tap-label {
            display: inline-block;
            font-size: 9px; font-weight: 700;
            text-transform: uppercase; letter-spacing: 0.2em;
            color: rgba(212,175,55,0.7);
            animation: fc-pulse 2s ease-in-out infinite;
          }

          /* ── Flashcard faces ── */
          .fc-front {
            position: absolute; inset: 0;
            backface-visibility: hidden; -webkit-backface-visibility: hidden;
            transform: rotateY(0deg);
            padding: 24px;
            display: flex; flex-direction: column; justify-content: space-between; overflow-y: auto;
            background: rgba(15,20,45,0.92);
            backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
            border-top: 1px solid rgba(212,175,55,0.12);
            border-right: 1px solid rgba(212,175,55,0.08);
            border-bottom: 1px solid rgba(212,175,55,0.08);
            border-left: 4px solid rgba(212,175,55,0.6);
            box-shadow: 0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(212,175,55,0.15);
            border-radius: 20px;
            cursor: pointer;
          }
          .fc-front::after {
            content: '';
            position: absolute; inset: 0; border-radius: 20px;
            background: linear-gradient(135deg, rgba(212,175,55,0.04) 0%, transparent 50%, rgba(212,175,55,0.02) 100%);
            pointer-events: none;
          }
          .fc-back {
            position: absolute; inset: 0;
            backface-visibility: hidden; -webkit-backface-visibility: hidden;
            transform: rotateY(180deg);
            cursor: pointer;
            padding: 24px;
            display: flex; flex-direction: column; overflow: hidden; text-align: center;
            background: rgba(10,18,50,0.95);
            backdrop-filter: blur(18px); -webkit-backdrop-filter: blur(18px);
            border-top: 1px solid rgba(150,200,255,0.12);
            border-right: 1px solid rgba(150,200,255,0.08);
            border-bottom: 1px solid rgba(150,200,255,0.08);
            border-left: 4px solid rgba(150,200,255,0.5);
            box-shadow: 0 8px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(150,200,255,0.1);
            border-radius: 20px;
          }

          /* ── Action buttons ── */
          .fc-btn-learning {
            background: rgba(15,20,45,0.9);
            backdrop-filter: blur(14px); -webkit-backdrop-filter: blur(14px);
            border-top: 1px solid rgba(180,180,220,0.15);
            border-right: 1px solid rgba(180,180,220,0.1);
            border-bottom: 1px solid rgba(180,180,220,0.1);
            border-left: 4px solid rgba(180,180,220,0.5);
            box-shadow: inset 3px 0 14px rgba(180,180,220,0.15), 0 2px 12px rgba(0,0,0,0.35);
            border-radius: 12px;
            padding: 13px 16px;
            font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
            color: #cbd5e1;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .fc-btn-learning:hover {
            background: rgba(25,30,65,0.97);
            border-left-color: rgba(200,200,255,0.8);
            box-shadow: inset 3px 0 18px rgba(180,180,220,0.28), 0 2px 12px rgba(0,0,0,0.35);
            transform: scale(1.02);
          }
          .fc-btn-memorized {
            background: linear-gradient(135deg, #C8960C, #D4AF37, #F0C040);
            border: none;
            box-shadow: 0 4px 20px rgba(212,175,55,0.4), inset 0 1px 0 rgba(255,255,255,0.2);
            border-radius: 12px;
            padding: 13px 16px;
            font-size: 13px; font-weight: 700; letter-spacing: 0.04em;
            color: #1a0e00;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .fc-btn-memorized:hover {
            box-shadow: 0 6px 28px rgba(212,175,55,0.6), inset 0 1px 0 rgba(255,255,255,0.25);
            transform: scale(1.02);
          }

          /* ── Nav prev/next ── */
          .fc-nav-btn {
            font-size: 13px; font-weight: 600; letter-spacing: 0.04em;
            color: rgba(212,175,55,0.8);
            background: none; border: none; cursor: pointer;
            transition: all 0.2s ease;
          }
          .fc-nav-btn:hover { color: #fbbf24; }
          .fc-nav-prev:hover { transform: translateX(-3px); }
          .fc-nav-next:hover { transform: translateX(3px); }
        `}
      </style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '14px', flexShrink: 0 }}>
        <p style={{ color: '#fbbf24', fontSize: '12px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>
          📖 {t('flashcards.title')}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span className="home-gold-glass" style={{ border: '1px solid rgba(212,175,55,0.4)', color: '#fbbf24', fontSize: '11px', fontWeight: 700, padding: '3px 12px', borderRadius: '50px' }}>
            {((idx % safeLen) + 1)}/{safeLen}
          </span>
          <button type="button" onClick={onExit}
            style={{ fontSize: '12px', color: 'rgba(212,175,55,0.7)', background: 'none', border: 'none', cursor: 'pointer', transition: 'color 0.2s ease', fontWeight: 600 }}
            onMouseEnter={e => e.currentTarget.style.color = '#fbbf24'}
            onMouseLeave={e => e.currentTarget.style.color = 'rgba(212,175,55,0.7)'}
          >
            ← {t('common.back')}
          </button>
        </div>
      </div>

      <div className="home-gold-glass" style={{ borderRadius: '16px', padding: '12px', marginBottom: '12px', flexShrink: 0, display: 'flex', flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: '10px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <div style={{ filter: 'drop-shadow(0 0 6px rgba(212,175,55,0.5))' }}>
            <ProgressRing percent={percent} />
          </div>
          <div>
            <p style={{ color: '#ffffff', fontSize: '13px', fontWeight: 600, margin: '0 0 2px 0' }}>{t('flashcards.progress')}</p>
            <p style={{ color: 'rgba(212,175,55,0.6)', fontSize: '12px', margin: 0 }}>
              {memorizedCount} {t('flashcards.memorized')} • {VERSE_FLASHCARDS.length} {t('flashcards.total')}
            </p>
          </div>
        </div>
        <div className="relative" ref={filterMenuRef}>
          <button
            type="button"
            ref={buttonRef}
            onClick={() => setFilterMenuOpen((o) => !o)}
            className="home-gold-glass"
            style={{ display: 'flex', alignItems: 'center', gap: '6px', borderRadius: '10px', padding: '7px 12px', fontSize: '11px', fontWeight: 600, color: '#D4A843', cursor: 'pointer', border: '1px solid rgba(212,175,55,0.4)', maxWidth: '160px' }}
            aria-expanded={filterMenuOpen}
            aria-haspopup="listbox"
          >
            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{translateFilterOption(category)}</span>
            <span style={{ flexShrink: 0 }} aria-hidden>▼</span>
          </button>
        </div>
      </div>

      <div className="flip-wrap relative w-full shrink-0">
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
            {t('flashcards.memorizedCheck')}
          </div>
        ) : null}

        {/* Flashcard — flip wrapper */}
        <div style={{ perspective: '1000px', width: '100%', height: '280px' }}>
          <div style={{
            position: 'relative', width: '100%', height: '100%',
            transformStyle: 'preserve-3d',
            transition: 'transform 520ms ease',
            transform: flipped ? 'rotateY(180deg)' : 'rotateY(0deg)',
          }}>
            {/* FRONT */}
            <div className="fc-front" onClick={() => setFlipped(true)}>
              <div>
                <span className="fc-tap-label">{t('flashcards.tapToFlip')}</span>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, color: '#D4AF37', margin: '10px 0 16px', lineHeight: 1.25, fontFamily: 'Georgia, "Times New Roman", serif' }}>
                  {current.ref}
                </p>
                <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(212,175,55,0.5)', margin: '0 0 3px 0' }}>{t('flashcards.category')}</p>
                <p style={{ fontSize: '13px', color: '#E8D5A3', margin: '0 0 10px 0' }}>{t(current.bookGroup)}</p>
                <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.14em', color: 'rgba(212,175,55,0.5)', margin: '0 0 3px 0' }}>{t('flashcards.theme')}</p>
                <p style={{ fontSize: '13px', color: '#E8D5A3', margin: 0 }}>{t(current.theme)}</p>
              </div>
              <p style={{ fontSize: '10px', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.14em', fontStyle: 'italic', color: currentProg ? 'rgba(74,222,128,0.6)' : 'rgba(212,175,55,0.3)', marginTop: '8px' }}>
                {currentProg ? '✓ ' + t('flashcards.memorized') : t('flashcards.statusStillLearning')}
              </p>
            </div>
            {/* BACK */}
            <div className="fc-back" onClick={() => setFlipped(false)}>
              <div style={{ display: 'flex', minHeight: 0, flex: 1, flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '0.75rem' }}>
                <p style={{ fontSize: '9px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.18em', color: 'rgba(150,200,255,0.6)' }}>
                  {t('flashcards.tapToFlipBack')}
                </p>
                <p style={{ minHeight: 0, width: '100%', flex: 1, overflowY: 'auto', fontSize: '1.05rem', lineHeight: 1.75, color: '#e2e8f0', fontFamily: 'Lora, Georgia, serif', fontStyle: 'italic' }}>
                  {current.text}
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginTop: '12px', flexShrink: 0 }}>
        <button type="button" className="fc-btn-learning" onClick={() => mark(false)}>
          {t('flashcards.stillLearning')}
        </button>
        <button type="button" className="fc-btn-memorized" onClick={() => mark(true)}>
          {t('flashcards.memorized')}
        </button>
      </div>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '10px', flexShrink: 0 }}>
        <button type="button" className="fc-nav-btn fc-nav-prev"
          onClick={() => { setIdx((i) => (i - 1 + safeLen) % safeLen); setFlipped(false) }}>
          ← {t('flashcards.prev')}
        </button>
        <span style={{ fontSize: '12px', color: 'rgba(212,175,55,0.55)', fontWeight: 600 }}>
          {t('flashcards.cardCount', { current: ((idx % safeLen) + 1), total: safeLen })}
        </span>
        <button type="button" className="fc-nav-btn fc-nav-next"
          onClick={() => { setIdx((i) => (i + 1) % safeLen); setFlipped(false) }}>
          {t('flashcards.next')} →
        </button>
      </div>

      {filterMenuOpen &&
        ReactDOM.createPortal(
          <div
            data-filter-portal=""
            style={{
              position: 'fixed',
              top: buttonPosition?.top + 'px',
              right: buttonPosition?.right + 'px',
              zIndex: 9999,
            }}
          >
            <ul
              className="verse-flashcard-filter-scroll max-h-[min(280px,50vh)] w-full min-w-[200px] max-w-[220px] overflow-y-auto rounded-lg py-1 shadow-xl"
              role="listbox"
              style={{
                background: 'rgba(12, 20, 38, 0.98)',
                border: '1px solid rgba(212, 168, 67, 0.35)',
                boxShadow: '0 12px 40px rgba(0,0,0,0.45)',
              }}
            >
              {FLASHCARD_FILTER_OPTIONS.map((c) => (
                <li key={c} role="option" aria-selected={c === category}>
                  <button
                    type="button"
                    className="verse-flashcard-filter-option w-full px-3 py-2.5 text-left text-xs text-white transition-colors"
                    style={
                      c === category
                        ? { background: 'rgba(212, 168, 67, 0.22)', color: '#fff' }
                        : { background: 'transparent' }
                    }
                    onClick={() => {
                      setCategory(c)
                      setIdx(0)
                      setFlipped(false)
                      setFilterMenuOpen(false)
                    }}
                  >
                    {translateFilterOption(c)}
                  </button>
                </li>
              ))}
            </ul>
          </div>,
          document.body
        )}
    </div>
  )
}
