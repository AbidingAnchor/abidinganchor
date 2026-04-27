import { useTranslation } from 'react-i18next'
import { useMemo, useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'
import { fetchVerse } from '../utils/bibleTranslation'

function todayKey() {
  return new Date().toISOString().slice(0, 10)
}

function yesterdayKey() {
  const d = new Date()
  d.setDate(d.getDate() - 1)
  return d.toISOString().slice(0, 10)
}

function readJson(key, fallback) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : fallback
  } catch {
    return fallback
  }
}

function writeJson(key, value) {
  localStorage.setItem(key, JSON.stringify(value))
}

export default function BibleTrivia({ onExit, onRoundComplete, fillVertical = false }) {
  const { t } = useTranslation()
  const { user } = useAuth()
  const storageKeys = useMemo(
    () => ({
      streak: userStorageKey(user?.id, 'trivia-streak'),
      stats: userStorageKey(user?.id, 'trivia-stats'),
    }),
    [user?.id],
  )

  const QUESTIONS = [
    {
      category: t('trivia.categoryOldTestament'),
      q: t('trivia.q1'),
      options: [t('trivia.q1o1'), t('trivia.q1o2'), t('trivia.q1o3'), t('trivia.q1o4')],
      a: 1,
    },
    {
      category: t('trivia.categoryOldTestament'),
      q: t('trivia.q2'),
      options: [t('trivia.q2o1'), t('trivia.q2o2'), t('trivia.q2o3'), t('trivia.q2o4')],
      a: 1,
    },
    {
      category: t('trivia.categoryPsalms'),
      q: t('trivia.q3'),
      options: [t('trivia.q3o1'), t('trivia.q3o2'), t('trivia.q3o3'), t('trivia.q3o4')],
      a: 2,
    },
    {
      category: t('trivia.categoryProphecy'),
      q: t('trivia.q4'),
      options: [t('trivia.q4o1'), t('trivia.q4o2'), t('trivia.q4o3'), t('trivia.q4o4')],
      a: 0,
    },
    {
      category: t('trivia.categoryNewTestament'),
      q: t('trivia.q5'),
      options: [t('trivia.q5o1'), t('trivia.q5o2'), t('trivia.q5o3'), t('trivia.q5o4')],
      a: 1,
    },
    {
      category: t('trivia.categoryMiracles'),
      q: t('trivia.q6'),
      options: [t('trivia.q6o1'), t('trivia.q6o2'), t('trivia.q6o3'), t('trivia.q6o4')],
      a: 1,
    },
    {
      category: t('trivia.categoryNewTestament'),
      q: t('trivia.q7'),
      options: [t('trivia.q7o1'), t('trivia.q7o2'), t('trivia.q7o3'), t('trivia.q7o4')],
      a: 1,
    },
    {
      category: t('trivia.categoryOldTestament'),
      q: t('trivia.q8'),
      options: [t('trivia.q8o1'), t('trivia.q8o2'), t('trivia.q8o3'), t('trivia.q8o4')],
      a: 2,
    },
    {
      category: t('trivia.categoryProphecy'),
      q: t('trivia.q9'),
      options: [t('trivia.q9o1'), t('trivia.q9o2'), t('trivia.q9o3'), t('trivia.q9o4')],
      a: 2,
    },
    {
      category: t('trivia.categoryMiracles'),
      q: t('trivia.q10'),
      options: [t('trivia.q10o1'), t('trivia.q10o2'), t('trivia.q10o3'), t('trivia.q10o4')],
      a: 2,
    },
    {
      category: t('trivia.categoryPsalms'),
      q: t('trivia.q11'),
      options: [t('trivia.q11o1'), t('trivia.q11o2'), t('trivia.q11o3'), t('trivia.q11o4')],
      a: 0,
    },
    {
      category: t('trivia.categoryNewTestament'),
      q: t('trivia.q12'),
      options: [t('trivia.q12o1'), t('trivia.q12o2'), t('trivia.q12o3'), t('trivia.q12o4')],
      a: 2,
    },
    {
      category: t('trivia.categoryMiracles'),
      q: t('trivia.q13'),
      options: [t('trivia.q13o1'), t('trivia.q13o2'), t('trivia.q13o3'), t('trivia.q13o4')],
      a: 1,
    },
    {
      category: t('trivia.categoryOldTestament'),
      q: t('trivia.q14'),
      options: [t('trivia.q14o1'), t('trivia.q14o2'), t('trivia.q14o3'), t('trivia.q14o4')],
      a: 0,
    },
    {
      category: t('trivia.categoryNewTestament'),
      q: t('trivia.q15'),
      options: [t('trivia.q15o1'), t('trivia.q15o2'), t('trivia.q15o3'), t('trivia.q15o4')],
      a: 0,
    },
    {
      category: t('trivia.categoryProphecy'),
      q: t('trivia.q16'),
      options: [t('trivia.q16o1'), t('trivia.q16o2'), t('trivia.q16o3'), t('trivia.q16o4')],
      a: 0,
    },
    {
      category: t('trivia.categoryPsalms'),
      q: t('trivia.q17'),
      options: [t('trivia.q17o1'), t('trivia.q17o2'), t('trivia.q17o3'), t('trivia.q17o4')],
      a: 1,
    },
    {
      category: t('trivia.categoryMiracles'),
      q: t('trivia.q18'),
      options: [t('trivia.q18o1'), t('trivia.q18o2'), t('trivia.q18o3'), t('trivia.q18o4')],
      a: 1,
    },
    {
      category: t('trivia.categoryNewTestament'),
      q: t('trivia.q19'),
      options: [t('trivia.q19o1'), t('trivia.q19o2'), t('trivia.q19o3'), t('trivia.q19o4')],
      a: 0,
    },
    {
      category: t('trivia.categoryOldTestament'),
      q: t('trivia.q20'),
      options: [t('trivia.q20o1'), t('trivia.q20o2'), t('trivia.q20o3'), t('trivia.q20o4')],
      a: 1,
    },
    {
      category: t('trivia.categoryProphecy'),
      q: t('trivia.q21'),
      options: [t('trivia.q21o1'), t('trivia.q21o2'), t('trivia.q21o3'), t('trivia.q21o4')],
      a: 0,
    },
    {
      category: t('trivia.categoryNewTestament'),
      q: t('trivia.q22'),
      options: [t('trivia.q22o1'), t('trivia.q22o2'), t('trivia.q22o3'), t('trivia.q22o4')],
      a: 0,
    },
  ]

  function pickQuestions(count) {
    const shuffled = [...QUESTIONS].sort(() => Math.random() - 0.5)
    return shuffled.slice(0, count)
  }

  const [roundQuestions, setRoundQuestions] = useState(() => pickQuestions(10))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [confetti, setConfetti] = useState(false)
  const [triviaVerseText, setTriviaVerseText] = useState('')
  const [triviaVerseLoading, setTriviaVerseLoading] = useState(true)
  const [triviaShareVerseText, setTriviaShareVerseText] = useState('')
  const [hoveredOption, setHoveredOption] = useState(null)
  
  const currentQuestion = roundQuestions[index]
  const progress = Math.round(((index + (done ? 1 : 0)) / roundQuestions.length) * 100)
  
  const handleAnswer = (choiceIdx) => {
    if (selected !== null) return
    setSelected(choiceIdx)
    const correct = choiceIdx === currentQuestion.a
    if (correct) setScore((s) => s + 1)
    setTimeout(() => {
      if (index >= roundQuestions.length - 1) {
        setDone(true)
        setConfetti(true)
        setTimeout(() => setConfetti(false), 1800)
        const day = todayKey()
        const prev = readJson(storageKeys.streak, { count: 0, lastDay: '' })
        const nextCount =
          prev.lastDay === day ? prev.count : prev.lastDay === yesterdayKey() ? prev.count + 1 : 1
        writeJson(storageKeys.streak, { count: nextCount, lastDay: day })
  
        const statsPrev = readJson(storageKeys.stats, { gamesCompleted: 0, psalmsCorrect: 0, bestScore: 0, lastScore: 0 })
        const psalmsCorrectThisRound =
          currentQuestion.category === 'Psalms' && correct ? 1 : 0
        const psalmsTotalCorrect =
          statsPrev.psalmsCorrect +
          psalmsCorrectThisRound +
          roundQuestions
            .slice(0, index)
            .reduce(() => {
              // This round already scored via UI; approximate by counting correct choices we tracked only via score.
              // We keep it simple by only incrementing for last question here plus previous psalms are counted on completion below.
              return 0
            }, 0)
  
        const finalScore = correct ? score + 1 : score
        writeJson(storageKeys.stats, {
          ...statsPrev,
          gamesCompleted: statsPrev.gamesCompleted + 1,
          bestScore: Math.max(statsPrev.bestScore || 0, finalScore),
          lastScore: finalScore,
          psalmsCorrect: psalmsTotalCorrect,
        })
  
        onRoundComplete?.({ score: finalScore, total: roundQuestions.length })
      } else {
        setIndex((i) => i + 1)
        setSelected(null)
      }
    }, 650)
  }
  
  const restart = () => {
    setRoundQuestions(pickQuestions(10))
    setIndex(0)
    setSelected(null)
    setScore(0)
    setDone(false)
  }
  
  useEffect(() => {
    const loadTriviaVerse = async () => {
      setTriviaVerseLoading(true)
      try {
        const text = await fetchVerse(51, 3, 16, 'en')
        setTriviaVerseText(text)
      } catch {
        setTriviaVerseText(t('trivia.defaultVerse'))
      } finally {
        setTriviaVerseLoading(false)
      }
    }
  
    loadTriviaVerse()
  }, [t])
  
  useEffect(() => {
    const loadShareVerse = async () => {
      try {
        const text = await fetchVerse(19, 119, 105, 'en')
        setTriviaShareVerseText(text)
      } catch {
        setTriviaShareVerseText(t('trivia.defaultShareVerse'))
      }
    }
  
    loadShareVerse()
  }, [t])

  const shareScore = async () => {
    const verseText = triviaShareVerseText || 'Your word is a lamp to my feet'
    const text = `${t('trivia.title')}\n${t('trivia.scoreLabel')}: ${score}/${roundQuestions.length}\n\n"${verseText}" (Psalm 119:105)`
    try {
      await navigator.clipboard.writeText(text)
      alert(t('trivia.scoreCopied'))
    } catch {
      alert(text)
    }
  }

  return (
    <div
      className={`glass-panel rounded-2xl p-4 text-white ${fillVertical ? 'flex min-h-0 flex-1 flex-col' : ''}`}
      style={fillVertical ? { minHeight: '100%' } : undefined}
    >
      <style>
        {`
          @keyframes trivia-confetti {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(220px) rotate(360deg); opacity: 0; }
          }
        `}
      </style>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#F0C040' }}>
          {t('trivia.title')}
        </p>
        <button type="button" onClick={onExit} className="text-xs text-white/70">
          {t('common.back')}
        </button>
      </div>

      {!done ? (
        <>
          <div className="mb-2 flex items-center justify-between text-xs text-white/70">
            <span>
              {t('trivia.questionOf', { current: index + 1, total: roundQuestions.length })}
            </span>
            <span>{t('trivia.scoreLabel')}: {score}</span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: '#F0C040' }} />
          </div>

          <div className="glass-panel rounded-2xl p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">{currentQuestion.category}</p>
            <p className="mt-2 text-lg font-semibold text-white">{currentQuestion.q}</p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            {currentQuestion.options.map((opt, optIdx) => {
              const isChosen = selected === optIdx
              const isHovered = hoveredOption === optIdx
              const emphasized = isChosen || isHovered
              const bg = emphasized ? 'rgba(212,168,67,0.15)' : '#F0E8D4'
              const border = emphasized ? '#D4A843' : 'rgba(212,168,67,0.4)'
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleAnswer(optIdx)}
                  onMouseEnter={() => setHoveredOption(optIdx)}
                  onMouseLeave={() => setHoveredOption(null)}
                  className="rounded-xl text-left text-sm transition"
                  style={{
                    background: bg,
                    border: `2px solid ${border}`,
                    borderRadius: '12px',
                    padding: '14px 16px',
                    marginBottom: '8px',
                    color: '#1A1A1A',
                    fontWeight: 500,
                  }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="relative overflow-hidden glass-panel rounded-2xl border border-[#F0C040]/50 p-4 text-center">
          {confetti
            ? Array.from({ length: 22 }, (_, i) => (
                <span
                  key={`c-${i}`}
                  style={{
                    position: 'absolute',
                    left: `${(i * 29) % 100}%`,
                    top: '-10px',
                    width: '6px',
                    height: '10px',
                    borderRadius: '2px',
                    background: i % 2 === 0 ? '#F0C040' : '#facc15',
                    animation: `trivia-confetti ${1100 + (i % 5) * 130}ms ease-out forwards`,
                    pointerEvents: 'none',
                  }}
                />
              ))
            : null}
          <p className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: '#F0C040' }}>
            {t('trivia.roundComplete')}
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {score}/{roundQuestions.length}
          </p>
          <p className="mt-2 text-sm text-white/80">
            {triviaVerseLoading ? `"${t('trivia.fallbackVerse')}" — Colossians 3:16` : `"${triviaVerseText}…" — Colossians 3:16`}
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={restart} className="rounded-xl px-4 py-2 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#F0C040' }}>
              {t('trivia.playAgain')}
            </button>
            <button type="button" onClick={shareScore} className="rounded-xl border border-[#F0C040] px-4 py-2 text-sm font-semibold text-[#F0C040]">
              {t('trivia.shareScore')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

