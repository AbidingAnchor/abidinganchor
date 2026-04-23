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
      if (filterMenuRef.current && !filterMenuRef.current.contains(e.target)) setFilterMenuOpen(false)
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
      <div className="glass-panel rounded-2xl p-4 text-white">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>
          📖 {t('flashcards.title')}
        </p>
        <p className="mt-4 text-sm text-white/80">{t('flashcards.noVersesMatch')}</p>
        <button type="button" onClick={onExit} className="mt-4 text-xs text-white/70">
          {t('common.back')}
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
      className={`glass-panel rounded-2xl p-4 text-white ${fillVertical ? 'flex min-h-0 w-full max-w-full flex-col' : ''}`}
    >
      <style>
        {`
          .flip-wrap { perspective: 1200px; }
          .verse-flip-card {
            transform-style: preserve-3d;
            transition: transform 520ms ease;
            display: block;
            width: 100%;
            height: 100%;
            min-height: 0;
          }
          .verse-flip-card.flipped { transform: rotateY(180deg); }
          .verse-flip-card .flip-face {
            position: absolute;
            inset: 0;
            backface-visibility: hidden;
            -webkit-backface-visibility: hidden;
            border-radius: 1rem;
          }
          .verse-flip-card .flip-back { transform: rotateY(180deg); }
          @keyframes check-pop { 0%{transform:scale(0.6);opacity:0} 60%{transform:scale(1.08);opacity:1} 100%{transform:scale(1);opacity:1} }
          .verse-flashcard-filter-scroll { scrollbar-width: thin; scrollbar-color: rgba(212,168,67,0.5) rgba(255,255,255,0.06); }
          .verse-flashcard-filter-scroll::-webkit-scrollbar { width: 6px; }
          .verse-flashcard-filter-scroll::-webkit-scrollbar-track { background: rgba(255,255,255,0.05); border-radius: 4px; }
          .verse-flashcard-filter-scroll::-webkit-scrollbar-thumb { background: rgba(212,168,67,0.45); border-radius: 4px; }
          .verse-flashcard-filter-option:hover { background: rgba(212, 168, 67, 0.12) !important; }
        `}
      </style>

      <div className="mb-3 flex shrink-0 items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>
          📖 {t('flashcards.title')}
        </p>
        <button type="button" onClick={onExit} className="text-xs text-white/70">
          {t('common.back')}
        </button>
      </div>

      <div className="mb-3 flex shrink-0 flex-col gap-2 sm:flex-row sm:items-center sm:justify-between glass-panel rounded-xl p-3">
        <div className="flex items-center gap-2">
          <ProgressRing percent={percent} />
          <div>
            <p className="text-sm font-semibold text-white">{t('flashcards.progress')}</p>
            <p className="text-xs text-white/70">
              {memorizedCount} {t('flashcards.memorized')} • {VERSE_FLASHCARDS.length} {t('flashcards.total')}
            </p>
          </div>
        </div>
        <div className="relative w-full sm:max-w-[220px]" ref={filterMenuRef}>
          <button
            type="button"
            ref={buttonRef}
            onClick={() => setFilterMenuOpen((o) => !o)}
            className="flex w-full items-center justify-between gap-2 rounded-lg px-3 py-2 text-left text-xs font-medium text-white sm:max-w-[220px]"
            style={{
              background: 'rgba(15, 23, 41, 0.92)',
              border: '1px solid rgba(212, 168, 67, 0.35)',
              boxShadow: 'inset 0 1px 0 rgba(255,255,255,0.04)',
            }}
            aria-expanded={filterMenuOpen}
            aria-haspopup="listbox"
          >
            <span className="truncate">{translateFilterOption(category)}</span>
            <span className="shrink-0 text-[#D4A843]/90" aria-hidden>
              ▼
            </span>
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

        {/* Compact card (max 280px); glass-panel picks up day / evening / night from body + index.css */}
        <div className="relative h-[260px] w-full max-h-[280px]">
          <button
            type="button"
            onClick={() => setFlipped((f) => !f)}
            className={`verse-flip-card glass-panel h-full w-full rounded-2xl p-0 text-left ${flipped ? 'flipped' : ''}`}
          >
            <div className="flip-face flex flex-col justify-between overflow-y-auto p-5 md:p-6">
              <div className="min-h-0">
                <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">{t('flashcards.tapToFlip')}</p>
                <p className="mt-2 text-lg font-bold leading-snug md:text-xl" style={{ color: '#D4A843' }}>
                  {current.ref}
                </p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">{t('flashcards.category')}</p>
                <p className="mt-0.5 text-sm text-white/90">{t(current.bookGroup)}</p>
                <p className="mt-2 text-[10px] font-semibold uppercase tracking-[0.1em] text-white/55">{t('flashcards.theme')}</p>
                <p className="mt-0.5 text-sm text-white/85">{t(current.theme)}</p>
              </div>
              <p className="mt-3 shrink-0 text-xs text-white/60">
                {currentProg ? t('flashcards.memorized') : t('flashcards.statusStillLearning')}
              </p>
            </div>
            <div className="flip-face flip-back flex flex-col overflow-hidden p-5 text-center md:p-6">
              <div className="flex min-h-0 flex-1 flex-col items-center justify-center gap-2">
                <p className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.14em] text-white/70">
                  {t('flashcards.tapToFlipBack')}
                </p>
                <p className="min-h-0 w-full max-w-full flex-1 overflow-y-auto text-base leading-relaxed text-white [font-family:'Lora',serif] italic md:text-lg md:leading-relaxed">
                  {current.text}
                </p>
              </div>
            </div>
          </button>
        </div>
      </div>

      <div className="mt-3 grid shrink-0 grid-cols-2 gap-2">
        <button
          type="button"
          onClick={() => mark(false)}
          className="glass-panel rounded-xl px-4 py-3 text-sm font-semibold text-white"
        >
          {t('flashcards.stillLearning')}
        </button>
        <button
          type="button"
          onClick={() => mark(true)}
          className="rounded-xl px-4 py-3 text-sm font-semibold text-[#1a1a1a]"
          style={{ background: '#D4A843' }}
        >
          {t('flashcards.memorized')}
        </button>
      </div>

      <div className="mt-2 flex shrink-0 items-center justify-between text-xs text-white/70">
        <button
          type="button"
          onClick={() => {
            setIdx((i) => (i - 1 + safeLen) % safeLen)
            setFlipped(false)
          }}
        >
          {t('flashcards.prev')}
        </button>
        <span>
          {t('flashcards.cardCount', { current: ((idx % safeLen) + 1), total: safeLen })}
        </span>
        <button
          type="button"
          onClick={() => {
            setIdx((i) => (i + 1) % safeLen)
            setFlipped(false)
          }}
        >
          {t('flashcards.next')}
        </button>
      </div>

      {filterMenuOpen &&
        ReactDOM.createPortal(
          <div
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
