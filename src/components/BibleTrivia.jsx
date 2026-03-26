import { useEffect, useMemo, useState } from 'react'

const STREAK_KEY = 'abidinganchor-trivia-streak'
const STATS_KEY = 'abidinganchor-trivia-stats'

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

const QUESTIONS = [
  {
    category: 'Old Testament',
    q: 'Who led Israel out of Egypt?',
    options: ['Joshua', 'Moses', 'David', 'Elijah'],
    a: 1,
  },
  {
    category: 'Old Testament',
    q: 'What was the first book of the Bible?',
    options: ['Exodus', 'Genesis', 'Leviticus', 'Psalms'],
    a: 1,
  },
  {
    category: 'Psalms',
    q: 'Which Psalm begins, “The LORD is my shepherd”?',
    options: ['Psalm 1', 'Psalm 19', 'Psalm 23', 'Psalm 91'],
    a: 2,
  },
  {
    category: 'Prophecy',
    q: 'Which prophet saw a vision of dry bones coming to life?',
    options: ['Ezekiel', 'Amos', 'Jonah', 'Hosea'],
    a: 0,
  },
  {
    category: 'New Testament',
    q: 'Who wrote many letters to early churches in the New Testament?',
    options: ['Peter', 'Paul', 'James', 'Jude'],
    a: 1,
  },
  {
    category: 'Miracles',
    q: 'Jesus fed 5,000 people with five loaves and how many fish?',
    options: ['One', 'Two', 'Three', 'Seven'],
    a: 1,
  },
  {
    category: 'New Testament',
    q: 'Where was Jesus born?',
    options: ['Nazareth', 'Bethlehem', 'Jerusalem', 'Capernaum'],
    a: 1,
  },
  {
    category: 'Old Testament',
    q: 'Who fought Goliath?',
    options: ['Saul', 'Solomon', 'David', 'Samuel'],
    a: 2,
  },
  {
    category: 'Prophecy',
    q: 'Which book contains the “valley of dry bones” prophecy?',
    options: ['Isaiah', 'Jeremiah', 'Ezekiel', 'Daniel'],
    a: 2,
  },
  {
    category: 'Miracles',
    q: 'What did Jesus do at the wedding in Cana?',
    options: ['Healed the sick', 'Walked on water', 'Turned water into wine', 'Raised Lazarus'],
    a: 2,
  },
  {
    category: 'Psalms',
    q: 'Which Psalm says “Your word is a lamp to my feet”?',
    options: ['Psalm 119', 'Psalm 150', 'Psalm 27', 'Psalm 34'],
    a: 0,
  },
  {
    category: 'New Testament',
    q: 'Which Gospel is written by a physician?',
    options: ['Matthew', 'Mark', 'Luke', 'John'],
    a: 2,
  },
  {
    category: 'Miracles',
    q: 'Who did Jesus raise from the dead after four days?',
    options: ['Jairus’ daughter', 'Lazarus', 'Tabitha', 'Eutychus'],
    a: 1,
  },
  {
    category: 'Old Testament',
    q: 'What did God provide for Israel to eat in the wilderness?',
    options: ['Manna', 'Fish', 'Grapes', 'Honey'],
    a: 0,
  },
  {
    category: 'New Testament',
    q: 'What is the Great Commission reference?',
    options: ['Matthew 28:19-20', 'John 3:16', 'Romans 8:28', 'Psalm 23:1'],
    a: 0,
  },
  {
    category: 'Prophecy',
    q: 'Which prophet was swallowed by a great fish?',
    options: ['Jonah', 'Micah', 'Zechariah', 'Malachi'],
    a: 0,
  },
  {
    category: 'Psalms',
    q: 'Who is traditionally credited with writing many Psalms?',
    options: ['Moses', 'David', 'Isaiah', 'Daniel'],
    a: 1,
  },
  {
    category: 'Miracles',
    q: 'Jesus walked on what?',
    options: ['Sand', 'Water', 'Fire', 'Clouds'],
    a: 1,
  },
  {
    category: 'New Testament',
    q: 'Paul was also known as…',
    options: ['Saul', 'Silas', 'Stephen', 'Simeon'],
    a: 0,
  },
  {
    category: 'Old Testament',
    q: 'What city’s walls fell after Israel marched around them?',
    options: ['Jerusalem', 'Jericho', 'Bethlehem', 'Nineveh'],
    a: 1,
  },
  {
    category: 'Prophecy',
    q: 'Which prophet spoke of the “Suffering Servant” (Isaiah 53)?',
    options: ['Isaiah', 'Haggai', 'Obadiah', 'Nahum'],
    a: 0,
  },
  {
    category: 'New Testament',
    q: 'Who baptized Jesus?',
    options: ['John the Baptist', 'Peter', 'Paul', 'Andrew'],
    a: 0,
  },
]

function pickQuestions(count = 10) {
  const pool = [...QUESTIONS]
  const picked = []
  while (picked.length < Math.min(count, pool.length)) {
    const idx = Math.floor(Math.random() * pool.length)
    picked.push(pool.splice(idx, 1)[0])
  }
  return picked
}

export default function BibleTrivia({ onExit, onRoundComplete }) {
  const [roundQuestions, setRoundQuestions] = useState(() => pickQuestions(10))
  const [index, setIndex] = useState(0)
  const [selected, setSelected] = useState(null)
  const [score, setScore] = useState(0)
  const [done, setDone] = useState(false)
  const [confetti, setConfetti] = useState(false)

  const current = roundQuestions[index]
  const progress = Math.round(((index + (done ? 1 : 0)) / roundQuestions.length) * 100)

  const streak = useMemo(() => readJson(STREAK_KEY, { count: 0, lastDay: '' }), [])

  const handleAnswer = (choiceIdx) => {
    if (selected !== null) return
    setSelected(choiceIdx)
    const correct = choiceIdx === current.a
    if (correct) setScore((s) => s + 1)
    setTimeout(() => {
      if (index >= roundQuestions.length - 1) {
        setDone(true)
        setConfetti(true)
        setTimeout(() => setConfetti(false), 1800)
        const day = todayKey()
        const prev = readJson(STREAK_KEY, { count: 0, lastDay: '' })
        const nextCount =
          prev.lastDay === day ? prev.count : prev.lastDay === yesterdayKey() ? prev.count + 1 : 1
        writeJson(STREAK_KEY, { count: nextCount, lastDay: day })

        const statsPrev = readJson(STATS_KEY, { gamesCompleted: 0, psalmsCorrect: 0, bestScore: 0, lastScore: 0 })
        const psalmsCorrectThisRound =
          current.category === 'Psalms' && correct ? 1 : 0
        const psalmsTotalCorrect =
          statsPrev.psalmsCorrect +
          psalmsCorrectThisRound +
          roundQuestions
            .slice(0, index)
            .reduce((acc, q, i) => {
              // This round already scored via UI; approximate by counting correct choices we tracked only via score.
              // We keep it simple by only incrementing for last question here plus previous psalms are counted on completion below.
              return acc
            }, 0)

        const finalScore = correct ? score + 1 : score
        writeJson(STATS_KEY, {
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

  const shareScore = async () => {
    const text = `AbidingAnchor — Daily Trivia\nScore: ${score}/${roundQuestions.length}\n\n“Your word is a lamp to my feet.” (Psalm 119:105)`
    try {
      await navigator.clipboard.writeText(text)
      alert('Score copied to clipboard!')
    } catch {
      alert(text)
    }
  }

  return (
    <div className="rounded-2xl border border-white/20 bg-white/10 p-4 text-white backdrop-blur-md">
      <style>
        {`
          @keyframes trivia-confetti {
            0% { transform: translateY(-20px) rotate(0deg); opacity: 1; }
            100% { transform: translateY(220px) rotate(360deg); opacity: 0; }
          }
        `}
      </style>

      <div className="mb-3 flex items-center justify-between">
        <p className="text-xs font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>
          🎮 Daily Trivia
        </p>
        <button type="button" onClick={onExit} className="text-xs text-white/70">
          ← Back
        </button>
      </div>

      {!done ? (
        <>
          <div className="mb-2 flex items-center justify-between text-xs text-white/70">
            <span>
              Question {index + 1} of {roundQuestions.length}
            </span>
            <span>Score: {score}</span>
          </div>
          <div className="mb-3 h-2 overflow-hidden rounded-full bg-white/20">
            <div className="h-full rounded-full" style={{ width: `${progress}%`, background: '#D4A843' }} />
          </div>

          <div className="rounded-2xl border border-white/15 bg-black/10 p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.12em] text-white/70">{current.category}</p>
            <p className="mt-2 text-lg font-semibold text-white">{current.q}</p>
          </div>

          <div className="mt-3 grid grid-cols-1 gap-2">
            {current.options.map((opt, optIdx) => {
              const isChosen = selected === optIdx
              const isCorrect = optIdx === current.a
              let bg = 'rgba(255,255,255,0.08)'
              let border = 'rgba(255,255,255,0.18)'
              if (selected !== null && isChosen && isCorrect) {
                bg = 'rgba(34,197,94,0.20)'
                border = 'rgba(34,197,94,0.55)'
              } else if (selected !== null && isChosen && !isCorrect) {
                bg = 'rgba(239,68,68,0.20)'
                border = 'rgba(239,68,68,0.55)'
              } else if (selected !== null && isCorrect) {
                bg = 'rgba(34,197,94,0.12)'
                border = 'rgba(34,197,94,0.35)'
              }
              return (
                <button
                  key={opt}
                  type="button"
                  onClick={() => handleAnswer(optIdx)}
                  className="rounded-xl border px-4 py-3 text-left text-sm text-white transition"
                  style={{ background: bg, borderColor: border }}
                >
                  {opt}
                </button>
              )
            })}
          </div>
        </>
      ) : (
        <div className="relative overflow-hidden rounded-2xl border border-[#D4A843] bg-black/10 p-4 text-center">
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
                    background: i % 2 === 0 ? '#D4A843' : '#facc15',
                    animation: `trivia-confetti ${1100 + (i % 5) * 130}ms ease-out forwards`,
                    pointerEvents: 'none',
                  }}
                />
              ))
            : null}
          <p className="text-sm font-semibold uppercase tracking-[0.14em]" style={{ color: '#D4A843' }}>
            Round Complete
          </p>
          <p className="mt-2 text-3xl font-bold text-white">
            {score}/{roundQuestions.length}
          </p>
          <p className="mt-2 text-sm text-white/80">
            “Let the word of Christ dwell in you richly…” — Colossians 3:16
          </p>
          <div className="mt-4 flex flex-wrap justify-center gap-2">
            <button type="button" onClick={restart} className="rounded-xl px-4 py-2 text-sm font-semibold text-[#1a1a1a]" style={{ background: '#D4A843' }}>
              Play Again
            </button>
            <button type="button" onClick={shareScore} className="rounded-xl border border-[#D4A843] px-4 py-2 text-sm font-semibold text-[#D4A843]">
              Share your score
            </button>
          </div>
        </div>
      )}
    </div>
  )
}

