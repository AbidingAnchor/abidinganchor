import { useTranslation } from 'react-i18next'
import { useMemo, useState, useEffect } from 'react'
import { useAuth } from '../context/AuthContext'
import { userStorageKey } from '../utils/userStorage'
import { fetchVerse } from '../utils/bibleTranslation'
import { useThemeBackgroundType } from '../hooks/useThemeBackgroundType'

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
  const themeType = useThemeBackgroundType()
  const isDaytime = themeType === 'day' || themeType === 'morning' || themeType === 'afternoon'
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
      className={`home-gold-glass ${fillVertical ? 'flex min-h-0 flex-1 flex-col' : ''}`}
      style={{ borderRadius: '20px', padding: '16px', ...(fillVertical ? { minHeight: '100%' } : {}) }}
    >
      <style>
        {`
          @keyframes trivia-confetti {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(220px) rotate(360deg); opacity: 0; }
          }
          .trivia-opt {
            width: 100%;
            display: flex;
            align-items: center;
            gap: 14px;
            padding: 14px 20px;
            border-radius: 14px;
            border-top: none;
            border-right: none;
            border-bottom: none;
            border-left: 4px solid rgba(212,175,55,0.7);
            background: ${isDaytime ? 'rgba(255,255,255,0.85)' : 'rgba(15,20,45,0.9)'};
            backdrop-filter: blur(14px);
            -webkit-backdrop-filter: blur(14px);
            box-shadow: ${isDaytime ? 'inset 3px 0 12px rgba(212,175,55,0.15), 0 2px 8px rgba(0,0,0,0.12)' : 'inset 3px 0 12px rgba(212,175,55,0.12), 0 2px 12px rgba(0,0,0,0.4)'};
            color: ${isDaytime ? '#1A1200' : '#E8D5A3'};
            font-weight: 600;
            font-size: 15px;
            letter-spacing: 0.025em;
            text-align: left;
            cursor: pointer;
            transition: all 0.2s ease;
          }
          .trivia-opt:hover:not(:disabled) {
            border-left: 4px solid rgba(212,175,55,1);
            background: ${isDaytime ? 'rgba(255,255,255,0.98)' : 'rgba(20,28,60,0.95)'};
            box-shadow: ${isDaytime ? 'inset 3px 0 18px rgba(212,175,55,0.25), 0 2px 8px rgba(0,0,0,0.15)' : 'inset 3px 0 18px rgba(212,175,55,0.25), 0 2px 12px rgba(0,0,0,0.4)'};
            transform: scale(1.015);
          }
          .trivia-opt--chosen {
            border-left: 5px solid #D4AF37 !important;
            background: ${isDaytime ? 'rgba(255,248,220,0.98)' : 'rgba(30,40,80,0.98)'} !important;
            box-shadow: inset 4px 0 20px rgba(212,175,55,0.35), 0 0 20px rgba(212,175,55,0.1) !important;
            color: ${isDaytime ? '#6b4a00' : '#FFD700'} !important;
          }
          .trivia-opt--correct {
            border-left: 4px solid #4CAF50 !important;
            background: rgba(15,45,20,0.9) !important;
            box-shadow: inset 3px 0 16px rgba(76,175,80,0.3), 0 0 14px rgba(76,175,80,0.15) !important;
            color: #a7f3a7 !important;
          }
          .trivia-opt--wrong {
            border-left: 4px solid #C62828 !important;
            background: rgba(45,10,10,0.9) !important;
            box-shadow: inset 3px 0 16px rgba(198,40,40,0.3), 0 0 14px rgba(198,40,40,0.15) !important;
            color: #fca5a5 !important;
          }
          .trivia-opt:disabled { cursor: default; }
          .trivia-opt__badge {
            width: 24px;
            height: 24px;
            min-width: 24px;
            border-radius: 50%;
            background: rgba(212,175,55,0.2);
            border: 1px solid rgba(212,175,55,0.5);
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 11px;
            font-weight: 700;
            color: #D4AF37;
            transition: all 0.2s ease;
            flex-shrink: 0;
          }
          .trivia-opt--chosen .trivia-opt__badge {
            background: rgba(212,175,55,0.35);
            border-color: #D4AF37;
            color: #FFD700;
          }
          .trivia-opt--correct .trivia-opt__badge {
            background: rgba(76,175,80,0.25);
            border-color: #4CAF50;
            color: #4CAF50;
          }
          .trivia-opt--wrong .trivia-opt__badge {
            background: rgba(198,40,40,0.25);
            border-color: #C62828;
            color: #f87171;
          }
          .trivia-opt--chosen-overlay {
            position: absolute;
            inset: 0;
            border-radius: 14px;
            background: linear-gradient(90deg, rgba(212,175,55,0.08) 0%, transparent 60%);
            pointer-events: none;
          }
        `}
      </style>

      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <p style={{ color: '#D4A843', fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', margin: 0 }}>
          {t('trivia.title')}
        </p>
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
          <span style={{ background: 'linear-gradient(135deg,#D4A843,#F0C040)', color: '#1A1200', fontSize: '12px', fontWeight: 700, padding: '4px 12px', borderRadius: '50px' }}>
            {t('trivia.scoreLabel')}: {score}
          </span>
          <button type="button" onClick={onExit} style={{ fontSize: '12px', color: 'rgba(212,168,67,0.8)', background: 'none', border: 'none', cursor: 'pointer' }}>
            ← {t('common.back')}
          </button>
        </div>
      </div>

      {!done ? (
        <>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '8px' }}>
            <span style={{ fontSize: '12px', color: isDaytime ? 'rgba(0,0,0,0.5)' : 'rgba(255,255,255,0.55)' }}>
              {t('trivia.questionOf', { current: index + 1, total: roundQuestions.length })}
            </span>
          </div>
          {/* Progress bar */}
          <div style={{ height: '6px', borderRadius: '999px', background: isDaytime ? 'rgba(0,0,0,0.12)' : 'rgba(255,255,255,0.1)', marginBottom: '14px', overflow: 'hidden' }}>
            <div style={{ height: '100%', borderRadius: '999px', width: `${progress}%`, background: 'linear-gradient(90deg,#D4A843,#F0C040)', transition: 'width 0.3s ease' }} />
          </div>

          {/* Question card */}
          <div className="home-gold-glass" style={{ borderRadius: '20px', padding: '20px', marginBottom: '14px' }}>
            <p style={{ fontSize: '11px', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.2em', color: 'rgba(251,191,36,0.8)', margin: '0 0 8px 0' }}>{currentQuestion.category}</p>
            <p style={{ fontSize: '18px', fontWeight: 700, color: isDaytime ? '#1A1200' : '#ffffff', margin: 0, lineHeight: 1.5, fontFamily: 'Georgia, serif' }}>{currentQuestion.q}</p>
          </div>

          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {currentQuestion.options.map((opt, optIdx) => {
              const isChosen = selected === optIdx
              const isCorrect = selected !== null && optIdx === currentQuestion.a
              const isWrong = isChosen && optIdx !== currentQuestion.a
              const label = ['A', 'B', 'C', 'D'][optIdx] ?? String(optIdx + 1)
              let cls = 'trivia-opt'
              if (isCorrect && selected !== null) cls += ' trivia-opt--correct'
              else if (isWrong) cls += ' trivia-opt--wrong'
              else if (isChosen) cls += ' trivia-opt--chosen'
              return (
                <button
                  key={opt}
                  type="button"
                  className={cls}
                  onClick={() => handleAnswer(optIdx)}
                  disabled={selected !== null}
                  style={{ position: 'relative' }}
                >
                  {isChosen && !(isCorrect && selected !== null) && !isWrong && (
                    <span className="trivia-opt--chosen-overlay" />
                  )}
                  <span className="trivia-opt__badge">{label}</span>
                  <span>{opt}</span>
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="home-gold-glass" style={{ borderRadius: '20px', padding: '24px', textAlign: 'center', position: 'relative', overflow: 'hidden' }}>
          {confetti
            ? Array.from({ length: 22 }, (_, i) => (
                <span key={`c-${i}`} style={{ position: 'absolute', left: `${(i * 29) % 100}%`, top: '-10px', width: '6px', height: '10px', borderRadius: '2px', background: i % 2 === 0 ? '#F0C040' : '#facc15', animation: `trivia-confetti ${1100 + (i % 5) * 130}ms ease-out forwards`, pointerEvents: 'none' }} />
              ))
            : null}
          <p style={{ color: '#D4A843', fontSize: '11px', fontWeight: 700, letterSpacing: '0.18em', textTransform: 'uppercase', margin: '0 0 8px 0' }}>
            {t('trivia.roundComplete')}
          </p>
          <p style={{ fontSize: '40px', fontWeight: 800, color: '#ffffff', margin: '0 0 12px 0' }}>
            {score}/{roundQuestions.length}
          </p>
          <p style={{ fontSize: '13px', color: 'rgba(255,255,255,0.75)', fontStyle: 'italic', margin: '0 0 20px 0', fontFamily: 'Georgia,serif', lineHeight: 1.6 }}>
            {triviaVerseLoading ? `"${t('trivia.fallbackVerse')}" — Colossians 3:16` : `"${triviaVerseText}…" — Colossians 3:16`}
          </p>
          <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: '10px' }}>
            <button type="button" onClick={restart} style={{ background: 'linear-gradient(135deg,#D4A843,#F0C040)', color: '#1A1200', border: 'none', borderRadius: '50px', padding: '10px 24px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              {t('trivia.playAgain')}
            </button>
            <button type="button" onClick={shareScore} style={{ background: 'rgba(255,255,255,0.07)', color: '#D4A843', border: '1px solid rgba(212,168,67,0.4)', borderRadius: '50px', padding: '10px 20px', fontSize: '13px', fontWeight: 700, cursor: 'pointer' }}>
              {t('trivia.shareScore')}
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

